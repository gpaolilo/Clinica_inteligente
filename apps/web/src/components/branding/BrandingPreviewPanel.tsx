import React, { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { BrandSettings } from '../../lib/brandingService'
import {
  StudentLoginPreview,
  StudentDashboardPreview,
  TeacherDashboardPreview,
  BookingPagePreview
} from './Previews'

interface BrandingPreviewPanelProps {
  settings: BrandSettings
}

type PreviewTab = 'login' | 'student-dash' | 'teacher-dash' | 'booking'

export const BrandingPreviewPanel: React.FC<BrandingPreviewPanelProps> = ({ settings }) => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('login')
  const [isMobile, setIsMobile] = useState(false)

  const tabs = [
    { id: 'login', label: 'Login Aluno' },
    { id: 'student-dash', label: 'Dashboard Aluno' },
    { id: 'teacher-dash', label: 'Dashboard Professor' },
    { id: 'booking', label: 'Agendamento' }
  ] as const

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px]">
      {/* Top Header do Painel */}
      <div className="bg-slate-50 border-b border-slate-200/60 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
        {/* Abas */}
        <div className="flex gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = activeTab === t.id
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Toggles de Sizing */}
        <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobile(false)}
            className={`p-1.5 rounded-md transition-all ${!isMobile ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="Visualização Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsMobile(true)}
            className={`p-1.5 rounded-md transition-all ${isMobile ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            title="Visualização Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Box de Visualização Simulado */}
      <div className="flex-1 bg-slate-100/70 p-6 flex items-center justify-center overflow-hidden relative">
        <div 
          className={`h-full bg-white transition-all duration-300 overflow-hidden relative ${
            isMobile 
              ? 'w-[360px] rounded-[36px] border-[8px] border-slate-900 shadow-2xl h-[95%]' 
              : 'w-full rounded-xl border border-slate-200/50 shadow-sm'
          }`}
        >
          {activeTab === 'login' && <StudentLoginPreview settings={settings} isMobile={isMobile} />}
          {activeTab === 'student-dash' && <StudentDashboardPreview settings={settings} isMobile={isMobile} />}
          {activeTab === 'teacher-dash' && <TeacherDashboardPreview settings={settings} isMobile={isMobile} />}
          {activeTab === 'booking' && <BookingPagePreview settings={settings} isMobile={isMobile} />}
        </div>
      </div>
    </div>
  )
}
