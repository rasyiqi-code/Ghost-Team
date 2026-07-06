import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Brain, Globe, FileText, Settings as SettingsIcon } from 'lucide-react'
import { AIProvidersCard } from '@/components/settings/AIProvidersCard'
import { PlatformsCard } from '@/components/settings/PlatformsCard'
import { DailyReportsCard } from '@/components/settings/DailyReportsCard'
import { SystemConfigCard } from '@/components/settings/SystemConfigCard'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'platforms' | 'reports' | 'system'>('ai')

  const tabs = [
    { id: 'ai', label: 'AI Providers', icon: Brain, description: 'LLM engines catalog' },
    { id: 'platforms', label: 'Connected Platforms', icon: Globe, description: 'Telegram, WhatsApp, Slack' },
    { id: 'reports', label: 'Daily Reports', icon: FileText, description: 'Report cron settings' },
    { id: 'system', label: 'System Configuration', icon: SettingsIcon, description: 'Environment variables' },
  ] as const

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
