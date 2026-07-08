import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react'
import { StepWorkspace } from '@/components/onboarding/StepWorkspace'
import { StepPersonalize } from '@/components/onboarding/StepPersonalize'
import { StepInvite } from '@/components/onboarding/StepInvite'
import { StepAIProvider } from '@/components/onboarding/StepAIProvider'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const TOTAL_STEPS = 4

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [workspaceName, setWorkspaceName] = useState('')
  // Step 2
  const [workspacePurpose, setWorkspacePurpose] = useState('Sinkronisasi Tim & Koordinasi Developer')
  const [workspaceContext, setWorkspaceContext] = useState('')
  // Step 4
  const [aiState, setAiState] = useState({
    provider: '', apiKey: '', model: '', embeddingModel: '', audioModel: '', baseUrl: '',
  })
  const [fetchedModels, setFetchedModels] = useState<string[]>([])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post('/settings/onboarding', {
        workspaceName,
        workspacePurpose,
        workspaceContext,
        aiProvider: aiState.provider,
        aiApiKey: aiState.apiKey,
        aiModel: aiState.model,
        aiEmbeddingModel: aiState.embeddingModel,
        aiAudioModel: aiState.audioModel,
        aiBaseUrl: aiState.baseUrl,
      })
      navigate({ to: '/chat' })
    } catch (err) {
      console.error('Onboarding failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const stepComponents: Record<number, React.ReactNode> = {
    1: <StepWorkspace workspaceName={workspaceName} onChange={setWorkspaceName} />,
    2: (
      <StepPersonalize
        purpose={workspacePurpose} context={workspaceContext}
        onPurposeChange={setWorkspacePurpose} onContextChange={setWorkspaceContext}
      />
    ),
    3: <StepInvite />,
    4: (
      <StepAIProvider
        state={aiState}
        onChange={patch => setAiState(prev => ({ ...prev, ...patch }))}
        fetchedModels={fetchedModels}
        onFetchedModels={setFetchedModels}
      />
    ),
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Selamat Datang di Ghost Relay 👻</h1>
          <p className="text-sm text-slate-500 mt-1">Siapkan ruang kerja kolaborasi bertenaga AI Anda</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>Langkah {step} dari {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}% Selesai</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[280px] py-2">{stepComponents[step]}</div>

        {/* Navigation */}
        <div className="border-t border-slate-100 pt-6 flex justify-between gap-4 mt-6">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="border-slate-200 text-slate-500 hover:bg-slate-100"
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </Button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !workspaceName}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium ml-auto"
            >
              Lanjutkan <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !aiState.apiKey}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold ml-auto"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Memproses...</> : <>Selesaikan Setup <Check className="h-4 w-4 ml-2" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
