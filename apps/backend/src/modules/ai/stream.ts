import type { FastifyRequest, FastifyReply } from 'fastify'
import { streamText, tool, isStepCount } from 'ai'
import { z } from 'zod'
import { getLanguageModel } from '../../core/ai-client.js'
import { db } from '@ghost/database'
import { decrypt } from '../../core/encryption.js'
import { platformService } from '../../core/platform-service.js'
import { pipeTextStreamToResponse } from 'ai'

interface StreamMessage {
  role: string
  content?: string
  parts?: { type: string; text?: string; [key: string]: unknown }[]
}

interface StreamBody {
  messages: StreamMessage[]
}

function normalizeMessages(messages: StreamMessage[]) {
  return messages.map(m => {
    const content = m.content ?? m.parts
      ?.filter((p): p is { type: string; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map(p => p.text)
      .join('') ?? ''
    return { role: m.role as 'user' | 'assistant' | 'system', content }
  })
}

function getCurrentUser(userId: string) {
  return db.user.findUnique({ where: { id: userId } })
}

async function getWorkspaceAndMembers(userId: string) {
  const ws = await db.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })
  return ws
}

async function createAndEmitNotification(
  targetUserId: string,
  senderId: string,
  senderName: string,
  title: string,
  message: string | undefined,
  type: string,
  server: any,
) {
  // 1. Simpan pesan ke main chat target user
  const msg = await db.message.create({
    data: {
      userId: targetUserId,
      platform: 'web',
      senderId: senderId,
      senderName: senderName,
      content: message ?? '',
      messageType: 'text',
      isOutgoing: false,
    },
  })

  // 2. Kirim socket event new_message agar muncul di chat real-time
  try {
    server.io?.to(`user:${targetUserId}`).emit('new_message', msg)
  } catch { /* ws skip */ }

  // 3. Buat notifikasi dengan link ke pesan spesifik
  const notif = await db.notification.create({
    data: {
      userId: targetUserId,
      senderId,
      type,
      title,
      message: message?.slice(0, 200) ?? '', // potong untuk notifikasi
      link: `/chat#message-${msg.id}`,
    },
  })
  if (server.emitToUser) {
    server.emitToUser(targetUserId, 'new_notification', notif)
  }
}

