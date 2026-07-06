import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Message, MessageListResponse } from '@/types'

const PAGE_SIZE = 30

export function useMessages(platform?: string, search?: string) {
  return useInfiniteQuery<MessageListResponse>({
    queryKey: ['messages', platform, search],
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number
      if (search) {
        const res = await api.post<MessageListResponse>('/messages/search', {
          query: search,
          page,
          page_size: PAGE_SIZE,
        })
        return res
      }
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(PAGE_SIZE))
      if (platform) params.set('platform', platform)
      const res = await api.get<MessageListResponse>(`/messages?${params}`)
      return res
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize)
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined
    },
    refetchInterval: search ? false : 5000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      platform: string
      receiver_id: string
      content: string
    }) => api.post<Message>('/messages/send', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}

export function useUploadVoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.webm')
      return api.post<{ id: number; status: string }>('/voice/process', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}

export function useVoiceCommand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice.webm')
      return api.post<{
        status: string
        intent: Record<string, string>
        original_text: string
      }>('/voice/command', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}
