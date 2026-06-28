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
      className="w-full h-full flex flex-col overflow-hidden" 
      style={getContainerStyle(settings)}
    >
      {/* Header do Aluno */}
      <header 
        className="px-4 py-3 flex justify-between items-center shrink-0"
        style={getHeaderStyle(settings)}
      >
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-6 object-contain max-w-[80px]" />
          ) : (
            <div className="w-6 h-6 rounded text-white flex items-center justify-center text-xs font-black" style={{ backgroundColor: settings.primary_color }}>
              {settings.app_name?.charAt(0) || 'A'}
            </div>
          )}
          <span className="text-xs font-bold truncate max-w-[100px]" style={{ color: isDark ? '#f1f5f9' : settings.text_color }}>
            {settings.app_name}
          </span>
        </div>
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: isDark ? '#cbd5e1' : '#64748b'
          }}
        >
          A
        </div>
      </header>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Banner Hero */}
        <div 
          className="rounded-2xl p-5 text-white flex flex-col justify-end min-h-[100px] relative overflow-hidden"
          style={
            settings.banner_url
              ? { backgroundImage: `url(${settings.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }
          }
        >
          <div className="relative z-10 text-white">
            <h3 className="text-base font-black tracking-tight text-white">Olá, Aluno! 👋</h3>
            <p className="text-[10px] text-white/80 mt-1 max-w-[280px] line-clamp-1">{settings.dashboard_message}</p>
          </div>
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Cards Layout */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div className="p-5" style={getCardStyle(settings)}>
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Próxima Aula</span>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : settings.text_color }}>Aula de Conversação</h4>
                <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Terça, às 14:00</p>
              </div>
              <button 
                type="button"
                className="px-3 py-1.5 text-[9px] font-bold shrink-0 transition-all"
                style={getButtonStyle(settings)}
              >
                Acessar
              </button>
            </div>
          </div>

          <div className="p-5" style={getCardStyle(settings)}>
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Seu Progresso</span>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : settings.text_color }}>XP Acumulado</h4>
                <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Nível 4 • 2400 XP</p>
              </div>
              <span 
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2"
                style={{ borderColor: settings.primary_color, color: settings.primary_color }}
              >
                75%
              </span>
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
      className="w-full h-full flex overflow-hidden" 
      style={getContainerStyle(settings)}
    >
      {/* Sidebar simulado */}
      {!isMobile && (
        <aside 
          className="w-36 flex flex-col py-4 px-2 shrink-0 border-r"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#f1f5f9' : settings.text_color
          }}
        >
          <div className="flex items-center gap-1.5 px-2 mb-6">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-5 object-contain max-w-[65px]" />
            ) : (
              <div className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                {settings.app_name?.charAt(0) || 'A'}
              </div>
            )}
            <span className="text-[10px] font-bold truncate" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
              {settings.app_name}
            </span>
          </div>

          {/* Menus Simulado */}
          <nav className="flex-1 space-y-1">
            <div 
              className="px-3 py-1.5 text-[9px] font-bold flex items-center" 
              style={{
                borderRadius: getBtnRadius(settings.button_style),
                backgroundColor: settings.primary_color + '1a',
                color: settings.primary_color
              }}
            >
              Dashboard
            </div>
            <div className="px-3 py-1.5 text-[9px] font-semibold" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Estudantes</div>
            <div className="px-3 py-1.5 text-[9px] font-semibold" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Agenda</div>
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header 
          className="h-10 flex items-center justify-between px-4 shrink-0 border-b"
          style={getHeaderStyle(settings)}
        >
          {isMobile && (
            <div className="flex items-center gap-1">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-4 object-contain max-w-[50px]" />
              ) : (
                <div className="w-4 h-4 rounded text-white flex items-center justify-center text-[8px] font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                  {settings.app_name?.charAt(0) || 'A'}
                </div>
              )}
              <span className="text-[9px] font-bold" style={{ color: isDark ? '#ffffff' : settings.text_color }}>
                {settings.app_name}
              </span>
            </div>
          )}
          <span className="text-[9px] font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Painel do Professor</span>
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#cbd5e1' : '#64748b'
            }}
          >
            P
          </div>
        </header>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Estatísticas */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <div className="p-4" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Clientes</span>
              <span className="text-base font-black block mt-0.5" style={{ color: isDark ? '#ffffff' : settings.text_color }}>14</span>
            </div>
            <div className="p-4" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Aulas Hoje</span>
              <span className="text-base font-black block mt-0.5" style={{ color: isDark ? '#ffffff' : settings.text_color }}>3</span>
            </div>
            <div className="p-4" style={getCardStyle(settings)}>
              <span className="text-[8px] font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Ganhos</span>
              <span className="text-base font-black block mt-0.5" style={{ color: settings.primary_color }}>R$ 750</span>
            </div>
          </div>

          {/* Gráfico Simulado */}
          <div className="p-5" style={getCardStyle(settings)}>
            <span className="text-[9px] font-bold uppercase tracking-wider block mb-3" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Engajamento Mensal</span>
            <div 
              className="h-16 flex items-end gap-2.5 pb-2 border-b"
              style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}
            >
              <div 
                className="flex-1 rounded" 
                style={{ 
                  height: '35%', 
                  backgroundColor: isDark ? '#334155' : '#e2e8f0' 
                }}
              ></div>
              <div className="flex-1 rounded" style={{ height: '70%', backgroundColor: settings.primary_color }}></div>
              <div 
                className="flex-1 rounded" 
                style={{ 
                  height: '50%', 
                  backgroundColor: isDark ? '#334155' : '#e2e8f0' 
                }}
              ></div>
              <div className="flex-1 rounded" style={{ height: '90%', backgroundColor: settings.secondary_color }}></div>
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
        className="px-4 py-3 flex justify-between items-center shrink-0"
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
