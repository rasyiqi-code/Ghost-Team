import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Toaster } from '@/components/ui/toast'
import { router } from './router'
import { requestNotifPermission, resumeAudio } from './hooks/useSocketEvents'
import './index.css'

// Minta izin desktop notification di awal (best-effort, browser mungkin require user gesture)
requestNotifPermission()

// Resume AudioContext setelah user gesture pertama
const firstInteraction = () => {
  resumeAudio()
  requestNotifPermission()
  document.removeEventListener('click', firstInteraction)
  document.removeEventListener('touchstart', firstInteraction)
}
document.addEventListener('click', firstInteraction, { once: true })
document.addEventListener('touchstart', firstInteraction, { once: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30_000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
