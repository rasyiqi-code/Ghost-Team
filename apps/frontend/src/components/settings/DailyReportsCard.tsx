import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, BarChart3, Send, Inbox, Mic, Loader2, Brain, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface DailyStats {
  date: string
  totalMessages: number
  platforms: Record<string, number>
  outboundCount: number
  inboundCount: number
  voiceNotes: number
  summary: string | null
}

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  slack: 'Slack',
  web: 'Web',
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-600 border-green-500/30',
  telegram: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  slack: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  web: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDateID(dateStr: string): string {
  // Parse sebagai UTC agar konsisten dengan formatDate() dan backend
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function DailyReportsCard() {
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()))
  const [reportContent, setReportContent] = useState<string | null>(null)

  const { data: stats, isLoading, isError } = useQuery<DailyStats>({
    queryKey: ['daily-report', selectedDate],
    queryFn: () => api.get(`/reports/daily?date=${selectedDate}`, { silent: true }),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ report: string; messageCount: number }>('/reports/generate'),
    onSuccess: (data) => {
      setReportContent(data.report)
    },
  })

  const changeDay = (delta: number) => {
    // Operasi aritmatika tanggal dalam UTC
    const d = new Date(selectedDate + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + delta)
    setSelectedDate(formatDate(d))
    setReportContent(null)
  }

  const goToday = () => {
    setSelectedDate(formatDate(new Date()))
    setReportContent(null)
  }

  const isToday = selectedDate === formatDate(new Date())

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold flex items-center text-slate-800">
          <FileText className="h-5 w-5 inline mr-2 text-rose-500" />
          Daily Reports
        </h3>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-2">
        <button
          onClick={() => changeDay(-1)}
          className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {formatDateID(selectedDate)}
          </span>
          {!isToday && (
            <button
              onClick={goToday}
              className="text-xs text-indigo-500 hover:text-indigo-600 underline"
            >
              Hari ini
            </button>
          )}
        </div>

        <button
          onClick={() => changeDay(1)}
          disabled={isToday}
          className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
          <AlertCircle className="h-6 w-6" />
          <span className="text-sm">Gagal memuat laporan.</span>
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Summary Bar */}
          {stats.summary && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 leading-relaxed">
              {stats.summary}
            </p>
          )}

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 flex items-center gap-3 border-slate-200">
              <BarChart3 className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-bold text-slate-800">{stats.totalMessages}</p>
              </div>
            </Card>

            <Card className="p-3 flex items-center gap-3 border-slate-200">
              <Send className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Terkirim</p>
                <p className="text-lg font-bold text-slate-800">{stats.outboundCount}</p>
              </div>
            </Card>

            <Card className="p-3 flex items-center gap-3 border-slate-200">
              <Inbox className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Diterima</p>
                <p className="text-lg font-bold text-slate-800">{stats.inboundCount}</p>
              </div>
            </Card>

            <Card className="p-3 flex items-center gap-3 border-slate-200">
              <Mic className="h-5 w-5 text-rose-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Voice Note</p>
                <p className="text-lg font-bold text-slate-800">{stats.voiceNotes}</p>
              </div>
            </Card>
          </div>

          {/* Platform Breakdown */}
          {Object.keys(stats.platforms).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.platforms).map(([platform, count]) => (
                <Badge
                  key={platform}
                  variant="outline"
                  className={'text-xs px-3 py-1 ' + (PLATFORM_COLORS[platform] || 'bg-slate-100 text-slate-600')}
                >
                  {(PLATFORM_LABELS[platform] || platform).toUpperCase()}: {count}
                </Badge>
              ))}
            </div>
          )}

          {/* Empty state jika tidak ada aktivitas */}
          {stats.totalMessages === 0 && !reportContent && (
            <p className="text-sm text-slate-400 text-center py-4">
              Tidak ada aktivitas pada tanggal ini.
            </p>
          )}

          {/* AI Report Generation */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Brain className="h-4 w-4 text-rose-500" />
                AI Summary
              </h4>
              <Button
                size="sm"
                variant="outline"
                disabled={generateMutation.isPending || stats.totalMessages === 0}
                onClick={() => {
                  setReportContent(null)
                  generateMutation.mutate()
                }}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-3.5 w-3.5 mr-1" />
                    Generate AI Summary
                  </>
                )}
              </Button>
            </div>

            {generateMutation.isError && (
              <p className="text-xs text-red-500 mb-2">
                Gagal generate report. Coba lagi.
              </p>
            )}

            {reportContent && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border border-rose-200 p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reportContent}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
