import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, Globe, Key, Plus, Trash2, CheckCircle, XCircle, RefreshCw, ChevronDown, Zap, AlertTriangle, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { useModelsCatalog } from '@/hooks/useModelsCatalog'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
    queryFn: () => api.get('/ai/providers/models', { silent: true }),
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

  const [userRole, setUserRole] = useState<string>('')
  useEffect(() => {
    api.get<{ role: string }>('/admin/check', { silent: true })
      .then(r => setUserRole(r.role))
      .catch(() => {})
  }, [])

  const createMutation = useMutation({
    mutationFn: (data: AIProviderForm) => api.post('/ai/providers', {
      provider_type: data.providerType,
      name: data.name,
      api_base_url: data.apiBaseUrl,
      api_key: data.apiKey,
      model_id: data.modelId,
      scope: data.scope,
    }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menghapus provider.')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; model_id?: string; api_base_url?: string; scope?: string } }) =>
      api.put(`/ai/providers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
      setEditing(null)
    },
  })

  const [deleteTarget, setDeleteTarget] = useState<AIProvider | null>(null)
  const [editing, setEditing] = useState<AIProvider | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; modelId: string; apiBaseUrl: string; scope: string }>({ name: '', modelId: '', apiBaseUrl: '', scope: 'personal' })

  const [testingProviderId, setTestingProviderId] = useState<number | null>(null)
  const [testingForm, setTestingForm] = useState(false)

  const testProviderConnection = async (p: AIProvider) => {
    setTestingProviderId(p.id)
    try {
      const res = await api.post<{ status: string; models?: string[]; modelsCount?: number; detail?: string }>('/ai/providers/test', {
        api_base_url: p.apiBaseUrl,
        api_key: p.apiKey,
        name: p.name,
        model_id: p.modelId,
      })
      if (res.status === 'ok') {
        alert(`Koneksi sukses! Berhasil terhubung ke provider "${p.name}". Ditemukan ${res.modelsCount ?? res.models?.length ?? 0} model.`)
      } else {
        alert(`Koneksi gagal: ${res.detail || 'Kredensial tidak valid.'}`)
      }
    } catch (e: any) {
      alert(`Error koneksi: ${e.message || 'Gagal terhubung ke provider.'}`)
    } finally {
      setTestingProviderId(null)
    }
  }

  const testFormConnection = async () => {
    if (!form || !form.apiBaseUrl || !form.apiKey) return
    setTestingForm(true)
    try {
      const res = await api.post<{ status: string; models?: string[]; modelsCount?: number; detail?: string }>('/ai/providers/test', {
        api_base_url: form.apiBaseUrl,
        api_key: form.apiKey,
        name: form.name,
        model_id: form.modelId,
      })
      if (res.status === 'ok') {
        alert(`Koneksi sukses! Berhasil terhubung ke provider "${form.name}". Ditemukan ${res.modelsCount ?? res.models?.length ?? 0} model.`)
        if (res.models && res.models.length > 0) {
          setLiveModels(res.models)
        }
      } else {
        alert(`Koneksi gagal: ${res.detail || 'Kredensial tidak valid.'}`)
      }
    } catch (e: any) {
      alert(`Error koneksi: ${e.message || 'Gagal terhubung ke provider.'}`)
    } finally {
      setTestingForm(false)
    }
  }

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
      ? { ...prev, name, apiBaseUrl: matched?.api || '', modelId: matched?.models?.[0] || prev.modelId }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold flex items-center text-slate-800">
            <Brain className="h-5 w-5 inline mr-2 text-indigo-500" />
            AI Providers
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure LLM providers from the dynamic{' '}
            <a href="https://models.dev" target="_blank" className="underline text-indigo-500 hover:text-indigo-600" rel="noreferrer">models.dev</a>
            {' '}catalog.
          </p>
        </div>
        <Button
          variant="outline" size="sm"
          className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => {
            setForm({ providerType: 'chat', name: '', apiBaseUrl: '', apiKey: '', modelId: '', scope: 'personal' })
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

      <div className="pt-2">
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
                      {p.scope === 'workspace' && (
                        <Badge variant="secondary" className="text-[9px] uppercase rounded px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">
                          Team
                        </Badge>
                      )}
                      {p.scope === 'global' && (
                        <Badge variant="secondary" className="text-[9px] uppercase rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Global
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-1 font-mono">
                      {p.modelId} <span className="text-slate-300">·</span> {p.apiBaseUrl.replace('/v1', '')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => testProviderConnection(p)}
                    disabled={testingProviderId !== null}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shrink-0"
                    title="Test Koneksi Provider"
                  >
                    <Zap className={`h-4 w-4 ${testingProviderId === p.id ? 'animate-bounce text-amber-500' : ''}`} />
                  </button>
                  {p.isActive ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-slate-300 shrink-0" />}
                  {(p.scope === 'personal' || userRole === 'owner') && (
                    <button
                      onClick={() => {
                        setEditing(p)
                        setEditForm({ name: p.name, modelId: p.modelId, apiBaseUrl: p.apiBaseUrl, scope: p.scope })
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                      title="Edit Provider"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {(p.scope === 'personal' || userRole === 'owner') && (
                    <button
                      onClick={() => setDeleteTarget(p)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Hapus Provider"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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
                <SearchableSelect
                  value={isCustomProvider ? 'custom' : form.name}
                  onChange={handleNameChange}
                  options={(catalog?.providers || []).map(p => p.name)}
                  placeholder="Pilih atau cari provider..."
                  customOptionLabel="✍️ Custom Provider (Lainnya)"
                  onCustomSelect={() => handleNameChange('custom')}
                />
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
                  <div className="flex-1">
                    <SearchableSelect
                      value={isCustomModel ? 'custom' : form.modelId}
                      onChange={val => {
                        if (val === 'custom') {
                          setIsCustomModel(true)
                          setCustomModelId('')
                          setForm(prev => prev ? { ...prev, modelId: '' } : null)
                        } else {
                          setIsCustomModel(false)
                          setForm(prev => prev ? { ...prev, modelId: val } : null)
                        }
                      }}
                      options={modelSuggestions}
                      placeholder="Pilih atau cari model..."
                      customOptionLabel="✍️ Custom Model (Lainnya)"
                      onCustomSelect={() => {
                        setIsCustomModel(true)
                        setCustomModelId('')
                        setForm(prev => prev ? { ...prev, modelId: '' } : null)
                      }}
                    />
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
            {userRole === 'owner' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Scope</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio" name="scope"
                      checked={form.scope === 'personal'}
                      onChange={() => setForm(prev => prev ? { ...prev, scope: 'personal' } : null)}
                    />
                    Personal
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio" name="scope"
                      checked={form.scope === 'global'}
                      onChange={() => setForm(prev => prev ? { ...prev, scope: 'global' } : null)}
                    />
                    Global
                  </label>
                </div>
              </div>
            )}
            {userRole !== 'owner' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Scope</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio" name="scope"
                      checked={form.scope === 'personal'}
                      onChange={() => setForm(prev => prev ? { ...prev, scope: 'personal' } : null)}
                    />
                    Personal
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio" name="scope"
                      checked={form.scope === 'workspace'}
                      onChange={() => setForm(prev => prev ? { ...prev, scope: 'workspace' } : null)}
                    />
                    Share with Team
                  </label>
                </div>
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
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                disabled={testingForm || !form.apiBaseUrl || !form.apiKey}
                onClick={testFormConnection}
              >
                <Zap className={`h-3.5 w-3.5 mr-1.5 ${testingForm ? 'animate-bounce text-amber-500' : 'text-amber-500'}`} />
                {testingForm ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!form.name || !form.apiBaseUrl || !form.apiKey || !form.modelId || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                Save Provider
              </Button>
            </div>
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Provider</DialogTitle>
              <DialogDescription>Update {editing?.name} configuration</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Name</label>
                <input
                  type="text" value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Base URL</label>
                <input
                  type="text" value={editForm.apiBaseUrl}
                  onChange={e => setEditForm(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Model ID</label>
                <input
                  type="text" value={editForm.modelId}
                  onChange={e => setEditForm(prev => ({ ...prev, modelId: e.target.value }))}
                  className={inputCls}
                />
              </div>
              {userRole === 'owner' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Scope</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio" name="edit-scope"
                        checked={editForm.scope === 'personal'}
                        onChange={() => setEditForm(prev => ({ ...prev, scope: 'personal' }))}
                      />
                      Personal
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio" name="edit-scope"
                        checked={editForm.scope === 'global'}
                        onChange={() => setEditForm(prev => ({ ...prev, scope: 'global' }))}
                      />
                      Global
                    </label>
                  </div>
                </div>
              )}
              {userRole !== 'owner' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Scope</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio" name="edit-scope"
                        checked={editForm.scope === 'personal'}
                        onChange={() => setEditForm(prev => ({ ...prev, scope: 'personal' }))}
                      />
                      Personal
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="radio" name="edit-scope"
                        checked={editForm.scope === 'workspace'}
                        onChange={() => setEditForm(prev => ({ ...prev, scope: 'workspace' }))}
                      />
                      Share with Team
                    </label>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={updateMutation.isPending || !editForm.name || !editForm.apiBaseUrl || !editForm.modelId}
                onClick={() => editing && updateMutation.mutate({ id: editing.id, data: { name: editForm.name, model_id: editForm.modelId, api_base_url: editForm.apiBaseUrl, scope: editForm.scope } })}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Delete Provider?
              </DialogTitle>
              <DialogDescription>
                Permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.modelId}).
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
