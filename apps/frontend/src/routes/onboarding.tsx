import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles, Users, Briefcase, KeyRound, Copy } from 'lucide-react'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: catalog = { providers: [] } } = useQuery<{
    providers: { id: string; name: string; api: string; models: string[] }[]
  }>({
    queryKey: ['models-catalog'],
    queryFn: () => api.get('/settings/models-catalog'),
    staleTime: 24 * 3600 * 1000 // 24 hours
  })

  // Form State
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspacePurpose, setWorkspacePurpose] = useState('Sinkronisasi Tim & Koordinasi Developer')
  const [workspaceContext, setWorkspaceContext] = useState('')
  const [invitedEmailsStr, setInvitedEmailsStr] = useState('')
  const [aiProvider, setAiProvider] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiEmbeddingModel, setAiEmbeddingModel] = useState('')
  const [aiAudioModel, setAiAudioModel] = useState('')
  const [aiBaseUrl, setAiBaseUrl] = useState('')

  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchModelsError, setFetchModelsError] = useState('')

  const totalSteps = 4

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/login?invite=true')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFetchModels = async () => {
    if (!aiApiKey || !aiBaseUrl) {
      setFetchModelsError('API Key dan Base URL wajib diisi.')
      return
    }
    setFetchingModels(true)
    setFetchModelsError('')
    try {
      const res = await api.post('/settings/fetch-models', {
        apiKey: aiApiKey,
        baseUrl: aiBaseUrl,
      }) as { models: string[] }
      
      const models = res.models || []
      setFetchedModels(models)
      
      if (models.length > 0) {
        // Try to auto-detect model presets
        const chat = models.find(m => m.includes('gpt-4') || m.includes('claude') || m.includes('qwen') || m.includes('deepseek') || m.includes('chat') || m.includes('instruct'))
        if (chat) setAiModel(chat)
        
        const embed = models.find(m => m.includes('embed') || m.includes('ada'))
        if (embed) setAiEmbeddingModel(embed)
        
        const audio = models.find(m => m.includes('whisper') || m.includes('audio') || m.includes('speech'))
        if (audio) setAiAudioModel(audio)
      } else {
        setFetchModelsError('API terkoneksi tetapi tidak mengembalikan daftar model.')
      }
    } catch (err: any) {
      setFetchModelsError(err.message || 'Gagal mengambil daftar model. Periksa API Key dan Base URL.')
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const invitedEmails = invitedEmailsStr
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0)

      await api.post('/settings/onboarding', {
        workspaceName,
        workspacePurpose,
        workspaceContext,
        invitedEmails,
        aiProvider,
        aiApiKey,
        aiModel,
        aiEmbeddingModel,
        aiAudioModel,
        aiBaseUrl,
      })
      
      // Redirect to chat after successful onboarding
      navigate({ to: '/chat' })
    } catch (err) {
      console.error('Onboarding failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black px-4 py-12 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl shadow-2xl">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Selamat Datang di Ghost Relay 👻
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Siapkan ruang kerja kolaborasi bertenaga AI Anda
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>Langkah {step} dari {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% Selesai</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[280px] py-2">
          
          {/* STEP 1: Create Workspace */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-primary">
                <Briefcase className="h-5 w-5" />
                <h3 className="font-semibold text-white">Buat Workspace Baru</h3>
              </div>
              <p className="text-xs text-slate-400">
                Workspace adalah wadah kolaborasi utama untuk menyatukan percakapan dari WhatsApp, Telegram, Slack, dan mengintegrasikan agen AI Anda.
              </p>
              <div className="space-y-2 mt-4">
                <label className="text-xs font-medium text-slate-300">Nama Workspace</label>
                <Input
                  placeholder="Contoh: Tim Developer Ghost, Startup Alpha, dll."
                  value={workspaceName}
                  onChange={e => setWorkspaceName(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Personalization & Purpose */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-semibold text-white">Personalisasi Ruang Kerja</h3>
              </div>
              <p className="text-xs text-slate-400">
                Bantu AI kami memahami tujuan workspace Anda agar hasil ekstraksi rangkuman audio dan pembuatan laporan harian menjadi jauh lebih akurat.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Fokus / Tujuan Utama</label>
                <select
                  value={workspacePurpose}
                  onChange={e => setWorkspacePurpose(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-800 bg-slate-950/60 px-3 text-sm text-white focus-visible:ring-primary outline-none"
                >
                  <option value="Sinkronisasi Tim & Koordinasi Developer">💻 Sinkronisasi Tim & Koordinasi Developer</option>
                  <option value="Manajemen Proyek Kreatif & Desain">🎨 Manajemen Proyek Kreatif & Desain</option>
                  <option value="Operasional Bisnis & Customer Support">📞 Operasional Bisnis & Customer Support</option>
                  <option value="Lainnya / Umum">🚀 Lainnya / Umum</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Konteks Pekerjaan / Deskripsi Proyek</label>
                <textarea
                  placeholder="Jelaskan secara singkat proyek atau tugas yang sedang dikerjakan agar AI dapat memahaminya (misal: 'Sedang mendevelomp MVP platform Ghost Relay untuk peluncuran minggu depan')."
                  value={workspaceContext}
                  onChange={e => setWorkspaceContext(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs text-white focus-visible:ring-primary outline-none resize-none placeholder-slate-600"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <h3 className="font-semibold text-white">Undang Rekan Tim</h3>
              </div>
              <p className="text-xs text-slate-400">
                Undang rekan kerja Anda untuk bergabung ke dalam dashboard Ghost Relay ini guna memantau riwayat obrolan tim bersama-sama.
              </p>
              
              <div className="space-y-2 mt-4">
                <label className="text-xs font-medium text-slate-300">Alamat Email Anggota (pisahkan dengan koma)</label>
                <Input
                  placeholder="budi@example.com, citra@example.com"
                  value={invitedEmailsStr}
                  onChange={e => setInvitedEmailsStr(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-slate-300">Atau kirim tautan registrasi instan</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={window.location.origin + '/login'}
                    className="bg-slate-950/60 border-slate-800 text-slate-400 select-all"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} className="border-slate-800 text-slate-300 shrink-0 hover:bg-slate-800">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copied && <span className="text-[10px] text-green-500">Tautan berhasil disalin!</span>}
              </div>
            </div>
          )}

          {/* STEP 4: AI Provider & Model */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <h3 className="font-semibold text-white">Hubungkan Otak AI</h3>
              </div>
              <p className="text-xs text-slate-400">
                Konfigurasikan kunci API LLM utama Anda. Ghost Relay membutuhkan ini untuk transkripsi audio, ekstraksi intensi pesan, pencarian ingatan semantik, dan pembuatan laporan harian.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Pilih / Ketik Provider AI</label>
                  <Input
                    list="providers"
                    placeholder="Contoh: OpenAI, Anthropic, OpenRouter, dsb."
                    value={aiProvider}
                    onChange={e => {
                      const p = e.target.value
                      setAiProvider(p)
                      
                      // Check models.dev catalog
                      const matched = (catalog?.providers || []).find(
                        prov => prov.name.toLowerCase() === p.toLowerCase() || prov.id.toLowerCase() === p.toLowerCase()
                      )
                      
                      if (matched) {
                        setAiBaseUrl(matched.api || '')
                        setFetchedModels(matched.models || [])
                        
                        // Auto-detect models from catalog models list
                        const chat = matched.models.find(m => m.includes('gpt-4') || m.includes('claude') || m.includes('qwen') || m.includes('deepseek') || m.includes('chat') || m.includes('instruct'))
                        if (chat) setAiModel(chat)
                        
                        const embed = matched.models.find(m => m.includes('embed') || m.includes('ada'))
                        if (embed) setAiEmbeddingModel(embed)
                        
                        const audio = matched.models.find(m => m.includes('whisper') || m.includes('audio') || m.includes('speech'))
                        if (audio) setAiAudioModel(audio)
                      }
                    }}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                  />
                  <datalist id="providers">
                    {(catalog?.providers || []).map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Model Chat Utama</label>
                  <Input
                    list="chat-models"
                    placeholder="gpt-4o, claude-3-5-sonnet, dll."
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Model Embedding</label>
                  <Input
                    list="embedding-models"
                    placeholder="text-embedding-3-small"
                    value={aiEmbeddingModel}
                    onChange={e => setAiEmbeddingModel(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Model Audio (Speech-to-Text)</label>
                  <Input
                    list="audio-models"
                    placeholder="whisper-1"
                    value={aiAudioModel}
                    onChange={e => setAiAudioModel(e.target.value)}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">API Base URL</label>
                <Input
                  list="base-urls"
                  placeholder="https://api.openai.com/v1"
                  value={aiBaseUrl}
                  onChange={e => setAiBaseUrl(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                />
                <datalist id="base-urls">
                  {(catalog?.providers || []).map(p => (
                    <option key={p.id} value={p.api} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">API Key</label>
                <Input
                  type="password"
                  placeholder="Masukkan API key rahasia Anda"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchModels}
                  disabled={fetchingModels || !aiApiKey || !aiBaseUrl}
                  className="w-full border-slate-850 bg-slate-950/40 text-xs font-semibold hover:bg-slate-800 text-slate-200"
                >
                  {fetchingModels ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Menghubungkan...
                    </>
                  ) : (
                    '🔍 Hubungkan & Ambil Daftar Model'
                  )}
                </Button>
              </div>

              {fetchModelsError && (
                <p className="text-[10px] text-destructive italic">{fetchModelsError}</p>
              )}
              {fetchedModels.length > 0 && (
                <p className="text-[10px] text-green-500 font-medium">✓ Berhasil memuat {fetchedModels.length} model! Pilih dari dropdown input model di atas.</p>
              )}

              {/* Datalists for custom autocomplete */}
              <datalist id="chat-models">
                {fetchedModels.map(m => <option key={m} value={m} />)}
              </datalist>
              <datalist id="embedding-models">
                {fetchedModels.map(m => <option key={m} value={m} />)}
              </datalist>
              <datalist id="audio-models">
                {fetchedModels.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="border-t border-white/5 pt-6 flex justify-between gap-4 mt-6">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={prevStep}
              className="border-slate-850 text-slate-300 hover:bg-slate-800"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={step === 1 && !workspaceName}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium ml-auto"
            >
              Lanjutkan <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !aiApiKey}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses...
                </>
              ) : (
                <>
                  Selesaikan Setup <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
