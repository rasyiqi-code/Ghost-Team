import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, KeyRound, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useModelsCatalog } from '@/hooks/useModelsCatalog'
import { autoDetectModels } from '@/lib/model-utils'
import { useState } from 'react'

const inputCls = 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-indigo-400'
const selectCls = 'w-full h-10 appearance-none rounded-md border border-slate-200 bg-slate-50 text-slate-900 px-3 pr-8 text-sm focus:outline-none focus:border-slate-300 focus-visible:ring-indigo-400 cursor-pointer transition-all'

interface AIState {
  provider: string
  apiKey: string
  model: string
  embeddingModel: string
  audioModel: string
  baseUrl: string
}

interface Props {
  state: AIState
  onChange: (patch: Partial<AIState>) => void
  fetchedModels: string[]
  onFetchedModels: (models: string[]) => void
}

export function StepAIProvider({ state, onChange, fetchedModels, onFetchedModels }: Props) {
  const { data: catalog = { providers: [] } } = useModelsCatalog()
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  const [customChat, setCustomChat] = useState(false)
  const [customChatId, setCustomChatId] = useState('')
  const [customEmbedding, setCustomEmbedding] = useState(false)
  const [customEmbeddingId, setCustomEmbeddingId] = useState('')
  const [customAudio, setCustomAudio] = useState(false)
  const [customAudioId, setCustomAudioId] = useState('')

  const resetCustomModels = () => {
    setCustomChat(false)
    setCustomChatId('')
    setCustomEmbedding(false)
    setCustomEmbeddingId('')
    setCustomAudio(false)
    setCustomAudioId('')
  }

  const handleProviderChange = (name: string) => {
    resetCustomModels()
    if (name === 'custom') {
      setIsCustom(true)
      setCustomName('')
      onChange({
        provider: '',
        baseUrl: '',
        model: '',
        embeddingModel: '',
        audioModel: '',
      })
      onFetchedModels([])
      return
    }

    setIsCustom(false)
    const matched = (catalog?.providers || []).find(
      p => p.name.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
    )
    if (matched) {
      const detected = autoDetectModels(matched.models || [])
      onFetchedModels(matched.models || [])
      onChange({
        provider: name,
        baseUrl: matched.api || '',
        model: detected.chat,
        embeddingModel: detected.embedding,
        audioModel: detected.audio,
      })
    } else {
      onChange({ provider: name })
    }
  }

  const handleFetchModels = async () => {
    if (!state.apiKey || !state.baseUrl) {
      setFetchError('API Key dan Base URL wajib diisi.')
      return
    }
    setFetching(true)
    setFetchError('')
    try {
      const res = await api.post('/settings/fetch-models', {
        apiKey: state.apiKey,
        baseUrl: state.baseUrl,
      }) as { models: string[] }

      const models = res.models || []
      if (models.length > 0) {
        const detected = autoDetectModels(models)
        onFetchedModels(models)
        onChange({
          model: detected.chat || state.model,
          embeddingModel: detected.embedding || state.embeddingModel,
          audioModel: detected.audio || state.audioModel,
        })
      } else {
        setFetchError('API terkoneksi tetapi tidak mengembalikan daftar model.')
      }
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil daftar model. Periksa API Key dan Base URL.')
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-indigo-600">
        <KeyRound className="h-5 w-5" />
        <h3 className="font-semibold text-slate-800">Hubungkan Otak AI</h3>
      </div>
      <p className="text-xs text-slate-500">
        Konfigurasikan kunci API LLM utama Anda. Ghost Relay membutuhkan ini untuk transkripsi audio, ekstraksi intensi pesan, pencarian ingatan semantik, dan pembuatan laporan harian.
      </p>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Pilih Provider AI</label>
          <div className="relative">
            <select
              value={isCustom ? 'custom' : state.provider}
              onChange={e => handleProviderChange(e.target.value)}
              className={selectCls}
            >
              <option value="" disabled>Pilih Provider...</option>
              {(catalog?.providers || []).map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
              <option value="custom">✍️ Custom Provider (Lainnya)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Chat Utama</label>
          {fetchedModels.length > 0 ? (
            <div className="relative">
              <select
                value={customChat ? 'custom' : state.model}
                onChange={e => {
                  const val = e.target.value
                  if (val === 'custom') {
                    setCustomChat(true)
                    setCustomChatId('')
                    onChange({ model: '' })
                  } else {
                    setCustomChat(false)
                    onChange({ model: val })
                  }
                }}
                className={selectCls}
              >
                <option value="" disabled>Pilih Model...</option>
                {fetchedModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="custom">✍️ Custom Model...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <Input
              placeholder="gpt-4o, claude-3-5-sonnet..."
              value={state.model}
              onChange={e => onChange({ model: e.target.value })}
              className={inputCls}
            />
          )}
        </div>
      </div>

      {isCustom && (
        <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
          <label className="text-xs font-medium text-slate-500">Nama Provider Kustom</label>
          <Input
            placeholder="Contoh: OpenCode Go, Localhost, dll."
            value={customName}
            onChange={e => {
              const val = e.target.value
              setCustomName(val)
              onChange({ provider: val })
            }}
            className={inputCls}
          />
        </div>
      )}

      {customChat && fetchedModels.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
          <label className="text-xs font-medium text-slate-500">Model Chat Kustom</label>
          <Input
            placeholder="Ketik model chat kustom..."
            value={customChatId}
            onChange={e => {
              const val = e.target.value
              setCustomChatId(val)
              onChange({ model: val })
            }}
            className={inputCls}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Embedding</label>
          {fetchedModels.length > 0 ? (
            <div className="relative">
              <select
                value={customEmbedding ? 'custom' : state.embeddingModel}
                onChange={e => {
                  const val = e.target.value
                  if (val === 'custom') {
                    setCustomEmbedding(true)
                    setCustomEmbeddingId('')
                    onChange({ embeddingModel: '' })
                  } else {
                    setCustomEmbedding(false)
                    onChange({ embeddingModel: val })
                  }
                }}
                className={selectCls}
              >
                <option value="" disabled>Pilih Model...</option>
                {fetchedModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="custom">✍️ Custom Model...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <Input
              placeholder="text-embedding-3-small"
              value={state.embeddingModel}
              onChange={e => onChange({ embeddingModel: e.target.value })}
              className={inputCls}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Audio (Speech-to-Text)</label>
          {fetchedModels.length > 0 ? (
            <div className="relative">
              <select
                value={customAudio ? 'custom' : state.audioModel}
                onChange={e => {
                  const val = e.target.value
                  if (val === 'custom') {
                    setCustomAudio(true)
                    setCustomAudioId('')
                    onChange({ audioModel: '' })
                  } else {
                    setCustomAudio(false)
                    onChange({ audioModel: val })
                  }
                }}
                className={selectCls}
              >
                <option value="" disabled>Pilih Model...</option>
                {fetchedModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="custom">✍️ Custom Model...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          ) : (
            <Input
              placeholder="whisper-1"
              value={state.audioModel}
              onChange={e => onChange({ audioModel: e.target.value })}
              className={inputCls}
            />
          )}
        </div>
      </div>

      {customEmbedding && fetchedModels.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
          <label className="text-xs font-medium text-slate-500">Model Embedding Kustom</label>
          <Input
            placeholder="Ketik model embedding kustom..."
            value={customEmbeddingId}
            onChange={e => {
              const val = e.target.value
              setCustomEmbeddingId(val)
              onChange({ embeddingModel: val })
            }}
            className={inputCls}
          />
        </div>
      )}

      {customAudio && fetchedModels.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
          <label className="text-xs font-medium text-slate-500">Model Audio Kustom</label>
          <Input
            placeholder="Ketik model audio kustom..."
            value={customAudioId}
            onChange={e => {
              const val = e.target.value
              setCustomAudioId(val)
              onChange({ audioModel: val })
            }}
            className={inputCls}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500">API Base URL</label>
        <Input
          list="ob-base-urls"
          placeholder="https://api.openai.com/v1"
          value={state.baseUrl}
          onChange={e => onChange({ baseUrl: e.target.value })}
          className={inputCls}
          readOnly={
            state.provider !== '' &&
            (catalog?.providers || []).some(
              p => p.name.toLowerCase() === state.provider.toLowerCase() || p.id.toLowerCase() === state.provider.toLowerCase()
            )
          }
        />
        <datalist id="ob-base-urls">
          {(catalog?.providers || []).map(p => <option key={p.id} value={p.api} />)}
        </datalist>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-500">API Key</label>
        <Input
          type="password"
          placeholder="Masukkan API key rahasia Anda"
          value={state.apiKey}
          onChange={e => onChange({ apiKey: e.target.value })}
          className={inputCls}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleFetchModels}
        disabled={fetching || !state.apiKey || !state.baseUrl}
        className="w-full border-slate-200 bg-slate-50 text-xs font-semibold hover:bg-slate-100 text-slate-800"
      >
        {fetching ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Menghubungkan...</> : '🔍 Hubungkan & Ambil Daftar Model'}
      </Button>

      {fetchError && <p className="text-[10px] text-destructive italic">{fetchError}</p>}
      {fetchedModels.length > 0 && (
        <p className="text-[10px] text-green-600 font-medium">✓ Berhasil memuat {fetchedModels.length} model!</p>
      )}
    </div>
  )
}
