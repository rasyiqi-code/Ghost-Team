import { createRootRouteWithContext, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/authStore'

export const Route = createRootRouteWithContext<{
  isAuthenticated: boolean
}>()({
  beforeLoad: ({ location }) => {
    const token = useAuthStore.getState().token
    if (!token && location.pathname !== '/login' && !location.pathname.startsWith('/invite/') && !location.pathname.startsWith('/reset-password')) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <AppLayout />,
})
