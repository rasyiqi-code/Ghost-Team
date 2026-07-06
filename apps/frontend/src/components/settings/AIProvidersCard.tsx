import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, Globe, Key, Plus, Trash2, CheckCircle, XCircle, RefreshCw, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useModelsCatalog } from '@/hooks/useModelsCatalog'
import type { AIProvider, AIProviderForm } from '@/types'

const PROVIDER_TYPES = ['chat', 'embedding', 'audio'] as const
const PROVIDER_LABELS: Record<string, string> = {
  chat: 'Chat Completion',
  embedding: 'Embedding',
  audio: 'Audio/Speech',
}

const inputCls = 'h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 transition-colors'
const selectCls = 'h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 transition-all cursor-pointer'

export function AIProvidersCard() {
  const queryClient = useQueryClient()
  const { data: catalog = { providers: [] } } = useModelsCatalog()

  const { data: aiProviders = [], isLoading, isError } = useQuery<AIProvider[]>({
    queryKey: ['ai-providers'],
    queryFn: () => api.get('/ai/providers'),
  })

  const { data: availableModels } = useQuery<{ models: { id: string }[] }>({
    queryKey: ['ai-models'],
    queryFn: () => api.get('/ai/providers/models'),
    enabled: aiProviders.length > 0,
    retry: false,
  })

  const [form, setForm] = useState<AIProviderForm | null>(null)
  const [liveModels, setLiveModels] = useState<string[]>([])
  const [fetchingLiveModels, setFetchingLiveModels] = useState(false)
  const [isCustomProvider, setIsCustomProvider] = useState(false)
  const [customName, setCustomName] = useState('')
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModelId, setCustomModelId] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: AIProviderForm) => api.post('/ai/providers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      setForm(null)
      setLiveModels([])
      setIsCustomProvider(false)
      setCustomName('')
      setIsCustomModel(false)
      setCustomModelId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/ai/providers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-providers'] }),
  })

  const handleNameChange = (name: string) => {
    setLiveModels([])
    setIsCustomModel(false)
    setCustomModelId('')
    if (name === 'custom') {
      setIsCustomProvider(true)
      setCustomName('')
      setForm(prev => prev ? { ...prev, name: '', apiBaseUrl: '', modelId: '' } : null)
      return
    }

    setIsCustomProvider(false)
    const matched = (catalog?.providers || []).find(
      p => p.name.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
    )
    setForm(prev => prev
      ? { ...prev, name, apiBaseUrl: matched?.api || prev.apiBaseUrl, modelId: matched?.models?.[0] || prev.modelId }
      : null
    )
  }

  const fetchLiveModels = async () => {
    if (!form || !form.apiBaseUrl || !form.apiKey) return
    setFetchingLiveModels(true)
    try {
      const res = await api.post<{ status: string; models?: string[]; detail?: string }>('/ai/providers/test', {
        api_base_url: form.apiBaseUrl,
        api_key: form.apiKey,
      })
      if (res.status === 'ok' && res.models) {
        setLiveModels(res.models)
      } else {
        alert(res.detail || 'Gagal mengambil daftar model. Periksa API Key dan Base URL.')
      }
    } catch (e: any) {
      alert(e.message || 'Gagal terhubung ke provider.')
    } finally {
      setFetchingLiveModels(false)
    }
  }

  const modelSuggestions = (() => {
    if (!form) return []
    if (liveModels.length > 0) return liveModels
    const matched = (catalog?.providers || []).find(
      p => p.name.toLowerCase() === form.name.toLowerCase() || p.id.toLowerCase() === form.name.toLowerCase()
    )
    return matched ? matched.models : (availableModels?.models || []).map(m => m.id)
  })()

  return (
    <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center text-slate-800">
            <Brain className="h-5 w-5 inline mr-2 text-indigo-500" />
            AI Providers
          </CardTitle>
          <Button
            variant="outline" size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => {
              setForm({ providerType: 'chat', name: '', apiBaseUrl: '', apiKey: '', modelId: '' })
              setLiveModels([])
              setIsCustomProvider(false)
              setCustomName('')
              setIsCustomModel(false)
              setCustomModelId('')
            }}
          >
            <Plus className="h-4 w-4 mr-1 text-indigo-500" /> Add Provider
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure LLM providers from the dynamic{' '}
          <a href="https://models.dev" target="_blank" className="underline text-indigo-500 hover:text-indigo-600" rel="noreferrer">models.dev</a>
          {' '}catalog.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-48" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 py-4 text-center">Gagal memuat AI providers.</p>
        ) : aiProviders.length === 0 && !form ? (
          <p className="text-sm text-slate-400 py-4 text-center">No AI providers configured.</p>
        ) : (
          <div className="grid gap-3">
            {aiProviders.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 truncate">{p.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
                        {PROVIDER_LABELS[p.providerType] || p.providerType}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-1 font-mono">
                      {p.modelId} <span className="text-slate-300">·</span> {p.apiBaseUrl.replace('/v1', '')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {p.isActive ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-slate-300" />}
                  <button onClick={() => deleteMutation.mutate(p.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form tambah provider */}
        {form && (
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Provider Type</label>
                <div className="relative">
                  <select
                    value={form.providerType}
                    onChange={e => setForm(prev => prev ? { ...prev, providerType: e.target.value } : null)}
                    className={selectCls}
                  >
                    {PROVIDER_TYPES.map(t => <option key={t} value={t}>{PROVIDER_LABELS[t]}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Name</label>
                <div className="relative">
                  <select
                    value={isCustomProvider ? 'custom' : form.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className={selectCls}
                  >
                    <option value="" disabled>Pilih Provider...</option>
                    {(catalog?.providers || []).map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    <option value="custom">✍️ Custom Provider (Lainnya)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
            {isCustomProvider && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nama Provider Kustom</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => {
                    const val = e.target.value
                    setCustomName(val)
                    setForm(prev => prev ? { ...prev, name: val } : null)
                  }}
                  placeholder="Contoh: OpenCode Go, Localhost, dll."
                  className={inputCls}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" /> Base URL
                </label>
                <input
                  type="text" value={form.apiBaseUrl}
                  onChange={e => setForm(prev => prev ? { ...prev, apiBaseUrl: e.target.value } : null)}
                  placeholder="https://api.openai.com/v1"
                  className={inputCls} list="settings-base-urls"
                  readOnly={
                    form.name !== '' &&
                    (catalog?.providers || []).some(
                      p => p.name.toLowerCase() === form.name.toLowerCase() || p.id.toLowerCase() === form.name.toLowerCase()
                    )
                  }
                />
                <datalist id="settings-base-urls">
                  {(catalog?.providers || []).map(p => (
                    <option key={p.id} value={p.api} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-slate-400" /> API Key
                </label>
                <input
                  type="password" value={form.apiKey}
                  onChange={e => setForm(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                  placeholder="sk-..." className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Model ID</label>
              <div className="flex gap-2">
                {modelSuggestions.length > 0 ? (
                  <div className="relative flex-1">
                    <select
                      value={isCustomModel ? 'custom' : form.modelId}
                      onChange={e => {
                        const val = e.target.value
                        if (val === 'custom') {
                          setIsCustomModel(true)
                          setCustomModelId('')
                          setForm(prev => prev ? { ...prev, modelId: '' } : null)
                        } else {
                          setIsCustomModel(false)
                          setForm(prev => prev ? { ...prev, modelId: val } : null)
                        }
                      }}
                      className={selectCls}
                    >
                      <option value="" disabled>Pilih Model...</option>
                      {modelSuggestions.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="custom">✍️ Custom Model (Lainnya)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ) : (
                  <input
                    type="text" value={form.modelId}
                    onChange={e => setForm(prev => prev ? { ...prev, modelId: e.target.value } : null)}
                    placeholder="gpt-4o, claude-3-5-sonnet..."
                    className={inputCls}
                  />
                )}
                <Button
                  variant="outline" size="icon"
                  className="h-10 w-10 border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 shrink-0"
                  onClick={fetchLiveModels}
                  disabled={fetchingLiveModels || !form.apiBaseUrl || !form.apiKey}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${fetchingLiveModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {isCustomModel && modelSuggestions.length > 0 && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nama Model Kustom</label>
                <input
                  type="text"
                  value={customModelId}
                  onChange={e => {
                    const val = e.target.value
                    setCustomModelId(val)
                    setForm(prev => prev ? { ...prev, modelId: val } : null)
                  }}
                  placeholder="Ketik model ID (misal: gpt-4-32k)..."
                  className={inputCls}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost" size="sm" className="text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setForm(null)
                  setLiveModels([])
                  setIsCustomProvider(false)
                  setCustomName('')
                  setIsCustomModel(false)
                  setCustomModelId('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!form.name || !form.apiBaseUrl || !form.apiKey || !form.modelId}
                onClick={() => createMutation.mutate(form)}
              >
                Save Provider
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
