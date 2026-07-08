import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link as LinkIcon, Check, Copy, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

interface InviteData {
  code: string
}

export function InviteCard() {
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const inviteUrl = invite ? `${window.location.origin}/invite/${invite.code}` : ''

  const fetchInvite = async () => {
    setLoading(true)
    try {
      const data = await api.post<InviteData>('/settings/invite/generate')
      setInvite(data)
    } catch { /* silent */ }
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <LinkIcon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Undangan Tim</h2>
          <p className="text-[11px] text-slate-500">Bagikan tautan ini ke rekan tim untuk bergabung</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-9 w-full rounded-lg" />
      ) : (
        <div className="flex gap-2">
          <Input
            readOnly
            value={inviteUrl || 'Gagal memuat'}
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
            className="border-slate-200 text-slate-500 shrink-0 hover:bg-slate-100"
            title="Buat ulang tautan"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}
      {copied && <span className="text-[10px] text-green-500 mt-1 block">Tautan berhasil disalin!</span>}
    </div>
  )
}
