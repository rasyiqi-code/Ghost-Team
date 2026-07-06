import { db } from '@ghost/database';
import { env } from '@ghost/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { generateEmbedding, generateAutoReply } from '../../core/ai.js';
import { memoryStore } from '../../core/memory-store.js';
import { loadTelegramCredentials, loadWhatsAppCredentials, loadSlackCredentials, } from '../../core/platform-credentials.js';
let socketIO;
export async function webhookModule(app) {
    socketIO = app.io;
    app.post('/webhook/telegram', async (req, reply) => {
        const body = req.body;
        const update = (body.message ?? {});
        const chat = (update.chat ?? {});
        const sender = (update.from ?? {});
        if (!chat.id)
            return { status: 'ignored' };
        const platformUserId = String(chat.id ?? '');
        // Load per-user Telegram credentials
        const tgCreds = await loadTelegramCredentials(platformUserId);
        // Verify webhook secret using per-user credentials
        const secretToken = req.headers['x-telegram-bot-api-secret-token'];
        if (tgCreds.webhookSecret && secretToken !== tgCreds.webhookSecret) {
            reply.status(403).send({ detail: 'Invalid webhook secret' });
            return;
        }
        const userId = await getUserIdForPlatform('telegram', platformUserId);
        const text = update.text ?? '';
        let messageType = 'text';
        let fileIdValue = null;
        const doc = update.document;
        const photo = update.photo;
        const voice = update.voice;
        if (doc) {
            messageType = 'document';
            fileIdValue = doc.file_id;
        }
        else if (photo) {
            messageType = 'photo';
            fileIdValue = photo[photo.length - 1]?.file_id ?? null;
        }
        else if (voice) {
            messageType = 'voice_note';
            fileIdValue = voice.file_id;
        }
        const msg = await db.message.create({
            data: {
                userId,
                platform: 'telegram',
                senderId: String(sender.id ?? ''),
                senderName: String(sender.first_name ?? ''),
                content: text ?? update.caption ?? '',
                messageType,
                platformMessageId: String(update.message_id ?? ''),
                isOutgoing: false,
            }
        });
        if (fileIdValue) {
            try {
                if (tgCreds.botToken) {
                    const fr = await fetch(`https://api.telegram.org/bot${tgCreds.botToken}/getFile`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_id: fileIdValue }),
                    });
                    const fd = await fr.json();
                    const fp = fd.result?.file_path ?? '';
                    if (fp) {
                        const dlUrl = `https://api.telegram.org/file/bot${tgCreds.botToken}/${fp}`;
                        const ext = fp.split('.').pop() ?? 'bin';
                        const fname = doc?.file_name ?? `telegram.${ext}`;
                        const fid = await processFileWebhook(userId, dlUrl, fname, messageType);
                        if (fid) {
                            await db.message.update({
                                where: { id: msg.id },
                                data: { fileId: fid }
                            });
                        }
                    }
                }
            }
            catch { /* file skip */ }
        }
        try {
            const embedding = await generateEmbedding(text || '', userId);
            await memoryStore.addChat(String(msg.id), embedding, text || '', {
                sender: String(sender.first_name ?? 'unknown'),
                platform: 'telegram',
                timestamp: String(update.date ?? ''),
                userId: String(userId),
            });
        }
        catch { /* memory skip */ }
        try {
            socketIO.to(`user:${userId}`).emit('new_message', {
                ...msg,
                fileId: msg.fileId
            });
        }
        catch { /* ws skip */ }
        if (text && messageType === 'text') {
            triggerAutoReply('telegram', String(sender.first_name ?? ''), text, userId, tgCreds);
        }
        return { status: 'ok' };
    });
    app.get('/webhook/whatsapp', async (req, reply) => {
        const query = req.query;
        if (query['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN) {
            reply.type('text/plain').send(query['hub.challenge'] ?? '');
            return;
        }
        return { status: 'verification_failed' };
    });
    function safeCompare(a, b) {
        try {
            const bufA = Buffer.from(a);
            const bufB = Buffer.from(b);
            if (bufA.length !== bufB.length)
                return false;
            return timingSafeEqual(bufA, bufB);
        }
        catch {
            return false;
        }
    }
    app.post('/webhook/whatsapp', async (req, reply) => {
        const body = req.body;
        const entry = (body.entry?.[0]) ?? {};
        const changes = (entry.changes?.[0]) ?? {};
        const value = changes.value ?? {};
        const metadata = value.metadata ?? {};
        const businessPhone = String(metadata.display_phone_number ?? metadata.phone_number_id ?? '');
        const waCreds = await loadWhatsAppCredentials(businessPhone);
        const signature = req.headers['x-hub-signature-256'];
        if (waCreds.appSecret) {
            if (!signature) {
                reply.status(403).send({ detail: 'Missing signature' });
                return;
            }
            const rawBody = JSON.stringify(req.body);
            const expected = 'sha256=' + createHmac('sha256', waCreds.appSecret).update(rawBody).digest('hex');
            if (!safeCompare(signature, expected)) {
                reply.status(403).send({ detail: 'Invalid signature' });
                return;
            }
        }
        try {
            const msgs = value.messages ?? [];
            if (!msgs.length)
                return { status: 'ignored' };
            const waMsg = msgs[0];
            const contact = (value.contacts?.[0]) ?? {};
            const senderName = contact.profile?.name ?? '';
            const senderId = waMsg.from ?? '';
            const textContent = waMsg.text?.body ?? '';
            const msgType = waMsg.type ?? 'text';
            const userId = await getUserIdForPlatform('whatsapp', businessPhone);
            const message = await db.message.create({
                data: {
                    userId,
                    platform: 'whatsapp',
                    senderId,
                    senderName,
                    content: textContent,
                    messageType: msgType,
                    platformMessageId: waMsg.id ?? '',
                    isOutgoing: false,
                }
            });
            if (['image', 'document', 'audio', 'video'].includes(msgType)) {
                try {
                    const mediaPart = waMsg[msgType];
                    const mediaId = mediaPart?.id ?? '';
                    if (mediaId && waCreds.accessToken && waCreds.phoneNumberId) {
                        const mediaResp = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
                            headers: { Authorization: `Bearer ${waCreds.accessToken}` },
                        });
                        const mediaData = await mediaResp.json();
                        const mediaUrl = mediaData.url ?? '';
                        const mimeType = mediaData.mime_type ?? 'application/octet-stream';
                        const fname = mediaPart?.filename ?? `whatsapp_${mediaId}`;
                        if (mediaUrl) {
                            const fid = await processFileWebhook(userId, mediaUrl, fname, mimeType, {
                                Authorization: `Bearer ${waCreds.accessToken}`,
                            });
                            if (fid) {
                                await db.message.update({
                                    where: { id: message.id },
                                    data: { fileId: fid }
                                });
                            }
                        }
                    }
                }
                catch { /* file skip */ }
            }
            try {
                const embedding = await generateEmbedding(textContent, userId);
                await memoryStore.addChat(String(message.id), embedding, textContent, {
                    sender: senderName,
                    platform: 'whatsapp',
                    timestamp: '',
                    userId: String(userId),
                });
            }
            catch { /* memory skip */ }
            try {
                socketIO.to(`user:${userId}`).emit('new_message', message);
            }
            catch { /* ws skip */ }
            if (textContent)
                triggerAutoReply('whatsapp', senderName, textContent, userId, waCreds);
        }
        catch (err) {
            console.error('WhatsApp webhook error:', err);
        }
        return { status: 'ok' };
    });
    app.post('/webhook/slack', async (req, reply) => {
        const body = req.body;
        if (body.type === 'url_verification')
            return { challenge: body.challenge };
        const event = body.event ?? {};
        const teamId = event.team ?? event.team_id ?? '';
        const slackCreds = await loadSlackCredentials(teamId);
        const signature = req.headers['x-slack-signature'];
        const timestamp = req.headers['x-slack-request-timestamp'];
        if (slackCreds.signingSecret) {
            if (!signature || !timestamp) {
                reply.status(403).send({ detail: 'Missing Slack signature headers' });
                return;
            }
            if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
                reply.status(403).send({ detail: 'Request timestamp too old' });
                return;
            }
            const rawBody = JSON.stringify(req.body);
            const sigBasestring = `v0:${timestamp}:${rawBody}`;
            const expected = 'v0=' + createHmac('sha256', slackCreds.signingSecret).update(sigBasestring).digest('hex');
            if (!safeCompare(signature, expected)) {
                reply.status(403).send({ detail: 'Invalid signature' });
                return;
            }
        }
        if (event.type === 'message') {
            const sender = event.user ?? '';
            const text = event.text ?? '';
            const slackFiles = event.files ?? [];
            const userId = await getUserIdForPlatform('slack', teamId);
            let messageType = 'text';
            if (slackFiles.length)
                messageType = slackFiles[0]?.mimetype ?? 'file';
            const message = await db.message.create({
                data: {
                    userId,
                    platform: 'slack',
                    senderId: sender,
                    senderName: sender,
                    content: text,
                    messageType,
                    platformMessageId: event.ts ?? '',
                    isOutgoing: false,
                }
            });
            for (const f of slackFiles.slice(0, 1)) {
                try {
                    const url = f.url_private_download ?? f.url_private ?? '';
                    if (url && slackCreds.botToken) {
                        const fid = await processFileWebhook(userId, url, f.name ?? 'slack_file', f.mimetype ?? 'application/octet-stream', { Authorization: `Bearer ${slackCreds.botToken}` });
                        if (fid) {
                            await db.message.update({
                                where: { id: message.id },
                                data: { fileId: fid }
                            });
                        }
                    }
                }
                catch { /* file skip */ }
            }
            try {
                const embedding = await generateEmbedding(text, userId);
                await memoryStore.addChat(String(message.id), embedding, text, {
                    sender,
                    platform: 'slack',
                    timestamp: event.ts ?? '',
                    userId: String(userId),
                });
            }
            catch { /* memory skip */ }
            try {
                socketIO.to(`user:${userId}`).emit('new_message', message);
            }
            catch { /* ws skip */ }
            if (text && !slackFiles.length)
                triggerAutoReply('slack', sender, text, userId, slackCreds);
        }
        return { status: 'ok' };
    });
}
async function getUserIdForPlatform(platform, platformUserId) {
    const conditions = { platform, isActive: true };
    if (platformUserId) {
        conditions.platformUserId = platformUserId;
    }
    const conn = await db.platformConnection.findFirst({
        where: conditions,
    });
    if (!conn) {
        const detail = platformUserId
            ? `No active platform connection found for '${platform}' with id '${platformUserId}'`
            : `No active platform connection found for '${platform}'`;
        throw new Error(detail);
    }
    return conn.userId;
}
async function processFileWebhook(userId, fileUrl, originalName, fileType, httpHeaders) {
    try {
        const resp = await fetch(fileUrl, { headers: { ...httpHeaders } });
        if (!resp.ok)
            return null;
        const content = Buffer.from(await resp.arrayBuffer());
        const ext = originalName.split('.').pop() ?? 'bin';
        const storageDir = join(env.STORAGE_DIR, String(userId));
        await mkdir(storageDir, { recursive: true });
        const storagePath = join(storageDir, `${randomUUID().replace(/-/g, '')}.${ext}`);
        await writeFile(storagePath, content);
        const file = await db.file.create({
            data: {
                userId,
                originalName,
                storageUrl: storagePath,
                fileType,
                sizeBytes: BigInt(content.length),
            }
        });
        return file.id;
    }
    catch {
        return null;
    }
}
async function triggerAutoReply(platform, sender, question, userId, creds) {
    try {
        const queryEmbedding = await generateEmbedding(question, userId);
        const matches = await memoryStore.searchChat(queryEmbedding, 3, { userId: String(userId) });
        const filtered = matches.filter(m => m.similarity >= 0.6);
        if (!filtered.length)
            return;
        const context = filtered.map(m => m.content);
        const answer = await generateAutoReply(question, context);
        const best = filtered[0];
        const meta = best.metadata;
        const source = `${meta.sender ?? 'unknown'} di ${meta.platform ?? platform}`;
        const autoReplyData = { status: 'found', answer, source, sender, platform, originalQuestion: question };
        try {
            socketIO.to(`user:${userId}`).emit('auto_reply', autoReplyData);
        }
        catch { /* ws skip */ }
        if (answer) {
            const cited = `${answer}\n\n— Sumber: ${source}`;
            const { platformService } = await import('../../core/platform-service.js');
            await platformService.sendMessage(platform, sender, cited, creds);
        }
    }
    catch (err) {
        console.error('Auto reply failed:', err);
    }
}
//# sourceMappingURL=index.js.map