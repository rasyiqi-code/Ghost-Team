import { Link, useNavigate } from '@tanstack/react-router'
import { Ghost, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { disconnectSocket } from '@/lib/socket'

export function Navigation() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    disconnectSocket()
    logout()
    navigate({ to: '/login' })
  }

  if (!user) return null

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <Ghost className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold text-foreground">Ghost Relay</span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Avatar>
          <AvatarFallback>
            {user.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">{user.name}</span>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
