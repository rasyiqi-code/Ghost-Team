import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, KeyRound } from 'lucide-react'
import { api } from '@/lib/api'
import { useModelsCatalog } from '@/hooks/useModelsCatalog'
import { autoDetectModels } from '@/lib/model-utils'
import { useState } from 'react'

const inputCls = 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-indigo-400'

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

  const handleProviderChange = (name: string) => {
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
          <label className="text-xs font-medium text-slate-500">Pilih / Ketik Provider AI</label>
          <Input
            list="ob-providers"
            placeholder="OpenAI, Anthropic, OpenRouter..."
            value={state.provider}
            onChange={e => handleProviderChange(e.target.value)}
            className={inputCls}
          />
          <datalist id="ob-providers">
            {(catalog?.providers || []).map(p => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Chat Utama</label>
          <Input
            list="ob-chat-models"
            placeholder="gpt-4o, claude-3-5-sonnet..."
            value={state.model}
            onChange={e => onChange({ model: e.target.value })}
            className={inputCls}
          />
          <datalist id="ob-chat-models">
            {fetchedModels.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Embedding</label>
          <Input
            list="ob-embedding-models"
            placeholder="text-embedding-3-small"
            value={state.embeddingModel}
            onChange={e => onChange({ embeddingModel: e.target.value })}
            className={inputCls}
          />
          <datalist id="ob-embedding-models">
            {fetchedModels.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-500">Model Audio (Speech-to-Text)</label>
          <Input
            list="ob-audio-models"
            placeholder="whisper-1"
            value={state.audioModel}
            onChange={e => onChange({ audioModel: e.target.value })}
            className={inputCls}
          />
          <datalist id="ob-audio-models">
            {fetchedModels.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>

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
