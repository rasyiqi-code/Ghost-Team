import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, MessageSquare, BookOpen, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'

export function AutoReplyCard() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ['auto-reply'],
    queryFn: () => api.get('/settings/auto-reply', { silent: true }),
  })

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => api.post('/settings/auto-reply', { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reply'] })
    },
  })

  const enabled = data?.enabled ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold flex items-center text-slate-800">
            <Bot className="h-5 w-5 inline mr-2 text-indigo-500" />
            AI Auto Reply
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Balas otomatis pesan dari Telegram, WhatsApp, dan Slack menggunakan AI dengan konteks dari chat history dan Knowledge Vault.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Toggle Card */}
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${enabled ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                  <Sparkles className={`h-5 w-5 ${enabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Auto Reply {enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {enabled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    {enabled
                      ? 'AI akan otomatis merespons pesan masuk yang relevan dengan konteks dari histori chat dan dokumen di Knowledge Vault.'
                      : 'Aktifkan untuk mengizinkan AI membalas pesan secara otomatis berdasarkan konteks yang tersedia.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleMutation.mutate(!enabled)}
                disabled={toggleMutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                {toggleMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white mx-auto" />
                ) : (
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Chat Memory</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mencari percakapan serupa dari histori chat untuk memberikan konteks percakapan yang relevan.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Knowledge Vault</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mencari dokumen dan file yang relevan dari Knowledge Vault untuk menjawab pertanyaan dengan akurat.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Bagaimana Cara Kerjanya?</h4>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Pesan Masuk', desc: 'Pesan baru dari Telegram, WhatsApp, atau Slack diterima oleh webhook.' },
                { step: '2', title: 'Semantic Search', desc: 'Pesan di-embedding ke vector, lalu dicari kecocokan di chat memory dan Knowledge Vault.' },
                { step: '3', title: 'AI Generate', desc: 'Jika ditemukan konteks relevan (similarity ≥ 60%), AI menghasilkan jawaban berdasarkan konteks tersebut.' },
                { step: '4', title: 'Kirim Balasan', desc: 'Jawaban dikirim kembali ke platform asal, lengkap dengan sumber referensi.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                    {item.step}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-700">{item.title}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
