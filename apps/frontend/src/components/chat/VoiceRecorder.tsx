import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RecorderState = 'idle' | 'recording' | 'processing'

interface VoiceRecorderProps {
  onComplete: (audioBlob: Blob) => void
}

export function VoiceRecorder({ onComplete }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setState('processing')
        onComplete(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      setState('recording')
    } catch {
      setError('Tidak bisa akses mikrofon')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setState('idle')
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={state === 'recording' ? 'destructive' : 'default'}
        onClick={state === 'recording' ? stopRecording : startRecording}
        className={cn(
          'h-12 w-12 rounded-full',
          state === 'recording' && 'animate-pulse'
        )}
      >
        {state === 'recording' ? (
          <Square className="h-5 w-5" />
        ) : state === 'processing' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {state === 'recording' && (
        <p className="text-xs text-muted-foreground">Merekam... klik untuk stop</p>
      )}
    </div>
  )
}
