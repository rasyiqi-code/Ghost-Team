import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ghost } from 'lucide-react'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive text-center">Invalid reset link.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token })
      if (err) throw new Error(err.message || 'Failed to reset password')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-emerald-600 text-center">Password berhasil direset!</p>
            <Button className="w-full" onClick={() => navigate({ to: '/login' })}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Ghost className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Ghost Relay</span>
          </div>
          <CardTitle className="text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
