import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Check, Copy, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

interface InviteData {
  code: string
}

export function StepInvite() {
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const inviteUrl = invite ? `${window.location.origin}/invite/${invite.code}` : ''

  const fetchInvite = async () => {
    setLoading(true)
    try {
      const data = await api.post<InviteData>('/settings/invite/generate')
      setInvite(data)
    } catch {
      // silent
    }
    setLoading(false)
  }

  useEffect(() => { fetchInvite() }, [])

  const handleCopy = () => {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    try {
      const data = await api.post<InviteData>('/settings/invite/regenerate')
      setInvite(data)
      setCopied(false)
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-indigo-600">
        <Users className="h-5 w-5" />
        <h3 className="font-semibold text-slate-800">Undang Rekan Tim</h3>
      </div>
      <p className="text-xs text-slate-500">
        Bagikan tautan undangan ini ke rekan tim. Mereka tinggal buka link di browser dan register.
      </p>

      <div className="space-y-2 pt-2">
        <label className="text-xs font-medium text-slate-500">Tautan Undangan</label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={loading ? 'Memuat...' : inviteUrl || 'Gagal memuat'}
            className="bg-slate-50 border-slate-200 text-slate-900 select-all font-mono text-xs"
          />
          <Button
            variant="outline" size="icon"
            onClick={handleCopy}
            disabled={!invite}
            className="border-slate-200 text-slate-500 shrink-0 hover:bg-slate-100"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline" size="icon"
            onClick={handleRegenerate}
            disabled={loading}
            className="border-slate-200 text-slate-500 shrink-0 hover:bg-slate-100"
            title="Buat ulang tautan"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {copied && <span className="text-[10px] text-green-500">Tautan berhasil disalin!</span>}
      </div>
    </div>
  )
}
