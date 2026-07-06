import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket, getSocket } from '@/lib/socket'

export function useSocketEvents() {
  const queryClient = useQueryClient()

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

    socket?.on('new_message', handleNewMessage)
    socket?.on('voice_processed', handleVoiceProcessed)
    socket?.on('file_indexed', handleFileIndexed)
    socket?.on('auto_reply', handleAutoReply)

    return () => {
      socket?.off('new_message', handleNewMessage)
      socket?.off('voice_processed', handleVoiceProcessed)
      socket?.off('file_indexed', handleFileIndexed)
      socket?.off('auto_reply', handleAutoReply)
    }
  }, [queryClient])
}
