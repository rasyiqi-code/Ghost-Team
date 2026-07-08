import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Users, Sparkles, Check, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InviteInfo {
  valid: boolean
  workspaceName: string
  workspacePurpose: string
  workspaceContext: string
}

export const Route = createFileRoute('/invite/$code')({
  component: InvitePage,
})

function InvitePage() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/settings/invite/${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setInfo(data)
        } else {
          setError(data.detail || 'Invite tidak valid')
        }
      })
      .catch(() => setError('Gagal memuat undangan'))
      .finally(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Undangan Tidak Valid</h1>
          <p className="text-sm text-slate-500 mt-2">{error || 'Tautan undangan tidak ditemukan atau sudah kedaluwarsa.'}</p>
          <Link to="/login" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
            Kembali ke halaman login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{info.workspaceName || 'Ghost Relay'}</h1>
          <p className="text-sm text-slate-500 mt-1">Anda diundang untuk bergabung ke ruang kerja ini</p>
        </div>

        {info.workspacePurpose && (
          <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-1">Tujuan Ruang Kerja</p>
            <p className="text-sm text-slate-700">{info.workspacePurpose}</p>
          </div>
        )}

        {info.workspaceContext && (
          <div className="mb-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-1">Konteks</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{info.workspaceContext}</p>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-6 text-center">
          Dengan bergabung, Anda dapat berkolaborasi dan memantau komunikasi tim dalam satu dashboard.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              sessionStorage.setItem('pending_invite', code)
              navigate({ to: '/login' })
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium w-full"
          >
            Daftar / Login <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
