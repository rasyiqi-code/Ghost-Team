import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { ArrowLeft, Save, Key, User as UserIcon, Mail } from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState(user?.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [message, setMessage] = useState('')

  const handleSaveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post('/auth/update-user', { name })
      setUser({ ...user!, name })
      setMessage('Profile updated')
    } catch (e: any) {
      setMessage(e.message || 'Failed to update profile')
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return
    setChangingPassword(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })
      setMessage('Password changed')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) {
      setMessage(e.message || 'Failed to change password')
    }
    setChangingPassword(false)
  }

  return (
    <div className="flex flex-1 bg-background text-foreground min-h-screen overflow-y-auto">
      <div className="flex flex-1 max-w-2xl w-full mx-auto p-8">
        <div className="w-full space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/chat' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1"
                />
                <Button onClick={handleSaveName} disabled={saving || !name.trim()}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
