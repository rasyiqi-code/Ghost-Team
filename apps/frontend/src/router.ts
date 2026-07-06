import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from '@/stores/authStore'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    isAuthenticated: !!useAuthStore.getState().token,
  },
})

useAuthStore.subscribe((state) => {
  router.update({
    context: { isAuthenticated: !!state.token },
  })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
