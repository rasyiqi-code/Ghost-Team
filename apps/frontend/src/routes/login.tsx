import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Ghost, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const APP_VERSION = '1.0.0'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: search.invite as string | undefined,
  }),
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (token) throw redirect({ to: '/chat' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const searchInvite = Route.useSearch().invite
  const [invite] = useState(() => searchInvite || sessionStorage.getItem('pending_invite'))
  const setUser = useAuthStore((s) => s.setUser)
  const setToken = useAuthStore((s) => s.setToken)
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'owner'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [ownerRevealed, setOwnerRevealed] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setOwnerRevealed(true)
      setMode('owner')
      setError('')
      setSuccess('')
    }, 800)
  }, [])

  const handleLongPressEnd = useCallback(() => {
    clearTimeout(longPressTimer.current)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const { error: err } = await authClient.forgetPassword({ email })
        if (err) throw new Error(err.message || 'Failed to send reset link')
        setSuccess('Cek console server untuk link reset password (development mode).')
        setLoading(false)
        return
      }
      let authToken = ''
      if (mode === 'owner') {
        const { data, error: err } = await authClient.signIn.email(
          { email, password },
          {
            onSuccess: (ctx) => {
              authToken = ctx.response.headers.get('set-auth-token') || ''
            },
          }
        )
        if (err) throw new Error(err.message || 'Incorrect email or password')
        if (data && authToken) {
          setToken(authToken)
          setUser({
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          })
          // Verifikasi owner via backend
          const check = await api.get<{ role: string }>('/admin/check')
          if (check.role !== 'owner') {
            await authClient.signOut()
            setToken(null)
            setUser(null)
            throw new Error('Akun ini bukan platform owner.')
          }
          navigate({ to: '/admin' })
        }
        return
      }
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
            role: data.user.role,
          })
          if (invite) {
            try {
              const result = await api.post<{ status: string; workspaceName?: string }>('/settings/invite/accept', { code: invite }, { silent: true })
              if (result.status === 'already_member') {
                toast.info('Anda sudah menjadi anggota tim ini')
              } else if (result.status === 'ok') {
                toast.success('Berhasil bergabung ke ' + (result.workspaceName || 'tim'))
              }
              sessionStorage.removeItem('pending_invite')
            } catch (err) {
              // Invite gagal — sessionStorage tetap disimpan agar user bisa coba lagi
              toast.error('Gagal menerima undangan. Setelah login, buka tautan undangan lagi untuk mencoba ulang.')
            }
          }
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
            role: data.user.role,
          })
          // Accept invite jika ada kode undangan
          if (invite) {
            try {
              const result = await api.post<{ status: string; workspaceName?: string }>('/settings/invite/accept', { code: invite }, { silent: true })
              if (result.status === 'already_member') {
                toast.info('Anda sudah menjadi anggota tim ini')
              } else if (result.status === 'ok') {
                toast.success('Berhasil bergabung ke ' + (result.workspaceName || 'tim'))
              }
              sessionStorage.removeItem('pending_invite')
            } catch (err) {
              // Invite gagal — sessionStorage tetap disimpan agar user bisa coba lagi
              toast.error('Gagal menerima undangan. Setelah menyelesaikan onboarding, buka tautan undangan lagi untuk mencoba ulang.')
            }
          }
          navigate({ to: invite ? '/chat' : '/onboarding' })
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
            {mode === 'owner' ? 'Owner Access' : mode === 'login' ? 'Sign In' : 'Create Account'}
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
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : mode === 'register'
                    ? 'Create Account'
                    : mode === 'owner'
                      ? 'Owner Sign In'
                      : 'Send Reset Link'}
            </Button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                className="text-xs text-muted-foreground hover:text-primary w-full text-center"
              >
                Forgot password?
              </button>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  onClick={() => { setMode('register'); setOwnerRevealed(false) }}
                  className="text-primary hover:underline"
                >
                  Create one
                </button>
              </>
            ) : mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setOwnerRevealed(false) }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : mode === 'owner' ? (
              <button
                onClick={() => { setMode('login'); setOwnerRevealed(false) }}
                className="text-primary hover:underline text-sm"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => { setMode('login'); setOwnerRevealed(false) }}
                className="text-primary hover:underline text-sm"
              >
                Back to sign in
              </button>
            )}
          </p>
          <p
            className="mt-4 text-center text-[10px] text-muted-foreground select-none"
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
          >
            v{APP_VERSION}
            {mode === 'owner' && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                <Shield className="h-3 w-3" /> Owner
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
