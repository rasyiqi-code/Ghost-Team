import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Ghost, Shield, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (authClient as any).forgetPassword({ email })
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
            role: (data.user as any).role,
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
            role: (data.user as any).role,
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
            role: (data.user as any).role,
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

  const titleMap = {
    login: 'Sign in to your workspace',
    register: 'Create your account',
    forgot: 'Reset your password',
    owner: 'Owner Access',
  }

  const subtitleMap = {
    login: 'Enter your credentials to continue',
    register: 'Join your team on Ghost Relay',
    forgot: "We'll send a reset link to your email",
    owner: 'Platform administrator access only',
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Gradient orbs */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Glass card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* Card top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 cursor-pointer select-none"
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                style={{ boxShadow: '0 0 24px oklch(0.6 0.22 264 / 15%)' }}
              >
                <Ghost className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-[15px] font-bold text-foreground text-center">
                {titleMap[mode]}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {subtitleMap[mode]}
              </p>
              {mode === 'owner' && (
                <div className="mt-2 flex items-center gap-1.5 text-amber-500 text-xs font-medium">
                  <Shield className="h-3.5 w-3.5" />
                  Owner mode
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 w-full rounded-lg border border-input bg-background/60 px-3 pr-9 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-xs text-destructive fade-slide-in">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5 text-xs text-emerald-600 fade-slide-in">
                  <span className="shrink-0 mt-0.5">✓</span>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 overflow-hidden"
                style={{ boxShadow: '0 0 20px oklch(0.6 0.22 264 / 30%)' }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In'
                      : mode === 'register' ? 'Create Account'
                      : mode === 'owner' ? 'Owner Sign In'
                      : 'Send Reset Link'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              {/* Forgot password link */}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                  className="text-[11px] text-muted-foreground hover:text-primary w-full text-center transition-colors"
                >
                  Forgot your password?
                </button>
              )}
            </form>

            {/* Mode switcher */}
            <p className="mt-5 text-center text-xs text-muted-foreground">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button
                    onClick={() => { setMode('register') }}
                    className="text-primary hover:underline font-medium"
                  >
                    Create one
                  </button>
                </>
              ) : mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login') }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMode('login') }}
                  className="text-primary hover:underline font-medium"
                >
                  ← Back to sign in
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="mt-4 text-center text-[10px] text-muted-foreground/40 select-none">
          Ghost Relay v{APP_VERSION}
          {mode === 'owner' && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-500/60">
              <Shield className="h-2.5 w-2.5" /> Owner
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
