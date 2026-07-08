import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'; import { Brain, Globe, FileText, Settings as SettingsIcon, Link as LinkIcon, Bot,
  MessageSquare, User, Bell, Shield, ArrowRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { AIProvidersCard } from '@/components/settings/AIProvidersCard'
import { PlatformsCard } from '@/components/settings/PlatformsCard'
import { DailyReportsCard } from '@/components/settings/DailyReportsCard'
import { SystemConfigCard } from '@/components/settings/SystemConfigCard'
import { InviteCard } from '@/components/settings/InviteCard'
import { AutoReplyCard } from '@/components/settings/AutoReplyCard'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<'ai' | 'platforms' | 'reports' | 'invite' | 'auto-reply' | 'system'>('ai')

  const tabs = [
    { id: 'ai', label: 'AI Providers', icon: Brain, description: 'Configure AI providers' },
    { id: 'platforms', label: 'Connected Platforms', icon: Globe, description: 'Telegram, WhatsApp, Slack' },
    { id: 'reports', label: 'Daily Reports', icon: FileText, description: 'Report cron settings' },
    { id: 'invite', label: 'Team Invite', icon: LinkIcon, description: 'Share invite link' },
    { id: 'auto-reply', label: 'Auto Reply', icon: Bot, description: 'AI auto-reply toggle' },
    { id: 'system', label: 'System Config', icon: SettingsIcon, description: 'Environment variables' },
  ] as const

  const quickLinks = [
    { to: '/chat', label: 'Main Chat', icon: MessageSquare, description: 'Back to conversations' },
    { to: '/profile', label: 'Profile', icon: User, description: 'Edit name & password' },
    { to: '/notifications', label: 'Notifications', icon: Bell, description: 'View all notifications' },
    ...(user?.role === 'owner' ? [{ to: '/admin' as const, label: 'Admin Dashboard', icon: Shield, description: 'Workspace & user overview' }] : []),
  ]

  return (
    <div className="flex flex-1 bg-slate-50 text-slate-900 min-h-screen overflow-y-auto">
      <div className="flex flex-1 max-w-6xl w-full mx-auto p-8 gap-8">
        
        {/* Left Side: Settings Sidebar */}
        <div className="w-64 shrink-0 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure workspace channels, AI models, daily reports, and credentials.
            </p>
          </div>

          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs">{tab.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{tab.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* Quick Links */}
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quick Links</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <nav className="space-y-1">
              {quickLinks.map(link => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-150 text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 group"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">{link.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">{link.description}</div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-all -ml-1 opacity-0 group-hover:opacity-100 group-hover:ml-0" />
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Right Side: Tab Panel Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'ai' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <AIProvidersCard />
            </div>
          )}
          {activeTab === 'platforms' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <PlatformsCard />
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <DailyReportsCard />
            </div>
          )}
          {activeTab === 'invite' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <InviteCard />
            </div>
          )}
          {activeTab === 'auto-reply' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <AutoReplyCard />
            </div>
          )}
          {activeTab === 'system' && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-200">
              <SystemConfigCard />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