export async function handleStreamChat(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { messages } = req.body as StreamBody

  if (!messages?.length) {
    reply.status(400).send({ detail: 'messages required' })
    return
  }

  const normalized = normalizeMessages(messages) as any
  const lm = await getLanguageModel(req.userId)
  if (!lm) {
    reply.status(400).send({ detail: 'No AI provider configured' })
    return
  }

  const user = await getCurrentUser(req.userId)
  const ws = await getWorkspaceAndMembers(req.userId)
  const memberNames = ws?.members.map(m => ({ id: m.user.id, name: m.user.name })) || []

  const systemPrompt = `Kamu adalah asisten pribadi di perusahaan ini. Kepribadianmu:

## Peran
- Kamu adalah perantara dua arah antara user (bos) dan anggota tim lainnya.
- Kamu bisa mengirim pesan, pengumuman, dan tugas ke anggota tim.
- Kamu juga bisa menjawab pertanyaan berdasarkan pengetahuan dan konteks yang ada.

## Gaya Komunikasi
- Profesional, hangat, dan efisien — seperti asisten pribadi sungguhan.
- Ketika user menyuruhmu melakukan sesuatu (kirim pesan, informasikan tim, dll), RESPON DULU dengan konfirmasi singkat, misalnya: "Baik, saya akan segera informasikan ke tim." atau "Siap, akan saya sampaikan."
- Setelah eksekusi, laporkan hasilnya secara alami: "Sudah, semua anggota tim sudah mendapat pesannya."
- JANGAN hanya menjawab dengan hasil teknis dari tool. Bungkus dengan bahasa natural.

## Memahami Konteks
- Kamu HARUS paham konteks tanpa perlu ditanya berulang-ulang. Ini yang membedakan asisten pribadi yang baik.
- Jika user bilang "informasikan ke tim rapat 10 menit lagi", kamu paham itu pengumuman ke semua tim — jangan tanya "mau dikirim ke siapa?"
- Jika user bilang "tolong kasih tahu si Budi kalau meeting diundur jam 3", kamu paham itu pesan ke satu orang.
- Jika user memberikan arahan seperti "tolong tindak lanjuti masalah server yang kemarin", kamu paham itu tugas ke seseorang.
- JANGAN bertanya hal-hal yang sudah jelas dari konteks. Misalnya jangan tanya "raport tentang apa?" kalau user sudah menyebutkan topiknya.
- Hanya bertanya jika BENAR-BENAR tidak jelas dan tidak bisa disimpulkan dari konteks. Dan tanyanya singkat, langsung ke inti, tidak bertele-tele.
- Contoh bertanya yang baik: "Maaf, rapat tentang apa yang ingin disampaikan?" bukan "Boleh saya tahu topik rapatnya apa? Trus siapa saja yang perlu diundang? Terus kapan waktunya?"

## Tools yang Tersedia
Kamu punya akses ke tool untuk:
1. notify_user — kirim pesan ke satu anggota tim
2. broadcast_team — kirim pengumuman ke SEMUA anggota tim
3. assign_task — beri tugas ke anggota tim tertentu
4. send_to_platform — kirim pesan ke platform eksternal (Telegram, WhatsApp, Slack).
   Contoh: "kirim ke Telegram bilang Halo" → platform: "telegram", message: "Halo"
   Contoh: "kirim pesan ke WhatsApp bilang meeting jam 3" → platform: "whatsapp", message: "meeting jam 3"
   Parameter recipient bisa diisi nomor telepon/chat_id/@username, atau bisa dikosongkan jika tidak tahu.

## Menghadapi Error
- Jika tool gagal (misal nama anggota tidak ditemukan), sampaikan ke user dengan natural: "Maaf, saya tidak menemukan anggota bernama [nama] di tim."
- Jangan tampilkan pesan error teknis mentah-mentah ke user.
- Jika ragu antara dua tool, gunakan yang paling sesuai. Lebih baik eksekusi daripada tidak melakukan apa-apa.

Gunakan tool yang tepat sesuai perintah user. Jangan ragu menggunakan tool — itu tugasku.`

  try {
    const result = await streamText({
      model: lm.model,
      system: systemPrompt,
      messages: normalized,
      temperature: 0.4,
      tools: {
        notify_user: tool({
          description: 'Kirim pesan ke satu anggota tim tertentu. Contoh: "tolong kasih tahu Budi kalau meeting diundur jam 3" → targetName: "Budi", message: "Meeting diundur jam 3". Jangan tanya "siapa yang mau dikirimin?" — lihat dari konteks!',
          inputSchema: z.object({
            targetName: z.string().describe('Nama anggota tim yang akan diberitahu'),
            message: z.string().describe('Isi pesan yang akan disampaikan'),
          }),
          execute: async ({ targetName, message }) => {
            try {
              const target = memberNames.find(
                m => m.name.toLowerCase().includes(targetName.toLowerCase()) || targetName.toLowerCase().includes(m.name.toLowerCase())
              )
              if (!target) return `Anggota tim "${targetName}" tidak ditemukan. Anggota tim: ${memberNames.map(m => m.name).join(', ')}`
              await createAndEmitNotification(
                target.id, req.userId, user?.name || 'Anggota Tim',
                `💬 Pesan dari ${user?.name || 'Anggota Tim'}`,
                message,
                'direct',
                req.server,
              )
              return `Pesan berhasil dikirim ke ${target.name}`
            } catch (e) {
              console.error('[tool:notify_user] Error:', e)
              return `Maaf, terjadi kesalahan saat mengirim pesan ke ${targetName}.`
            }
          },
        }),
        broadcast_team: tool({
          description: 'Kirim pengumuman/pesan ke SELURUH anggota tim. Contoh: "informasikan ke tim rapat 10 menit lagi" → broadcast. "tolong kasih tau semua orang" → broadcast. Jangan tanya "ke siapa saja?" — kalau bilang "ke tim" / "semua" / "seluruh" itu artinya broadcast_team!',
          inputSchema: z.object({
            message: z.string().describe('Isi pengumuman yang akan disampaikan ke seluruh tim'),
          }),
          execute: async ({ message }) => {
            try {
              if (!ws) return 'Tidak ada workspace/ tim yang ditemukan.'
              const senderName = user?.name || 'Anggota Tim'
              let sent = 0
              for (const member of ws.members) {
                if (member.user.id === req.userId) continue
                await createAndEmitNotification(
                  member.user.id, req.userId, senderName,
                  `📢 Pengumuman dari ${senderName}`,
                  message,
                  'broadcast',
                  req.server,
                )
                sent++
              }
              return `Pengumuman berhasil dikirim ke ${sent} anggota tim.`
            } catch (e) {
              console.error('[tool:broadcast_team] Error:', e)
              return `Maaf, terjadi kesalahan saat mengirim pengumuman ke tim.`
            }
          },
        }),
        assign_task: tool({
          description: 'Berikan tugas/spesifik ke satu anggota tim. Contoh: "tolong tindak lanjuti masalah server sama Budi" → targetName: "Budi", task: "Tindak lanjuti masalah server". Beda dengan broadcast_team yang untuk semua orang.',
          inputSchema: z.object({
            targetName: z.string().describe('Nama anggota tim yang diberi tugas'),
            task: z.string().describe('Deskripsi tugas yang diberikan'),
          }),
          execute: async ({ targetName, task }) => {
            try {
              const target = memberNames.find(
                m => m.name.toLowerCase().includes(targetName.toLowerCase()) || targetName.toLowerCase().includes(m.name.toLowerCase())
              )
              if (!target) return `Anggota tim "${targetName}" tidak ditemukan.`
              await createAndEmitNotification(
                target.id, req.userId, user?.name || 'Anggota Tim',
                `📋 Tugas dari ${user?.name || 'Anggota Tim'}`,
                `📋 Tugas: ${task}`,
                'task',
                req.server,
              )
              return `Tugas berhasil diberikan ke ${target.name}`
            } catch (e) {
              console.error('[tool:assign_task] Error:', e)
              return `Maaf, terjadi kesalahan saat memberikan tugas ke ${targetName}.`
            }
          },
        }),
        send_to_platform: tool({
          description: 'Kirim pesan ke platform eksternal seperti Telegram, WhatsApp, atau Slack. Contoh: "kirim ke Telegram bilang Halo" → platform="telegram", message="Halo". Parameter recipient bisa diisi chat ID/@username, atau dikosongkan.',
          inputSchema: z.object({
            platform: z.string().describe('Platform tujuan: "telegram", "whatsapp", atau "slack"'),
            recipient: z.string().optional().describe('ID penerima (chat ID/@username untuk Telegram, nomor telepon untuk WA, channel ID untuk Slack). Bisa dikosongkan.'),
            message: z.string().describe('Isi pesan yang akan dikirim'),
          }),
          execute: async ({ platform, recipient, message }) => {
            try {
              // Cari platform connection untuk mendapatkan credentials
              const conn = await db.platformConnection.findFirst({
                where: { userId: req.userId, platform, isActive: true },
              })
              if (!conn) {
                return `Tidak ada koneksi ${platform} yang aktif. Silakan setup dulu di Settings > Connected Platforms.`
              }
              
              let creds: any = undefined
              if (conn.credentialsEncrypted) {
                const raw = decrypt(conn.credentialsEncrypted)
                try { creds = JSON.parse(raw) } catch { creds = { botToken: raw } }
              }
              
              const recipientId = recipient || conn.platformUserId || ''
              
              if (!recipientId) {
                return `Koneksi ${platform} aktif tapi tidak ada ID penerima. ${platform === 'telegram' ? 'Chat ID' : platform === 'whatsapp' ? 'Nomor telepon' : 'Channel ID'} belum diisi.`
              }
              
              const success = await platformService.sendMessage(platform, recipientId, message, creds)
              
              if (success) {
                // Simpan ke database
                await db.message.create({
                  data: {
                    userId: req.userId,
                    platform,
                    senderId: req.userId,
                    senderName: user?.name || 'Unknown',
                    content: message,
                    messageType: 'text',
                    isOutgoing: true,
                  },
                })
                return `Pesan berhasil dikirim ke ${platform}.`
              } else {
                return `Gagal mengirim pesan ke ${platform}. Periksa kembali kredensial platform di Settings.`
              }
            } catch (e) {
              console.error('[tool:send_to_platform] Error:', e)
              return `Maaf, terjadi kesalahan saat mengirim ke ${platform}.`
            }
          },
        }),
      },
      stopWhen: isStepCount(5),
    })

    reply.raw.setHeader('Content-Type', 'text/plain; charset=utf-8')
    reply.raw.setHeader('X-Vercel-AI-Data-Stream', 'v1')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')

    await pipeTextStreamToResponse({ response: reply.raw, stream: result.textStream })
  } catch (err) {
    console.error('[stream] Error:', err)
    if (!reply.raw.headersSent) {
      reply.status(500).send({ detail: String(err) })
    }
  }
}
