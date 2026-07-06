import { createAuthClient } from 'better-auth/react'
import { useAuthStore } from '../stores/authStore'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => useAuthStore.getState().token || '',
    },
  },
})
