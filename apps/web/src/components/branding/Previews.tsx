import React from 'react'
import { BrandSettings } from '../../lib/brandingService'

interface PreviewProps {
  settings: BrandSettings
  isMobile: boolean
}

// Helpers de Estilização Dinâmica no Simulador
const getBtnRadius = (style: string) => {
  if (style === 'Pill') return '9999px'
  if (style === 'Sharp') return '0px'
  if (style === 'Soft') return '16px'
  return '12px'
}

const getCardStyle = (settings: BrandSettings) => {
  const isDark = settings.theme_mode === 'dark'
  const style = settings.card_style
  
  let radius = '24px'
  if (style === 'Minimal') radius = '16px'
  else if (style === 'Elevated') radius = '24px'
  else if (style === 'Glass') radius = '24px'
  else if (style === 'Bordered') radius = '12px'

  let shadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
  let borderColor = isDark ? '#334155' : '#e2e8f0'
  let borderWidth = '1px'
  let bg = isDark ? '#1e293b' : '#ffffff'
  let backdropBlur = '0px'

  if (style === 'Minimal') {
    shadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  } else if (style === 'Elevated') {
    shadow = isDark 
      ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
      : '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
    borderWidth = '0px'
  } else if (style === 'Glass') {
    shadow = isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' : '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
    borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)'
    bg = isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.65)'
    backdropBlur = '16px'
  } else if (style === 'Bordered') {
    shadow = 'none'
    borderColor = settings.primary_color
    borderWidth = '2px'
  }

  return {
    borderRadius: radius,
    backgroundColor: bg,
    borderColor: borderColor,
    borderWidth: borderWidth,
    borderStyle: 'solid',
    boxShadow: shadow,
    backdropFilter: backdropBlur !== '0px' ? `blur(${backdropBlur})` : undefined,
    WebkitBackdropFilter: backdropBlur !== '0px' ? `blur(${backdropBlur})` : undefined,
    color: isDark ? '#f8fafc' : settings.text_color,
    transition: 'all 0.3s ease'
  } as React.CSSProperties
}

const getButtonStyle = (settings: BrandSettings, isPrimary = true) => {
  return {
    borderRadius: getBtnRadius(settings.button_style),
    backgroundColor: isPrimary ? settings.primary_color : settings.secondary_color,
    color: '#ffffff',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  } as React.CSSProperties
}

const getContainerStyle = (settings: BrandSettings) => {
  const isDark = settings.theme_mode === 'dark'
  return {
    backgroundColor: settings.background_color || (isDark ? '#0f172a' : '#f8fafc'),
    color: isDark ? '#f1f5f9' : settings.text_color,
    fontFamily: 'sans-serif'
  } as React.CSSProperties
}

const getHeaderStyle = (settings: BrandSettings) => {
  const isDark = settings.theme_mode === 'dark'
  return {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    color: isDark ? '#f1f5f9' : settings.text_color
  } as React.CSSProperties
}

// -------------------------------------------------------------------
// SVG Charts Mockups (Dynamic Brand Colors)
// -------------------------------------------------------------------

