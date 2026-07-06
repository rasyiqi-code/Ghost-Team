import { Outlet, useMatch } from '@tanstack/react-router'
import { Navigation } from './Navigation'

export function AppLayout() {
  const isLogin = useMatch({ from: '/login', shouldThrow: false }) !== undefined

  if (isLogin) {
    return <Outlet />
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
