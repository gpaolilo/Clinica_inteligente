import { useState, useEffect } from 'react'
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTenantBranding } from '../hooks/useTenantBranding'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  DollarSign, 
  Clock, 
  Palette, 
  LogOut, 
  Menu, 
  X, 
  User, 
  Settings,
  Search,
  Bell
} from 'lucide-react'

export default function DashboardLayout() {
  const { session, user, loading, signOut } = useAuthStore()
  const { appName, logoUrl } = useTenantBranding()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [headerStyle, setHeaderStyle] = useState<'floating' | 'sidebar-first' | 'minimalist'>(() => {
    return (localStorage.getItem('dashboard-header-style') as any) || 'floating'
  })
  const location = useLocation()

  const changeHeaderStyle = (style: 'floating' | 'sidebar-first' | 'minimalist') => {
    setHeaderStyle(style)
    localStorage.setItem('dashboard-header-style', style)
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard'
      case '/dashboard/patients':
        return 'Clientes'
      case '/dashboard/agenda':
        return 'Agenda'
      case '/dashboard/finance':
        return 'Financeiro'
      case '/dashboard/availability':
        return 'Disponibilidade'
      case '/dashboard/brand-studio':
        return 'Estúdio de Marca'
      case '/dashboard/settings':
        return 'Configurações'
      case '/dashboard/profile':
        return 'Meu Perfil'
      default:
        return 'Painel'
    }
  }

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />

  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/patients', label: 'Clientes', icon: Users },
    { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign },
    { to: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
    { to: '/dashboard/brand-studio', label: 'Estúdio de Marca', icon: Palette }
  ]

  const getLinkClass = (path: string, exact = false) => {
    const base = "flex items-center px-3.5 py-2 text-sm rounded-tenant-btn transition-all duration-200"
    const isActive = exact
      ? location.pathname === path || location.pathname === `${path}/`
      : location.pathname.startsWith(path)
      
    if (isActive) {
      return `${base} bg-tenant-primary/10 text-tenant-primary font-bold shadow-sm`
    }
    return `${base} text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold`
  }

  // Sidebar content for mobile drawer (simplified unified vertical sidebar)
  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-7 max-w-[100px] object-contain" />
          ) : (
            <div className="bg-tenant-primary text-white w-7.5 h-7.5 rounded-lg flex items-center justify-center font-black text-sm">
              {appName.charAt(0)}
            </div>
          )}
          <h1 className="text-lg font-bold text-tenant-text tracking-tight">{appName}</h1>
        </div>
        <button className="lg:hidden text-slate-500" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = link.exact 
            ? location.pathname === link.to || location.pathname === `${link.to}/`
            : location.pathname.startsWith(link.to)
            
          return (
            <Link 
              key={link.label}
              to={link.to} 
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-tenant-btn text-sm font-semibold transition-colors ${isActive ? 'bg-tenant-primary/10 text-tenant-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <link.icon className={`w-5 h-5 ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
              {link.label}
            </Link>
          )
        })}

        {/* Quick Actions inside Nav */}
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2 px-2">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Ações Rápidas</span>
          <Link to="/dashboard/agenda?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-semibold bg-tenant-primary text-white rounded-tenant-btn hover:bg-tenant-primary-hover transition-all shadow-sm">
            + Nova Sessão
          </Link>
          <Link to="/dashboard/patients?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-semibold bg-tenant-secondary text-white rounded-tenant-btn hover:bg-tenant-primary-dark transition-all shadow-sm">
            + Novo Cliente
          </Link>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-3 border-t border-slate-100 space-y-3">
        {/* User profile info */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer" onClick={() => window.location.href='/dashboard/profile'}>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
            <span className="font-bold text-xs text-slate-600">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.user_metadata?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={signOut}
          className="flex items-center justify-center gap-2 font-semibold px-3 py-2.5 w-full rounded-tenant-btn text-sm text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair da Plataforma
        </button>
      </div>
    </>
  )

  // Helper to render profile dropdown
  const renderProfileDropdown = () => (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
      <div className="px-4 py-3 border-b border-slate-50 mb-2">
        <p className="text-sm font-bold text-slate-800 truncate">{user?.user_metadata?.full_name || 'Usuário'}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
      </div>
      <Link 
        to="/dashboard/profile" 
        onClick={() => setIsProfileMenuOpen(false)}
        className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-tenant-primary transition-colors"
      >
        <User className="w-4 h-4 mr-3 text-slate-400" />
        Meu Perfil
      </Link>
      <button 
        onClick={() => {
          setIsProfileMenuOpen(false)
          signOut()
        }}
        className="flex items-center w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4 mr-3 text-rose-400" />
        Sair
      </button>
    </div>
  )

  // Option A (Floating Glassmorphic Header)
  const renderFloatingHeader = () => (
    <div className="w-full px-4 sm:px-6 pt-4 sm:pt-6 shrink-0 z-20">
      <header className="bg-tenant-surface/80 backdrop-blur-md border border-tenant-border shadow-lg px-4 sm:px-8 py-4 flex justify-between items-center rounded-[20px] sm:rounded-[24px]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>

          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 sm:h-9 max-w-[200px] object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-tenant-primary text-white shadow-sm flex items-center justify-center font-black text-base shrink-0">
               {appName.charAt(0)}
            </div>
          )}
          <h1 className="text-xl font-extrabold text-tenant-text tracking-tight hidden sm:block">{appName}</h1>
        </div>

        {/* Center Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-100/50 rounded-full text-xs font-semibold text-slate-500 border border-slate-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Clínica Ativa</span>
        </div>

        <div className="flex items-center space-x-4 sm:space-x-6">
          <Link to="/dashboard/settings" className="text-slate-400 hover:text-tenant-primary transition-colors">
            <Settings className="w-5.5 h-5.5" />
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:border-slate-300 transition-colors focus:outline-none"
            >
              <span className="font-bold text-sm text-slate-600">{initial}</span>
            </button>
            {isProfileMenuOpen && renderProfileDropdown()}
          </div>
        </div>
      </header>
    </div>
  )

  // Option C (Sleek Minimalist Header)
  const renderMinimalistHeader = () => (
    <header className="w-full bg-tenant-surface border-b border-tenant-border px-4 sm:px-8 py-3 flex justify-between items-center z-20 shrink-0">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>

        {logoUrl ? (
          <img src={logoUrl} alt={appName} className="h-8 max-w-[180px] object-contain" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-tenant-primary text-white shadow-sm flex items-center justify-center font-black text-sm shrink-0">
             {appName.charAt(0)}
          </div>
        )}
        <h1 className="text-lg font-extrabold text-tenant-text tracking-tight hidden sm:block">{appName}</h1>
      </div>

      {/* Option C: Central Search Bar */}
      <div className="hidden md:flex items-center max-w-xs lg:max-w-md w-64 lg:w-80 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3" />
        <input 
          type="text" 
          placeholder="Buscar pacientes ou agendamentos..." 
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-tenant-primary rounded-lg transition-all focus:outline-none" 
          readOnly
        />
      </div>

      <div className="flex items-center space-x-3 sm:space-x-5">
        <button className="p-1.5 text-slate-400 hover:text-tenant-primary relative transition-colors rounded-lg hover:bg-slate-50">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
        
        <Link to="/dashboard/settings" className="p-1.5 text-slate-400 hover:text-tenant-primary transition-colors rounded-lg hover:bg-slate-50">
          <Settings className="w-5 h-5" />
        </Link>
        
        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* User profile section */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-bold text-slate-800 line-clamp-1">{user?.user_metadata?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Profissional</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:border-slate-300 transition-colors focus:outline-none"
            >
              <span className="font-bold text-xs text-slate-600">{initial}</span>
            </button>
            {isProfileMenuOpen && renderProfileDropdown()}
          </div>
        </div>
      </div>
    </header>
  )

  // Switcher Panel
  const renderDesignSwitcher = () => (
    <div className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 w-72 flex flex-col gap-2.5 transition-all hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4.5 h-4.5 text-tenant-primary" />
          <span className="text-xs font-extrabold text-slate-800 tracking-tight">Design do Header</span>
        </div>
        <span className="text-[9px] font-bold bg-tenant-primary/10 text-tenant-primary px-1.5 py-0.5 rounded">TESTE</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button 
          onClick={() => changeHeaderStyle('floating')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${headerStyle === 'floating' ? 'border-tenant-primary bg-tenant-primary/5 text-tenant-primary font-bold shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
        >
          <span className="text-[9px] uppercase tracking-wider">A</span>
          <span className="text-[10px] mt-0.5">Flutuante</span>
        </button>
        <button 
          onClick={() => changeHeaderStyle('sidebar-first')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${headerStyle === 'sidebar-first' ? 'border-tenant-primary bg-tenant-primary/5 text-tenant-primary font-bold shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
        >
          <span className="text-[9px] uppercase tracking-wider">B</span>
          <span className="text-[10px] mt-0.5">Lateral</span>
        </button>
        <button 
          onClick={() => changeHeaderStyle('minimalist')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${headerStyle === 'minimalist' ? 'border-tenant-primary bg-tenant-primary/5 text-tenant-primary font-bold shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700'}`}
        >
          <span className="text-[9px] uppercase tracking-wider">C</span>
          <span className="text-[10px] mt-0.5">Minimal</span>
        </button>
      </div>
      <p className="text-[9px] text-slate-400 leading-normal">
        Clique para ver as opções em tempo real. O estado é salvo para manter a sua escolha.
      </p>
    </div>
  )

  // Mobile menu renderer helper
  const renderMobileMenu = () => (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.aside 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 w-64 bg-white flex flex-col z-50 lg:hidden shadow-2xl"
          >
            <SidebarContent />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )

  // If Sidebar-First is active, render Option B layout
  if (headerStyle === 'sidebar-first') {
    return (
      <div className="flex h-screen w-screen bg-slate-50 text-dark font-sans selection:bg-neon selection:text-dark overflow-hidden">
        {/* Left Sidebar for Desktop (Option B) */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 h-full shrink-0 z-20">
          {/* Logo & AppName at top of sidebar */}
          <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-tenant-primary text-white shadow-sm flex items-center justify-center font-black text-base shrink-0">
                 {appName.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-extrabold text-tenant-text tracking-tight truncate">{appName}</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
            {navLinks.map((link) => {
              const isActive = link.exact 
                ? location.pathname === link.to || location.pathname === `${link.to}/`
                : location.pathname.startsWith(link.to)

              return (
                <Link 
                  key={link.label}
                  to={link.to} 
                  className={getLinkClass(link.to, link.exact)}
                >
                  <link.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions inside Sidebar */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1 px-1">Ações Rápidas</span>
            <Link to="/dashboard/agenda?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold bg-tenant-primary text-white rounded-tenant-btn hover:bg-tenant-primary/95 transition-all shadow-sm">
              + Nova Sessão
            </Link>
            <Link to="/dashboard/patients?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold bg-tenant-secondary text-white rounded-tenant-btn hover:bg-tenant-secondary/95 transition-all shadow-sm">
              + Novo Cliente
            </Link>
          </div>
        </aside>

        {/* Right side Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header B */}
          <header className="h-16 border-b border-slate-100 bg-white px-6 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Dynamic Page Breadcrumbs */}
              <div className="flex items-center space-x-2 text-sm text-slate-400 font-medium">
                <span className="hover:text-tenant-primary cursor-pointer transition-colors" onClick={() => window.location.href='/dashboard'}>{appName}</span>
                <span>/</span>
                <span className="text-slate-800 font-bold">{getPageTitle()}</span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center space-x-4">
              <button className="p-1.5 text-slate-400 hover:text-tenant-primary relative transition-colors rounded-lg hover:bg-slate-50">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              <Link to="/dashboard/settings" className="text-slate-400 hover:text-tenant-primary transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              
              <div className="h-6 w-px bg-slate-200"></div>

              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{user?.user_metadata?.full_name || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Profissional</p>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:border-slate-300 transition-colors focus:outline-none"
                  >
                    <span className="font-bold text-xs text-slate-600">{initial}</span>
                  </button>
                  {isProfileMenuOpen && renderProfileDropdown()}
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 bg-slate-50">
            <Outlet />
          </main>
        </div>

        {/* Mobile menu and Switcher */}
        {renderMobileMenu()}
        {renderDesignSwitcher()}
      </div>
    )
  }

  // Otherwise, render Options A and C layouts (with topbar and floating sidebars)
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-dark font-sans selection:bg-neon selection:text-dark">
      {headerStyle === 'floating' ? renderFloatingHeader() : renderMinimalistHeader()}

      {/* Mobile Sidebar Overlay */}
      {renderMobileMenu()}

      {/* Main Page Layout */}
      <div className={`flex-1 flex overflow-hidden px-0 sm:px-6 pb-4 sm:pb-6 ${headerStyle === 'floating' ? 'pt-4' : 'pt-4 sm:pt-6'} gap-6`}>
        {/* Left Sidebars Container (Desktop layout with 2 floating cards) */}
        <div className="hidden lg:flex flex-col gap-6 w-60 h-full shrink-0">
          
          {/* Main Navigation Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all overflow-y-auto no-scrollbar">
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const isActive = link.exact 
                  ? location.pathname === link.to || location.pathname === `${link.to}/`
                  : location.pathname.startsWith(link.to)

                return (
                  <Link 
                    key={link.label}
                    to={link.to} 
                    className={getLinkClass(link.to, link.exact)}
                  >
                    <link.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Quick Actions Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all shrink-0">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4 px-2">AÇÕES RÁPIDAS</h3>
            <div className="space-y-3">
              <Link to="/dashboard/agenda?new=true" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-tenant-primary text-white rounded-tenant-btn hover:bg-tenant-primary/95 transition-all shadow-sm">
                + Nova Sessão
              </Link>
              <Link to="/dashboard/patients?new=true" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-tenant-secondary text-white rounded-tenant-btn hover:bg-tenant-secondary/95 transition-all shadow-sm">
                + Novo Cliente
              </Link>
            </div>
          </aside>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-none sm:rounded-3xl h-full">
          <Outlet />
        </main>
      </div>

      {/* Switcher */}
      {renderDesignSwitcher()}
    </div>
  )
}
