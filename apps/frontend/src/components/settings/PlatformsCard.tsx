import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Globe, Plus, RefreshCw, Check, Copy, Loader2, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import type { PlatformConnection } from '@/types'

interface PlatformMeta {
  platform: string
  name: string
  color: string
}

function PlatformRow({
  p,
  meta,
  onTest,
  isTesting,
  testResult,
  onToggleActive,
}: {
  p: PlatformConnection
  meta: { label: string; color: string }
  onTest: () => void
  isTesting: boolean
  testResult: { ok: boolean; error?: string } | null | undefined
  onToggleActive: () => void
}) {
  const queryClient = useQueryClient()
  const [editValue, setEditValue] = useState(p.platform_user_id ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.put(`/settings/platforms/${p.id}`, { platform_user_id: editValue || null })
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const idLabel =
    p.platform === 'telegram' ? 'Chat ID' :
    p.platform === 'whatsapp' ? 'Phone ID' :
    p.platform === 'slack' ? 'Workspace ID' : 'Identifier'

  const idPlaceholder =
    p.platform === 'telegram' ? '123456789' :
    p.platform === 'whatsapp' ? '15551234567' :
    p.platform === 'slack' ? 'T01234567' : 'Enter identifier'

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.color} animate-pulse`} />
          <span className="font-semibold text-sm text-slate-800 capitalize">{meta.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {p.platform !== 'web' && (
            <button
              className="text-xs text-cyan-600 hover:text-cyan-700 transition-colors disabled:opacity-50"
              disabled={isTesting}
              onClick={onTest}
            >
              {isTesting ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : 'test connection'}
            </button>
          )}
          {testResult != null && (
            <Badge className={`text-[10px] uppercase font-bold rounded px-1.5 py-0.5 border ${
              testResult.ok ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {testResult.ok ? 'CONNECTED' : 'FAILED'}
            </Badge>
          )}
          <button className="text-xs" onClick={onToggleActive}>
            <Badge className={`text-[10px] uppercase font-bold tracking-wider rounded px-2 py-0.5 border ${
              p.is_active ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}>
              {p.is_active ? 'active' : 'inactive'}
            </Badge>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2">
        <label className="text-xs text-slate-400 font-medium shrink-0 w-24 pl-1">{idLabel}</label>
        <input
          type="text"
          value={editValue}
          onChange={e => { setEditValue(e.target.value); setIsEditing(true) }}
          placeholder={idPlaceholder}
          className="h-7 flex-1 bg-transparent px-1 text-xs text-slate-700 outline-none placeholder-slate-300"
        />
        {isEditing && (
          <button
            className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 shrink-0 pr-1 transition-colors"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'saving...' : 'save'}
          </button>
        )}
      </div>
    </div>
  )
}

function WebhookUrls({ urls }: { urls: Record<string, string> }) {
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const handleCopy = (platform: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(prev => ({ ...prev, [platform]: true }))
    setTimeout(() => setCopied(prev => ({ ...prev, [platform]: false })), 2000)
  }

  const dotColor = (p: string) =>
    p === 'telegram' ? 'bg-sky-400' : p === 'slack' ? 'bg-amber-400' : p === 'whatsapp' ? 'bg-emerald-400' : 'bg-slate-400'

  return (
    <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Webhook URLs</p>
      <div className="grid gap-2">
        {Object.entries(urls).map(([platform, url]) => (
          <div key={platform} className="flex items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="w-20 shrink-0 font-semibold capitalize text-slate-600 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${dotColor(platform)}`} />
              {platform}
            </span>
            <code className="flex-1 truncate rounded bg-white px-2.5 py-1 font-mono text-slate-500 select-all border border-slate-200">
              {url}
            </code>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
              onClick={() => handleCopy(platform, url)}
            >
              {copied[platform] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlatformsCard() {
  const queryClient = useQueryClient()

  const { data: platforms = [], isLoading, isError } = useQuery<PlatformConnection[]>({
    queryKey: ['platforms'],
    queryFn: () => api.get('/settings/platforms'),
  })

  const { data: platformMetaList = [] } = useQuery<PlatformMeta[]>({
    queryKey: ['platform-meta'],
    queryFn: () => api.get('/settings/platforms/meta'),
    staleTime: 60000,
  })

  const { data: webhookUrls } = useQuery<Record<string, string>>({
    queryKey: ['webhook-urls'],
    queryFn: () => api.get('/settings/webhook-urls'),
    staleTime: 60000,
  })

  const platformMeta = Object.fromEntries(
    platformMetaList.map(m => [m.platform, { label: m.name, color: m.color }])
  )

  const [testingPlatform, setTestingPlatform] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string } | null>>({})
  const [showForm, setShowForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState('telegram')
  const [newCredentials, setNewCredentials] = useState('')
  const [newPlatformUserId, setNewPlatformUserId] = useState('')

  const migrateMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>('/settings/platforms/migrate'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: { platform: string; credentials?: string; platform_user_id?: string }) =>
      api.post('/settings/platforms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
      setShowForm(false)
      setNewPlatform('telegram')
      setNewCredentials('')
      setNewPlatformUserId('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { is_active?: boolean } }) =>
      api.put(`/settings/platforms/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platforms'] }),
  })

  const testConnection = async (platform: string) => {
    setTestingPlatform(platform)
    try {
      const result = await api.post<{ ok: boolean; error?: string }>('/settings/platforms/test', { platform, credentials: '' })
      setTestResults(prev => ({ ...prev, [platform]: result }))
    } catch (e) {
      setTestResults(prev => ({ ...prev, [platform]: { ok: false, error: String(e) } }))
    }
    setTestingPlatform(null)
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center text-slate-800">
            <Globe className="h-5 w-5 inline mr-2 text-cyan-500" />
            Connected Platforms
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
              disabled={migrateMutation.isPending}
              onClick={async () => {
                try {
                  const result = await migrateMutation.mutateAsync()
                  alert(result.message)
                } catch (e: any) {
                  alert(e.response?.data?.detail || e.message || 'Gagal melakukan migrasi.')
                }
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 text-cyan-500 ${migrateMutation.isPending ? 'animate-spin' : ''}`} />
              {migrateMutation.isPending ? 'Migrating...' : 'Migrate'}
            </Button>
            <Button
              variant="outline" size="sm"
              className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4 mr-1 text-cyan-500" /> Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 py-4 text-center">Gagal memuat platform.</p>
        ) : platforms.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Belum ada platform terhubung.</p>
        ) : (
          <div className="grid gap-4">
            {platforms.map(p => (
              <PlatformRow
                key={p.id}
                p={p}
                meta={platformMeta[p.platform] || { label: p.platform, color: 'bg-slate-400' }}
                onTest={() => testConnection(p.platform)}
                isTesting={testingPlatform === p.platform}
                testResult={testResults[p.platform]}
                onToggleActive={() => updateMutation.mutate({ id: p.id, data: { is_active: !p.is_active } })}
              />
            ))}
          </div>
        )}

        {showForm && (
          <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50/20 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Connect New Platform</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Platform</label>
                <div className="relative">
                  <select
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                    className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-800 outline-none focus:border-cyan-400 transition-all cursor-pointer"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="slack">Slack</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  {newPlatform === 'telegram' ? 'Bot Token' : newPlatform === 'whatsapp' ? 'Access Token' : 'OAuth Token'}
                </label>
                <input
                  type="password"
                  value={newCredentials}
                  onChange={e => setNewCredentials(e.target.value)}
                  placeholder={newPlatform === 'telegram' ? '123456:ABC...' : 'Enter credentials...'}
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-300 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                {newPlatform === 'telegram' ? 'Chat ID (Optional)' : newPlatform === 'whatsapp' ? 'Phone ID (Optional)' : 'Workspace ID (Optional)'}
              </label>
              <input
                type="text"
                value={newPlatformUserId}
                onChange={e => setNewPlatformUserId(e.target.value)}
                placeholder="Enter identifier..."
                className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-300 outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setShowForm(false)
                  setNewCredentials('')
                  setNewPlatformUserId('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white"
                disabled={createMutation.isPending || !newCredentials}
                onClick={async () => {
                  try {
                    await createMutation.mutateAsync({
                      platform: newPlatform,
                      credentials: newCredentials,
                      platform_user_id: newPlatformUserId || undefined,
                    })
                  } catch (e: any) {
                    alert(e.response?.data?.detail || e.message || 'Gagal menghubungkan platform.')
                  }
                }}
              >
                {createMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        )}

        {webhookUrls && <WebhookUrls urls={webhookUrls} />}
      </CardContent>
    </Card>
  )
}