const TimelineChartMockup: React.FC<{ primaryColor: string; secondaryColor: string; isDark: boolean }> = ({ primaryColor, secondaryColor, isDark }) => {
  return (
    <svg viewBox="0 0 300 120" className="w-full h-full">
      {/* Grid lines */}
      <line x1="20" y1="20" x2="280" y2="20" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="50" x2="280" y2="50" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="80" x2="280" y2="80" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="100" x2="280" y2="100" stroke={isDark ? "#475569" : "#e2e8f0"} strokeWidth="1" />
      
      {/* Fluency Line (secondary color) */}
      <path
        d="M 20 85 Q 80 60 140 70 T 260 30"
        fill="none"
        stroke={secondaryColor || "#84cc16"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="260" cy="30" r="3.5" fill={secondaryColor || "#84cc16"} />

      {/* Confidence Line (primary color) */}
      <path
        d="M 20 95 Q 80 75 140 50 T 260 40"
        fill="none"
        stroke={primaryColor || "#8b5cf6"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="260" cy="40" r="3.5" fill={primaryColor || "#8b5cf6"} />

      {/* Dates labels */}
      <text x="20" y="113" fill="#94a3b8" fontSize="7" fontWeight="bold">01/Mai</text>
      <text x="140" y="113" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">15/Mai</text>
      <text x="260" y="113" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="end">30/Mai</text>
    </svg>
  )
}

const RadarChartMockup: React.FC<{ primaryColor: string; isDark: boolean }> = ({ primaryColor, isDark }) => {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full max-h-[105px] mx-auto">
      {/* Pentagon grids */}
      <polygon points="60,10 108,45 89,100 31,100 12,45" fill="none" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" />
      <polygon points="60,25 96,51 82,92 38,92 24,51" fill="none" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" />
      <polygon points="60,40 84,58 74,84 46,84 36,58" fill="none" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" />
      <polygon points="60,55 72,64 68,76 52,76 48,64" fill="none" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" />
      
      {/* Center axis lines */}
      <line x1="60" y1="60" x2="60" y2="10" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2" />
      <line x1="60" y1="60" x2="108" y2="45" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2" />
      <line x1="60" y1="60" x2="89" y2="100" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2" />
      <line x1="60" y1="60" x2="31" y2="100" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2" />
      <line x1="60" y1="60" x2="12" y2="45" stroke={isDark ? "#334155" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2" />

      {/* Skills Area */}
      <polygon
        points="60,20 98,48 78,88 40,84 20,49"
        fill={primaryColor || "#8b5cf6"}
        fillOpacity="0.4"
        stroke={primaryColor || "#8b5cf6"}
        strokeWidth="1.5"
      />

      {/* Axis text labels */}
      <text x="60" y="8" fill="#94a3b8" fontSize="6" fontWeight="bold" textAnchor="middle">Fluência</text>
      <text x="111" y="47" fill="#94a3b8" fontSize="6" fontWeight="bold" textAnchor="start">Confiança</text>
      <text x="92" y="108" fill="#94a3b8" fontSize="6" fontWeight="bold" textAnchor="start">Compreensão</text>
      <text x="28" y="108" fill="#94a3b8" fontSize="6" fontWeight="bold" textAnchor="end">Vocabulário</text>
      <text x="9" y="47" fill="#94a3b8" fontSize="6" fontWeight="bold" textAnchor="end">Gramática</text>
    </svg>
  )
}

const RevenueChartMockup: React.FC<{ primaryColor: string; isDark: boolean }> = ({ primaryColor, isDark }) => {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      {/* Grid lines */}
      <line x1="20" y1="20" x2="190" y2="20" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="50" x2="190" y2="50" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="80" x2="190" y2="80" stroke={isDark ? "#334155" : "#f1f5f9"} strokeWidth="1" />
      <line x1="20" y1="100" x2="190" y2="100" stroke={isDark ? "#475569" : "#e2e8f0"} strokeWidth="1" />
      
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primaryColor || "#6366f1"} stopOpacity="0.4" />
          <stop offset="100%" stopColor={primaryColor || "#6366f1"} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Area filled path */}
      <path
        d="M 20 100 L 20 88 Q 54 75 88 58 T 156 32 L 190 25 L 190 100 Z"
        fill="url(#areaGrad)"
      />

      {/* Stroke path */}
      <path
        d="M 20 88 Q 54 75 88 58 T 156 32 L 190 25"
        fill="none"
        stroke={primaryColor || "#6366f1"}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="190" cy="25" r="3.5" fill={primaryColor || "#6366f1"} />

      {/* Labels */}
      <text x="20" y="112" fill="#94a3b8" fontSize="7" fontWeight="bold">D1</text>
      <text x="88" y="112" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">D15</text>
      <text x="190" y="112" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="end">D30</text>
    </svg>
  )
}

// -------------------------------------------------------------------
// Previews Rendering Components
// -------------------------------------------------------------------

