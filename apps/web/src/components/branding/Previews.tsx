import React from 'react'
import { BrandSettings } from '../../lib/brandingService'

interface PreviewProps {
  settings: BrandSettings
  isMobile: boolean
}

// Helpers de Estilização Dinâmica no Simulador
const getBtnRadiusClass = (style: string) => {
  if (style === 'Pill') return 'rounded-full'
  if (style === 'Sharp') return 'rounded-none'
  if (style === 'Soft') return 'rounded-2xl'
  return 'rounded-xl'
}

const getCardClass = (style: string, themeMode: string) => {
  const isDark = themeMode === 'dark'
  let classes = 'p-5 transition-all duration-300 '
  
  if (style === 'Elevated') {
    classes += 'shadow-md border border-slate-200/50 '
  } else if (style === 'Glass') {
    classes += 'backdrop-blur-md bg-white/30 border border-white/40 shadow-sm '
  } else if (style === 'Bordered') {
    classes += 'border-2 border-slate-300 '
  } else { // Minimal
    classes += 'border border-slate-200/60 shadow-sm '
  }
  
  return classes + (isDark ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-white text-slate-800')
}

// 1. Simulação: Login do Aluno
export const StudentLoginPreview: React.FC<PreviewProps> = ({ settings }) => {
  const bgStyle = settings.login_background_url
    ? { backgroundImage: `url(${settings.login_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${settings.primary_color}1a, ${settings.secondary_color}2b)` }

  return (
    <div 
      className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ ...bgStyle, backgroundColor: settings.background_color }}
    >
      <div className={`w-full max-w-sm rounded-[24px] ${getCardClass(settings.card_style, settings.theme_mode)} relative z-10`}>
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
          <h2 className="text-lg font-bold truncate max-w-full" style={{ color: settings.text_color }}>
            {settings.app_name || 'Minha Academia'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
            {settings.login_message || 'Bem-vindo ao Portal de Ensino'}
          </p>
        </div>

        {/* Inputs Simulados */}
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</span>
            <div className="w-full h-9 border border-slate-200 rounded-lg bg-slate-50/50"></div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Senha</span>
            <div className="w-full h-9 border border-slate-200 rounded-lg bg-slate-50/50"></div>
          </div>
        </div>

        {/* Botão de Entrar */}
        <button
          type="button"
          className={`w-full py-2.5 text-xs font-bold text-white mt-6 flex items-center justify-center transition-all ${getBtnRadiusClass(settings.button_style)}`}
          style={{ backgroundColor: settings.primary_color }}
        >
          Entrar no Portal
        </button>
      </div>
    </div>
  )
}

