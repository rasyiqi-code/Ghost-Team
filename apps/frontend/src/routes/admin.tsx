import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Building2, Calendar, MessageSquare, Settings, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  const user = useAuthStore(s => s.user)

  const { data: workspaces, isLoading: wsLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: () => api.get('/admin/workspaces').then(r => r.workspaces),
    retry: false,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.users),
    retry: false,
  })

  if (!user) return null

  return (
    <div className="flex flex-1 bg-slate-50 min-h-screen overflow-y-auto">
      <div className="flex flex-1 max-w-6xl w-full mx-auto p-8">
        <div className="space-y-6 w-full">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">
              Platform-wide overview — {user.name}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <div className="text-2xl font-bold text-slate-800">
                {wsLoading ? '...' : workspaces?.length ?? 0}
              </div>
              <div className="text-xs text-slate-400">Workspaces</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <div className="text-2xl font-bold text-slate-800">
                {usersLoading ? '...' : users?.length ?? 0}
              </div>
              <div className="text-xs text-slate-400">Users</div>
            </div>
          </div>

          {/* Workspace list */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700">Workspaces</h2>
            </div>
            {wsLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {workspaces?.map((w: { id: string; name: string; owner: { name: string; email: string }; memberCount: number; createdAt: string }) => (
                  <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{w.name}</div>
                      <div className="text-xs text-slate-400">{w.owner.name} · {w.memberCount} members</div>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Quick Links</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-1">
            {[
              { to: '/chat', label: 'Main Chat', icon: MessageSquare },
              { to: '/settings', label: 'Settings', icon: Settings },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <span className="flex items-center gap-2">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