// 1. Simulação: Login do Aluno
export const StudentLoginPreview: React.FC<PreviewProps> = ({ settings }) => {
  const isDark = settings.theme_mode === 'dark'
  const bgStyle = settings.login_background_url
    ? { backgroundImage: `url(${settings.login_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${settings.primary_color}1a, ${settings.secondary_color}2b)` }

  return (
    <div 
      className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ ...bgStyle, backgroundColor: settings.background_color }}
    >
      <div 
        className="w-full max-w-sm p-6 relative z-10"
        style={getCardStyle(settings)}
      >
        {/* Logo da Academia */}
        <div className="flex flex-col items-center text-center mb-6">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-10 object-contain mb-3 max-w-[140px]" />
          ) : (
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white mb-3" 
              style={{ backgroundColor: settings.primary_color }}
            >
              {settings.app_name?.charAt(0) || 'A'}
            </div>
          )}
          <h2 className="text-lg font-bold truncate max-w-full" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
            {settings.app_name || 'Minha Academia'}
          </h2>
          <p className="text-xs mt-1 max-w-[240px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {settings.login_message || 'Bem-vindo ao Portal de Ensino'}
          </p>
        </div>

        {/* Inputs Simulados */}
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>E-mail</span>
            <div 
              className="w-full h-9 border rounded-lg"
              style={{ 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            ></div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Senha</span>
            <div 
              className="w-full h-9 border rounded-lg"
              style={{ 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            ></div>
          </div>
        </div>

        {/* Botão de Entrar */}
        <button
          type="button"
          className="w-full py-2.5 text-xs font-bold mt-6 flex items-center justify-center transition-all"
          style={getButtonStyle(settings)}
        >
          Entrar no Portal
        </button>
      </div>
    </div>
  )
}

// 2. Simulação: Dashboard do Aluno
export const StudentDashboardPreview: React.FC<PreviewProps> = ({ settings, isMobile }) => {
  const isDark = settings.theme_mode === 'dark'
  
  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden text-xs" 
      style={getContainerStyle(settings)}
    >
      {/* Header do Aluno */}
      <header 
        className="px-4 py-2 flex justify-between items-center shrink-0 border-b z-20"
        style={getHeaderStyle(settings)}
      >
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-6 object-contain max-w-[80px]" />
          ) : (
            <div className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
              {settings.app_name?.charAt(0) || 'A'}
            </div>
          )}
          <span className="text-[10px] font-bold truncate max-w-[80px]" style={{ color: isDark ? '#f1f5f9' : settings.text_color }}>
            {settings.app_name}
          </span>
        </div>
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: isDark ? '#cbd5e1' : '#64748b'
          }}
        >
          A
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 pr-2">
        {/* Welcome row */}
        <div className="flex justify-between items-center pb-1">
          <div>
            <h2 className="text-xs font-black" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
              Olá, Aluno 👋
            </h2>
            <p className="text-[8px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {settings.dashboard_message || 'Pronto para evoluir ainda mais hoje?'}
            </p>
          </div>
          <button 
            type="button"
            className="px-2 py-1.5 text-[8px] font-bold text-white transition-all shadow-sm shrink-0"
            style={getButtonStyle(settings)}
          >
            Agendar Aula
          </button>
        </div>

        {/* 3 KPI cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 flex flex-col justify-center animate-fade-in" style={getCardStyle(settings)}>
            <span className="text-[7px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Ofensiva</span>
            <span className="text-xs font-black mt-0.5" style={{ color: isDark ? '#ffffff' : settings.text_color }}>4 dias</span>
          </div>
          <div className="p-2 flex flex-col justify-center" style={getCardStyle(settings)}>
            <span className="text-[7px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>XP Total</span>
            <span className="text-xs font-black mt-0.5" style={{ color: isDark ? '#ffffff' : settings.text_color }}>1.250</span>
          </div>
          <div className="p-2 flex flex-col justify-center" style={getCardStyle(settings)}>
            <span className="text-[7px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Nível</span>
            <span className="text-xs font-black mt-0.5" style={{ color: isDark ? '#ffffff' : settings.text_color }}>3</span>
          </div>
        </div>

        {/* Details Grid (Left main, Right sidebar) */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
          
          {/* Left Column (Wide) */}
          <div className="lg:col-span-2 space-y-3">
            {/* Exercises card */}
            <div className="p-3.5 flex justify-between items-center gap-2 border-l-4 border-l-emerald-500 animate-slide-in" style={getCardStyle(settings)}>
              <div>
                <h4 className="font-extrabold text-[9px]" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Exercício Adaptativo</h4>
                <p className="text-[7px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Aula de 28/Jun • +30 XP</p>
              </div>
              <button 
                type="button"
                className="py-1 px-2 text-[8px] font-extrabold"
                style={getButtonStyle(settings)}
              >
                Praticar
              </button>
            </div>

            {/* Upcoming sessions card */}
            <div className="p-3.5 flex justify-between items-center gap-2 border-l-4 border-l-indigo-500" style={getCardStyle(settings)}>
              <div>
                <h4 className="font-extrabold text-[9px]" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Aula com Prof. Sarah</h4>
                <p className="text-[7px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>29/Jun às 14:00 • Confirmado</p>
              </div>
            </div>

            {/* Line Chart card */}
            <div className="p-4 flex flex-col justify-between" style={getCardStyle(settings)}>
              <span className="text-[8px] font-black uppercase tracking-wider pb-1.5 border-b block mb-2" style={{ color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                Evolução Histórica
              </span>
              <div className="h-24 flex items-center justify-center">
                <TimelineChartMockup primaryColor={settings.primary_color} secondaryColor={settings.secondary_color} isDark={isDark} />
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:col-span-1 space-y-3">
            {/* focus list card */}
            <div className="p-4" style={getCardStyle(settings)}>
              <span className="text-[8px] font-black uppercase tracking-wider pb-1.5 border-b block mb-2" style={{ color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                Foco da Semana
              </span>
              <ul className="space-y-1">
                {['Phrasal Verbs', 'Prepositions', 'Pronunciation'].map((w, idx) => (
                  <li key={idx} className="text-[8px] font-semibold flex items-center gap-1" style={{ color: isDark ? '#cbd5e1' : settings.text_color }}>
                    <span style={{ color: settings.primary_color }}>•</span> {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* Radar chart card */}
            <div className="p-4 flex flex-col justify-between" style={getCardStyle(settings)}>
              <span className="text-[8px] font-black uppercase tracking-wider pb-1.5 border-b block mb-2" style={{ color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                Habilidades (Radar)
              </span>
              <div className="h-24 flex items-center justify-center">
                <RadarChartMockup primaryColor={settings.primary_color} isDark={isDark} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// 3. Simulação: Dashboard do Professor
export const TeacherDashboardPreview: React.FC<PreviewProps> = ({ settings, isMobile }) => {
  const isDark = settings.theme_mode === 'dark'
  
  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden text-xs" 
      style={getContainerStyle(settings)}
    >
      {/* Header bar (Top) */}
      <header 
        className="px-4 py-2 flex justify-between items-center shrink-0 border-b z-20"
        style={getHeaderStyle(settings)}
      >
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-6 object-contain max-w-[80px]" />
          ) : (
            <div className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
              {settings.app_name?.charAt(0) || 'A'}
            </div>
          )}
          <span className="text-[10px] font-bold truncate max-w-[80px]" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
            {settings.app_name}
          </span>
        </div>
        <span className="text-[8px] font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Painel do Professor</span>
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: isDark ? '#cbd5e1' : '#64748b'
          }}
        >
          P
        </div>
      </header>

      {/* Layout Body */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Floating Sidebar (Desktop only) */}
        {!isMobile && (
          <div className="w-28 shrink-0 flex flex-col gap-3 h-full overflow-y-auto no-scrollbar">
            {/* Main Nav Sidebar Card */}
            <aside 
              className="p-3 flex flex-col gap-2 flex-1"
              style={getCardStyle(settings)}
            >
              <div 
                className="px-2 py-1 text-[8px] font-bold flex items-center" 
                style={{
                  borderRadius: getBtnRadius(settings.button_style),
                  backgroundColor: settings.primary_color + '1a',
                  color: settings.primary_color
                }}
              >
                Dashboard
              </div>
              <div className="px-2 py-1 text-[8px] font-semibold" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Alunos</div>
              <div className="px-2 py-1 text-[8px] font-semibold" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Agenda</div>
              <div className="px-2 py-1 text-[8px] font-semibold" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Financeiro</div>
            </aside>

            {/* Quick Actions Sidebar Card */}
            <aside 
              className="p-3 shrink-0 flex flex-col gap-1.5"
              style={getCardStyle(settings)}
            >
              <span className="text-[7px] font-black uppercase tracking-wider block" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Ações</span>
              <div 
                className="w-full text-center py-1 text-[7px] font-bold text-white cursor-pointer"
                style={getButtonStyle(settings, true)}
              >
                + Aula
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Welcome Header */}
          <div className="flex justify-between items-center pb-1">
            <div>
              <h2 className="text-xs font-black" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
                Good morning, Prof 👋
              </h2>
              <p className="text-[9px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Here's what's happening today.</p>
            </div>
            <div 
              className="px-2 py-1 text-[8px] font-bold shrink-0" 
              style={{
                borderRadius: '8px',
                backgroundColor: settings.primary_color + '1a',
                color: settings.primary_color
              }}
            >
              Premium Plan
            </div>
          </div>

          {/* KPI Stats Row (3 cards) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 flex flex-col justify-between h-20" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Students</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-black" style={{ color: isDark ? '#ffffff' : settings.text_color }}>14</span>
                <span className="text-[7px] font-bold text-emerald-500 bg-emerald-500/10 px-1 rounded-full">+12%</span>
              </div>
            </div>

            <div className="p-3 flex flex-col justify-between h-20" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Classes Today</span>
              <span className="text-lg font-black mt-1" style={{ color: isDark ? '#ffffff' : settings.text_color }}>3</span>
            </div>

            <div className="p-3 flex flex-col justify-between h-20" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Revenue</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[10px] font-black" style={{ color: isDark ? '#ffffff' : settings.text_color }}>R$ 4.250</span>
                <span className="text-[7px] font-bold text-emerald-500 bg-emerald-500/10 px-1 rounded-full">+8%</span>
              </div>
            </div>
          </div>

          {/* Two Columns Grid: Upcoming classes & Revenue Overview Chart */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-5'} gap-3`}>
            {/* Upcoming Classes */}
            <div className="lg:col-span-3 p-4 flex flex-col" style={getCardStyle(settings)}>
              <span className="text-[8px] font-black uppercase tracking-wider pb-2 border-b block" style={{ color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                Upcoming Classes
              </span>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="py-2 flex justify-between items-center gap-2 border-b" style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                  <div>
                    <h4 className="font-extrabold text-[10px]" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Conversational English</h4>
                    <p className="text-[8px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>João Silva • 14:00</p>
                  </div>
                  <button 
                    type="button"
                    className="py-1 px-2.5 text-[8px] font-extrabold animate-pulse"
                    style={getButtonStyle(settings)}
                  >
                    Join
                  </button>
                </div>

                <div className="py-2 flex justify-between items-center gap-2">
                  <div>
                    <h4 className="font-extrabold text-[10px]" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Business Writing</h4>
                    <p className="text-[8px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Mariana Costa • 16:30</p>
                  </div>
                  <button 
                    type="button"
                    className="py-1 px-2.5 text-[8px] font-extrabold"
                    style={getButtonStyle(settings)}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {/* Revenue Area Chart */}
            <div className="lg:col-span-2 p-4 flex flex-col justify-between" style={getCardStyle(settings)}>
              <span className="text-[8px] font-black uppercase tracking-wider pb-2 border-b block" style={{ color: isDark ? '#64748b' : '#94a3b8', borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                Revenue Overview
              </span>
              
              <div className="h-28 mt-2 flex items-center justify-center">
                <RevenueChartMockup primaryColor={settings.primary_color} isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 4. Simulação: Página de Agendamento
export const BookingPagePreview: React.FC<PreviewProps> = ({ settings }) => {
  const isDark = settings.theme_mode === 'dark'
  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden" 
      style={getContainerStyle(settings)}
    >
      <header 
        className="px-4 py-3 flex justify-between items-center shrink-0 border-b"
        style={getHeaderStyle(settings)}
      >
        <span className="text-xs font-bold" style={{ color: isDark ? '#f1f5f9' : settings.text_color }}>Agendar Aula</span>
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: isDark ? '#cbd5e1' : '#64748b'
          }}
        >
          B
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="p-5" style={getCardStyle(settings)}>
          <h4 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Selecione o Horário</h4>
          <p className="text-[9px] mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Segunda-feira, 25 de Maio</p>
          
          <div className="grid grid-cols-3 gap-2 mt-4">
            {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, idx) => {
              const isSelected = idx === 1
              return (
                <button
                  type="button"
                  key={time}
                  className="py-2 text-[10px] font-bold transition-all border"
                  style={
                    isSelected 
                      ? getButtonStyle(settings) 
                      : { 
                          borderRadius: getBtnRadius(settings.button_style), 
                          borderColor: isDark ? '#334155' : '#e2e8f0',
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#cbd5e1' : '#334155'
                        }
                  }
                >
                  {time}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="w-full py-2.5 text-xs font-bold mt-6 transition-all"
            style={getButtonStyle(settings)}
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>
    </div>
  )
}
