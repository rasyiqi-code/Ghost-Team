import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import {
  Plus,
  Trash2,
  FileText,
  Brain,
  Globe,
  Key,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings as SettingsIcon,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const PROVIDER_TYPES = ['chat', 'embedding', 'audio'] as const
const PROVIDER_LABELS: Record<string, string> = {
  chat: 'Chat Completion',
  embedding: 'Embedding',
  audio: 'Audio/Speech',
}

interface PlatformConnection {
  id: number
  platform: string
  is_active: boolean
  platform_user_id: string | null
}

interface AIProvider {
  id: number
  userId: number
  providerType: string
  name: string
  apiBaseUrl: string
  apiKey: string
  modelId: string
  isActive: boolean
}



function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: platforms = [], isLoading: platformsLoading, isError: platformsError } = useQuery<PlatformConnection[]>({
    queryKey: ['platforms'],
    queryFn: () => api.get('/settings/platforms'),
  })

  const { data: platformMetaList = [] } = useQuery<{ platform: string; name: string; color: string }[]>({
    queryKey: ['platform-meta'],
    queryFn: () => api.get('/settings/platforms/meta'),
    staleTime: 60000,
  })

  const platformMeta = Object.fromEntries(
    platformMetaList.map((m) => [m.platform, { label: m.name, color: m.color }])
  )

  const { data: webhookUrls } = useQuery<Record<string, string>>({
    queryKey: ['webhook-urls'],
    queryFn: () => api.get('/settings/webhook-urls'),
    staleTime: 60000,
  })

  const [testingPlatform, setTestingPlatform] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string; bot?: string } | null>>({})

  // Editable platform user IDs (connection id → value)
  const [platformUserIdEdits, setPlatformUserIdEdits] = useState<Record<number, string>>({})
  // Which connection is currently saving
  const [savingPlatformIds, setSavingPlatformIds] = useState<Set<number>>(new Set())

  const testConnection = async (platform: string) => {
    setTestingPlatform(platform)
    setTestResults((prev) => ({ ...prev, [platform]: null }))
    try {
      const result = await api.post<{ ok: boolean; error?: string; bot?: string }>('/settings/platforms/test', { platform, credentials: '' })
      setTestResults((prev) => ({ ...prev, [platform]: result }))
    } catch (e: unknown) {
      setTestResults((prev) => ({ ...prev, [platform]: { ok: false, error: String(e) } }))
    }
    setTestingPlatform(null)
  }

  const platformUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { platform_user_id?: string | null; is_active?: boolean } }) =>
      api.put(`/settings/platforms/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })

  const platformMigrateMutation = useMutation({
    mutationFn: () => api.post<{ message: string; report: { total: number; updated: number; skipped: number } }>('/settings/platforms/migrate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    },
  })

  const savePlatformUserId = async (connId: number) => {
    const value = platformUserIdEdits[connId]
    if (value === undefined) return
    setSavingPlatformIds((prev) => new Set(prev).add(connId))
    try {
      await platformUpdateMutation.mutateAsync({ id: connId, data: { platform_user_id: value || null } })
      setPlatformUserIdEdits((prev) => {
        const next = { ...prev }
        delete next[connId]
        return next
      })
    } finally {
      setSavingPlatformIds((prev) => {
        const next = new Set(prev)
        next.delete(connId)
        return next
      })
    }
  }

  const togglePlatformActive = async (conn: PlatformConnection) => {
    await platformUpdateMutation.mutateAsync({ id: conn.id, data: { is_active: !conn.is_active } })
  }

  const { data: aiProviders = [], isLoading: aiLoading, isError: aiError } = useQuery<AIProvider[]>({
    queryKey: ['ai-providers'],
    queryFn: () => api.get('/ai/providers'),
  })

  const { data: catalog = { providers: [] } } = useQuery<{
    providers: { id: string; name: string; api: string; models: string[] }[]
  }>({
    queryKey: ['models-catalog'],
    queryFn: () => api.get('/settings/models-catalog'),
    staleTime: 24 * 3600 * 1000
  })

  const { data: availableModels } = useQuery<{ models: { id: string }[] }>({
    queryKey: ['ai-models'],
    queryFn: () => api.get('/ai/providers/models'),
    enabled: aiProviders.length > 0,
    retry: false,
  })

  const [showForm, setShowForm] = useState<string | null>(null)
  const [aiForm, setAiForm] = useState<{
    providerType: string
    name: string
    apiBaseUrl: string
    apiKey: string
    modelId: string
  } | null>(null)

  const aiCreateMutation = useMutation({
    mutationFn: (data: NonNullable<typeof aiForm>) => api.post('/ai/providers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      setAiForm(null)
    },
  })

  const aiDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/ai/providers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-providers'] }),
  })

  const { data: envSettings = [], isLoading: envLoading, isError: envError } = useQuery<{ key: string; value: string; source: string }[]>({
    queryKey: ['env-settings'],
    queryFn: () => api.get('/settings/env'),
  })

  const envUpdateMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      api.post('/settings/env', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['env-settings'] }),
  })

  const envDeleteMutation = useMutation({
    mutationFn: (key: string) => api.delete(`/settings/env/${key}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['env-settings'] }),
  })

  const [envEdits, setEnvEdits] = useState<Record<string, string>>({})
  const [copiedWebhook, setCopiedWebhook] = useState<Record<string, boolean>>({})
  const handleCopyWebhook = (platform: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedWebhook(prev => ({ ...prev, [platform]: true }))
    setTimeout(() => setCopiedWebhook(prev => ({ ...prev, [platform]: false })), 2000)
  }

  return (
    <div className="flex flex-1 flex-col p-8 overflow-y-auto bg-slate-950 text-slate-100 min-h-screen">
      <div className="max-w-4xl w-full mx-auto space-y-8 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-slate-400">Manage your workspace configuration, AI agents, platform channels, and system variables.</p>
        </div>

        {/* AI Providers Section */}
        <Card className="border border-slate-800/80 bg-slate-900/30 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center text-slate-200">
                <Brain className="h-5 w-5 inline mr-2 text-indigo-400" />
                AI Providers
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => {
                  setAiForm({ providerType: 'chat', name: '', apiBaseUrl: '', apiKey: '', modelId: '' })
                }}
              >
                <Plus className="h-4 w-4 mr-1 text-indigo-400" /> Add Provider
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure LLM and embedding models from any OpenAI-compatible api provider. Choose from the dynamic{' '}
              <a href="https://models.dev" target="_blank" className="underline text-indigo-400 hover:text-indigo-300" rel="noreferrer">
                models.dev
              </a>
              {' '}catalog.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {aiLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : aiError ? (
              <p className="text-sm text-red-400 py-4 text-center">Gagal memuat AI providers.</p>
            ) : aiProviders.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No AI providers configured. Setup your provider to activate AI agent services.
              </p>
            ) : (
              <div className="grid gap-3">
                {aiProviders.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 transition-all hover:bg-slate-900/30 hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Globe className="h-5 w-5 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-200 truncate">{p.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded px-2 py-0.5 bg-indigo-950/50 text-indigo-300 border border-indigo-900/40">
                            {PROVIDER_LABELS[p.providerType] || p.providerType}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-1 font-mono">
                          {p.modelId} <span className="text-slate-600">·</span> {p.apiBaseUrl.replace('/v1', '')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.isActive ? (
                        <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4.5 w-4.5 text-slate-600" />
                      )}
                      <button
                        onClick={() => aiDeleteMutation.mutate(p.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Provider Add Form */}
            {aiForm && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-inner">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Provider Type</label>
                    <select
                      value={aiForm.providerType}
                      onChange={(e) => setAiForm(prev => prev ? { ...prev, providerType: e.target.value } : null)}
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    >
                      {PROVIDER_TYPES.map((t) => (
                        <option key={t} value={t}>{PROVIDER_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Name</label>
                    <input
                      type="text"
                      value={aiForm.name}
                      onChange={(e) => {
                        const name = e.target.value
                        const matched = (catalog?.providers || []).find(
                          p => p.name.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
                        )
                        if (matched) {
                          setAiForm(prev => prev ? {
                            ...prev,
                            name,
                            apiBaseUrl: matched.api || '',
                            modelId: matched.models?.[0] || ''
                          } : null)
                        } else {
                          setAiForm(prev => prev ? { ...prev, name } : null)
                        }
                      }}
                      placeholder="OpenAI, Anthropic, OpenRouter, dsb."
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                      list="settings-providers"
                    />
                    <datalist id="settings-providers">
                      {(catalog?.providers || []).map(p => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={aiForm.apiBaseUrl}
                      onChange={(e) => setAiForm(prev => prev ? { ...prev, apiBaseUrl: e.target.value } : null)}
                      placeholder="https://api.openai.com/v1"
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                      list="settings-base-urls"
                    />
                    <datalist id="settings-base-urls">
                      {(catalog?.providers || []).map(p => (
                        <option key={p.id} value={p.api} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-slate-400" />
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiForm.apiKey}
                      onChange={(e) => setAiForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                      placeholder="sk-..."
                      className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Model ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiForm.modelId}
                      onChange={(e) => setAiForm(prev => prev ? { ...prev, modelId: e.target.value } : null)}
                      placeholder="gpt-4o, claude-3-5-sonnet, dsb."
                      className="h-8 flex-1 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
                      list="model-suggestions"
                    />
                    <datalist id="model-suggestions">
                      {(() => {
                        const matched = (catalog?.providers || []).find(
                          p => p.name.toLowerCase() === aiForm.name.toLowerCase() || p.id.toLowerCase() === aiForm.name.toLowerCase()
                        )
                        const suggestions = matched ? matched.models : (availableModels?.models || []).map(m => m.id)
                        return suggestions.map((m) => (
                          <option key={m} value={m} />
                        ))
                      })()}
                    </datalist>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      onClick={async () => {
                        queryClient.invalidateQueries({ queryKey: ['ai-models'] })
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                    onClick={() => setAiForm(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    disabled={!aiForm.name || !aiForm.apiBaseUrl || !aiForm.apiKey || !aiForm.modelId}
                    onClick={() => aiCreateMutation.mutate(aiForm)}
                  >
                    Save Provider
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Platforms */}
        <Card className="border border-slate-800/80 bg-slate-900/30 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center text-slate-200">
                <Globe className="h-5 w-5 inline mr-2 text-cyan-400" />
                Connected Platforms
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800"
                  disabled={platformMigrateMutation.isPending}
                  onClick={async () => {
                    const result = await platformMigrateMutation.mutateAsync()
                    alert(result.message)
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 text-cyan-400 ${platformMigrateMutation.isPending ? 'animate-spin' : ''}`} />
                  {platformMigrateMutation.isPending ? 'Migrating...' : 'Migrate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => setShowForm(showForm ? null : 'telegram')}
                >
                  <Plus className="h-4 w-4 mr-1 text-cyan-400" /> Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {platformsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : platformsError ? (
              <p className="text-sm text-red-400 py-4 text-center">Gagal memuat platform.</p>
            ) : platforms.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                Belum ada platform terhubung. Hubungkan bot untuk mulai menerima pesan.
              </p>
            ) : (
              <div className="grid gap-4">
                {platforms.map((p) => {
                  const meta = platformMeta[p.platform] || {
                    label: p.platform,
                    color: 'bg-slate-500',
                  }
                  const isEditing = platformUserIdEdits[p.id] !== undefined
                  const editValue = platformUserIdEdits[p.id] ?? p.platform_user_id ?? ''
                  const isSaving = savingPlatformIds.has(p.id)
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 space-y-3 transition-all hover:bg-slate-900/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.color} shadow-sm animate-pulse`} />
                          <span className="font-semibold text-sm text-slate-200 capitalize">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {p.platform !== 'web' && (
                            <button
                              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                              disabled={testingPlatform === p.platform}
                              onClick={() => testConnection(p.platform)}
                            >
                              {testingPlatform === p.platform ? (
                                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                              ) : 'test connection'}
                            </button>
                          )}
                          {testResults[p.platform] != null && (
                            <Badge className={`text-[10px] uppercase font-bold rounded px-1.5 py-0.5 border ${
                              testResults[p.platform]!.ok 
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60' 
                                : 'bg-rose-950/60 text-rose-400 border-rose-900/60'
                            }`}>
                              {testResults[p.platform]!.ok ? 'CONNECTED' : 'FAILED'}
                            </Badge>
                          )}
                          <button
                            className="text-xs"
                            onClick={() => togglePlatformActive(p)}
                          >
                            <Badge className={`text-[10px] uppercase font-bold tracking-wider rounded px-2 py-0.5 border ${
                              p.is_active 
                                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-900/40' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {p.is_active ? 'active' : 'inactive'}
                            </Badge>
                          </button>
                        </div>
                      </div>
                      
                      {/* Platform User ID row */}
                      <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-900 rounded-lg p-2">
                        <label className="text-xs text-slate-400 font-medium shrink-0 w-24 pl-1">
                          {p.platform === 'telegram' ? 'Chat ID' :
                           p.platform === 'whatsapp' ? 'Phone ID' :
                           p.platform === 'slack' ? 'Workspace ID' :
                           'Identifier'}
                        </label>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) =>
                            setPlatformUserIdEdits((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder={p.platform === 'telegram' ? '123456789' :
                            p.platform === 'whatsapp' ? '15551234567' :
                            p.platform === 'slack' ? 'T01234567' :
                            'Enter identifier'}
                          className="h-7 flex-1 bg-transparent px-1 text-xs text-slate-200 outline-none placeholder-slate-700"
                        />
                        {isEditing && (
                          <button
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 shrink-0 pr-1 transition-colors"
                            disabled={isSaving}
                            onClick={() => savePlatformUserId(p.id)}
                          >
                            {isSaving ? 'saving...' : 'save'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {webhookUrls && (
              <div className="mt-6 space-y-3 border-t border-slate-800/80 pt-6">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Webhook URLs</p>
                <div className="grid gap-2">
                  {Object.entries(webhookUrls).map(([platform, url]) => (
                    <div key={platform} className="flex items-center justify-between gap-3 text-xs bg-slate-950/40 border border-slate-800/50 rounded-xl p-3">
                      <span className="w-20 shrink-0 font-semibold capitalize text-slate-300 flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${
                          platform === 'telegram' ? 'bg-sky-400' :
                          platform === 'slack' ? 'bg-amber-400' :
                          platform === 'whatsapp' ? 'bg-emerald-400' :
                          'bg-slate-400'
                        }`} />
                        {platform}
                      </span>
                      <code className="flex-1 truncate rounded bg-slate-950 px-2.5 py-1 font-mono text-slate-400 select-all border border-slate-900">
                        {url}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-slate-200 shrink-0 transition-colors"
                        onClick={() => handleCopyWebhook(platform, url)}
                      >
                        {copiedWebhook[platform] ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Reports */}
        <Card className="border border-slate-800/80 bg-slate-900/30 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-900 px-6 py-4">
            <CardTitle className="text-lg font-bold flex items-center text-slate-200">
              <FileText className="h-5 w-5 inline mr-2 text-rose-400" />
              Daily Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-slate-400 mb-4">
              Generate AI-powered daily activity summaries from message histories across all connected channels.
            </p>
            <Button
              variant="default"
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
              onClick={async () => {
                const res = await api.post<{ report: string }>('/reports/generate')
                alert(res.report)
              }}
            >
              Generate Today's Report
            </Button>
          </CardContent>
        </Card>

        {/* System Config */}
        <Card className="border border-slate-800/80 bg-slate-900/30 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-900 px-6 py-4">
            <CardTitle className="text-lg font-bold flex items-center text-slate-200">
              <SettingsIcon className="h-5 w-5 inline mr-2 text-violet-400" />
              System Config
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Override dynamic server environment variables. Database overrides take precedence over .env config values.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {envLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
            ) : envError ? (
              <p className="text-sm text-red-400 py-4 text-center">Gagal memuat konfigurasi sistem.</p>
            ) : (
              <div className="space-y-3">
                {envSettings.map((env) => (
                  <div key={env.key} className="flex items-center gap-3 bg-slate-950/20 border border-slate-900 rounded-xl p-3">
                    <span className="text-xs font-mono font-semibold text-slate-400 w-44 shrink-0 truncate" title={env.key}>
                      {env.key}
                    </span>
                    <input
                      className="flex-1 h-8 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-xs text-white placeholder-slate-700 outline-none focus:border-violet-500 transition-colors"
                      placeholder={env.value || env.key}
                      defaultValue={envEdits[env.key] ?? env.value}
                      onChange={(e) => {
                        setEnvEdits({ ...envEdits, [env.key]: e.target.value })
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== env.value) {
                          envUpdateMutation.mutate({ key: env.key, value: e.target.value })
                        }
                      }}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[9px] uppercase font-bold tracking-wider rounded-md px-1.5 py-0.5 border ${
                        env.source === 'db'
                          ? 'bg-violet-950/50 text-violet-300 border-violet-900/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {env.source}
                      </Badge>
                      {env.source === 'db' && (
                        <button
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                          onClick={() => envDeleteMutation.mutate(env.key)}
                          title="Reset to default"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
