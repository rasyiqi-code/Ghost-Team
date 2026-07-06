import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authClient } from '@/lib/auth-client'
import { Ghost } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (token) throw redirect({ to: '/chat' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setToken = useAuthStore((s) => s.setToken)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let authToken = ''
      if (mode === 'login') {
        const { data, error: err } = await authClient.signIn.email(
          { email, password },
          {
            onSuccess: (ctx) => {
              authToken = ctx.response.headers.get('set-auth-token') || ''
            },
          }
        )
        if (err) {
          throw new Error(err.message || 'Incorrect email or password')
        }
        if (data && authToken) {
          setToken(authToken)
          setUser({
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
          })
          navigate({ to: '/chat' })
        }
      } else {
        const { data, error: err } = await authClient.signUp.email(
          { email, password, name },
          {
            onSuccess: (ctx) => {
              authToken = ctx.response.headers.get('set-auth-token') || ''
            },
          }
        )
        if (err) {
          throw new Error(err.message || 'Registration failed')
        }
        if (data && authToken) {
          setToken(authToken)
          setUser({
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
          })
          navigate({ to: '/onboarding' })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Ghost className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Ghost Relay</span>
          </div>
          <CardTitle className="text-center">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-primary hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
