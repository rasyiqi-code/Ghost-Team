import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings as SettingsIcon, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface EnvSetting {
  key: string
  value: string
  source: string
}

export function SystemConfigCard() {
  const queryClient = useQueryClient()

  const { data: envSettings = [], isLoading, isError } = useQuery<EnvSetting[]>({
    queryKey: ['env-settings'],
    queryFn: () => api.get('/settings/env', { silent: true }),
  })

  const [envEdits, setEnvEdits] = useState<Record<string, string>>({})

  const updateMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) => api.post('/settings/env', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['env-settings'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api.delete(`/settings/env/${key}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['env-settings'] }),
  })

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800">
          <SettingsIcon className="h-5 w-5 text-violet-500" />
          <span className="text-lg font-bold">System Config</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Override dynamic server environment variables. Database overrides take precedence over .env values.
        </p>
      </div>
      <div className="pt-2">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-red-500 py-4 text-center">Gagal memuat konfigurasi sistem.</p>
        ) : (
          <div className="space-y-3">
            {envSettings.map(env => (
              <div key={env.key} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-xs font-mono font-semibold text-slate-500 w-44 shrink-0 truncate" title={env.key}>
                  {env.key}
                </span>
                <input
                  className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 transition-colors"
                  placeholder={env.value || env.key}
                  defaultValue={envEdits[env.key] ?? env.value}
                  onChange={e => setEnvEdits(prev => ({ ...prev, [env.key]: e.target.value }))}
                  onBlur={e => {
                    if (e.target.value !== env.value) {
                      updateMutation.mutate({ key: env.key, value: e.target.value })
                    }
                  }}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-[9px] uppercase font-bold tracking-wider rounded-md px-1.5 py-0.5 border ${
                    env.source === 'db'
                      ? 'bg-violet-50 text-violet-600 border-violet-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {env.source}
                  </Badge>
                  {env.source === 'db' && (
                    <button
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                      onClick={() => deleteMutation.mutate(env.key)}
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
      </div>
    </div>
  )
}