// 2. Simulação: Dashboard do Aluno
export const StudentDashboardPreview: React.FC<PreviewProps> = ({ settings, isMobile }) => {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800" style={{ backgroundColor: settings.background_color }}>
      {/* Header do Aluno */}
      <header className="px-4 py-3 bg-white border-b border-slate-200/50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-6 object-contain max-w-[80px]" />
          ) : (
            <div className="w-6 h-6 rounded bg-primary-600 text-white flex items-center justify-center text-xs font-black" style={{ backgroundColor: settings.primary_color }}>
              {settings.app_name?.charAt(0) || 'A'}
            </div>
          )}
          <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{settings.app_name}</span>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">A</div>
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
          <div className="relative z-10">
            <h3 className="text-base font-black tracking-tight">Olá, Aluno! 👋</h3>
            <p className="text-[10px] text-white/80 mt-1 max-w-[280px] line-clamp-1">{settings.dashboard_message}</p>
          </div>
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Cards Layout */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          <div className={getCardClass(settings.card_style, settings.theme_mode)}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Próxima Aula</span>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Aula de Conversação</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Terça, às 14:00</p>
              </div>
              <button 
                type="button"
                className={`px-3 py-1.5 text-[9px] font-bold text-white shrink-0 ${getBtnRadiusClass(settings.button_style)}`}
                style={{ backgroundColor: settings.primary_color }}
              >
                Acessar
              </button>
            </div>
          </div>

          <div className={getCardClass(settings.card_style, settings.theme_mode)}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Seu Progresso</span>
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">XP Acumulado</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Nível 4 • 2400 XP</p>
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
  return (
    <div className="w-full h-full flex bg-slate-50 text-slate-800" style={{ backgroundColor: settings.background_color }}>
      {/* Sidebar simulado */}
      {!isMobile && (
        <aside className="w-36 bg-white border-r border-slate-200/50 flex flex-col py-4 px-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 mb-6">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-5 object-contain max-w-[65px]" />
            ) : (
              <div className="w-5 h-5 rounded bg-primary-600 text-white flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: settings.primary_color }}>
                {settings.app_name?.charAt(0) || 'A'}
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-700 truncate">{settings.app_name}</span>
          </div>

          {/* Menus Simulado */}
          <nav className="flex-1 space-y-1">
            <div className="px-3 py-1.5 text-[9px] font-bold text-white rounded-lg flex items-center" style={{ backgroundColor: settings.primary_color }}>Dashboard</div>
            <div className="px-3 py-1.5 text-[9px] font-semibold text-slate-400 rounded-lg">Estudantes</div>
            <div className="px-3 py-1.5 text-[9px] font-semibold text-slate-400 rounded-lg">Agenda</div>
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-10 bg-white border-b border-slate-200/30 flex items-center justify-between px-4 shrink-0">
          {isMobile && (
            <div className="flex items-center gap-1">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-4 object-contain max-w-[50px]" />
              ) : (
                <div className="w-4 h-4 rounded bg-primary-600 text-white flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: settings.primary_color }}>
                  {settings.app_name?.charAt(0) || 'A'}
                </div>
              )}
              <span className="text-[9px] font-bold text-slate-700">{settings.app_name}</span>
            </div>
          )}
          <span className="text-[9px] font-bold text-slate-400">Painel do Professor</span>
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">P</div>
        </header>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Estatísticas */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <div className={getCardClass(settings.card_style, settings.theme_mode)}>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Clientes</span>
              <span className="text-base font-black block mt-0.5">14</span>
            </div>
            <div className={getCardClass(settings.card_style, settings.theme_mode)}>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Aulas Hoje</span>
              <span className="text-base font-black block mt-0.5">3</span>
            </div>
            <div className={getCardClass(settings.card_style, settings.theme_mode)}>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Ganhos</span>
              <span className="text-base font-black block mt-0.5" style={{ color: settings.primary_color }}>R$ 750</span>
            </div>
          </div>

          {/* Gráfico Simulado */}
          <div className={getCardClass(settings.card_style, settings.theme_mode)}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Engajamento Mensal</span>
            <div className="h-16 flex items-end gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex-1 rounded bg-slate-200" style={{ height: '35%' }}></div>
              <div className="flex-1 rounded" style={{ height: '70%', backgroundColor: settings.primary_color }}></div>
              <div className="flex-1 rounded bg-slate-200" style={{ height: '50%' }}></div>
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
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 text-slate-800 overflow-hidden" style={{ backgroundColor: settings.background_color }}>
      <header className="px-4 py-3 bg-white border-b border-slate-200/50 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold">Agendar Aula</span>
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">B</div>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className={getCardClass(settings.card_style, settings.theme_mode)}>
          <h4 className="font-bold text-sm">Selecione o Horário</h4>
          <p className="text-[9px] text-slate-400 mt-0.5">Segunda-feira, 25 de Maio</p>
          
          <div className="grid grid-cols-3 gap-2 mt-4">
            {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, idx) => {
              const isSelected = idx === 1
              return (
                <button
                  type="button"
                  key={time}
                  className={`py-2 text-[10px] font-bold transition-all border ${getBtnRadiusClass(settings.button_style)} ${
                    isSelected
                      ? 'text-white border-transparent'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  style={isSelected ? { backgroundColor: settings.primary_color } : undefined}
                >
                  {time}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className={`w-full py-2.5 text-xs font-bold text-white mt-6 transition-all ${getBtnRadiusClass(settings.button_style)}`}
            style={{ backgroundColor: settings.primary_color }}
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>
    </div>
  )
}
