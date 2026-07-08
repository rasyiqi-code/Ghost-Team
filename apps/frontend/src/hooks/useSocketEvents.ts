import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { connectSocket, getSocket } from '@/lib/socket'
import { useNotifStore } from '@/stores/notifStore'
import type { Notification as NotifData } from '@/types'

/**
 * Lazy singleton AudioContext + resume handler.
 * Browser mewajibkan user gesture sebelum AudioContext bisa jalan.
 */
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  try {
    audioCtx = new AudioContext()
    return audioCtx
  } catch {
    return null
  }
}

/** Panggil setelah user gesture (click) untuk resume AudioContext. */
export function resumeAudio() {
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/**
 * Memainkan notification chime via Web Audio API.
 * Tidak perlu file audio eksternal — generate nada langsung di browser.
 */
function playNotifSound() {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'suspended') return

  try {
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

    // Nada pertama (C5)
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523, ctx.currentTime)
    osc1.connect(gain)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.15)

    // Nada kedua (E5) — sedikit lebih tinggi
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
    osc2.connect(gain)
    osc2.start(ctx.currentTime + 0.12)
    osc2.stop(ctx.currentTime + 0.4)
  } catch {
    // Sound error — skip
  }
}

/**
 * Ikon notifikasi berdasarkan type.
 */
function getNotifIcon(type: string): string {
  switch (type) {
    case 'broadcast': return '📢'
    case 'task': return '📋'
    default: return '💬'
  }
}

export function useSocketEvents() {
  const queryClient = useQueryClient()
  const addNotification = useNotifStore((s) => s.addNotification)

  useEffect(() => {
    connectSocket()
    const socket = getSocket()

    const handleNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
    const handleVoiceProcessed = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
    const handleFileIndexed = () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    }
    const handleAutoReply = () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    }
    const handleNewNotification = (data: unknown) => {
      const notif = data as NotifData
      addNotification(notif)

      // ——— Sound effect ———
      playNotifSound()

      // ——— Toast popup ———
      toast(getNotifIcon(notif.type) + ' ' + notif.title, {
        description: notif.message ?? undefined,
        duration: 4000,
      })

      // ——— Desktop Notification (Browser Notification API) ———
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        try {
          new window.Notification(getNotifIcon(notif.type) + ' ' + notif.title, {
            body: notif.message ?? undefined,
          })
        } catch { /* desktop notification not supported */ }
      }
    }

    socket?.on('new_message', handleNewMessage)
    socket?.on('voice_processed', handleVoiceProcessed)
    socket?.on('file_indexed', handleFileIndexed)
    socket?.on('auto_reply', handleAutoReply)
    socket?.on('new_notification', handleNewNotification)

    return () => {
      socket?.off('new_message', handleNewMessage)
      socket?.off('voice_processed', handleVoiceProcessed)
      socket?.off('file_indexed', handleFileIndexed)
      socket?.off('auto_reply', handleAutoReply)
      socket?.off('new_notification', handleNewNotification)
    }
  }, [queryClient, addNotification])
}

/**
 * Minta izin desktop notification.
 * Sebaiknya dipanggil setelah user gesture (click) agar browser tidak mengabaikannya.
 */
export function requestNotifPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
    window.Notification.requestPermission().catch(() => {})
  }
}
