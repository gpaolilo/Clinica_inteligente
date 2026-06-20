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
  X, 
  User,
  Brain,
  Menu
} from 'lucide-react'
import { Header } from '../components/header/Header'

export default function DashboardLayout() {
  const { session, user, loading, signOut } = useAuthStore()
  const { appName, logoUrl, loading: brandingLoading } = useTenantBranding()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  if (loading || brandingLoading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />

  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'

  interface NavItem {
    to: string
    label: string
    icon: any
    exact?: boolean
  }

  interface NavGroup {
    label: string
    icon: any
    children: { to: string; label: string }[]
  }

  const navLinks: (NavItem | NavGroup)[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/patients', label: 'Alunos', icon: Users },
    { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign },
    { 
      label: 'Análise de IA', 
      icon: Brain,
      children: [
        { to: '/dashboard/ai-analytics', label: 'Métricas de Uso' },
        { to: '/dashboard/ai-credits', label: 'Carteira IA' }
      ]
    },
    { to: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
    { to: '/dashboard/brand-studio', label: 'Estúdio de Marca', icon: Palette }
  ]

  const bottomLinks = [
    { to: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/patients', label: 'Alunos', icon: Users },
    { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
    { to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign },
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
          if ('children' in link && link.children) {
            return (
              <div key={link.label} className="space-y-1 mt-2">
                <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-extrabold text-slate-450 uppercase tracking-wider">
                  <link.icon className="w-4 h-4 text-slate-400" />
                  <span>{link.label}</span>
                </div>
                <div className="pl-4 border-l border-slate-100 ml-5.5 space-y-1 flex flex-col">
                  {link.children.map(child => {
                    const isChildActive = location.pathname.startsWith(child.to)
                    return (
                      <Link 
                        key={child.label}
                        to={child.to} 
                        className={`flex items-center px-3 py-2 rounded-tenant-btn text-xs font-semibold transition-colors ${isChildActive ? 'bg-tenant-primary/10 text-tenant-primary font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          } else {
            const item = link as NavItem
            const isActive = item.exact 
              ? location.pathname === item.to || location.pathname === `${item.to}/`
              : location.pathname.startsWith(item.to)
              
            return (
              <Link 
                key={item.label}
                to={item.to} 
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-tenant-btn text-sm font-semibold transition-colors ${isActive ? 'bg-tenant-primary/10 text-tenant-primary font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            )
          }
        })}

        {/* Quick Actions inside Nav */}
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-2 px-2">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">Ações Rápidas</span>
          <Link to="/dashboard/agenda?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-semibold bg-tenant-primary text-white rounded-tenant-btn hover:bg-tenant-primary-hover transition-all shadow-sm">
            + Nova Aula
          </Link>
          <Link to="/dashboard/patients?new=true" className="flex items-center justify-center w-full px-3 py-2 text-xs font-semibold bg-tenant-secondary text-white rounded-tenant-btn hover:bg-tenant-primary-dark transition-all shadow-sm">
            + Novo Aluno
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-dark font-sans selection:bg-neon selection:text-dark">
      {/* Redesigned Glassmorphism Header */}
      <Header 
        appName={appName}
        logoUrl={logoUrl}
        initial={initial}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isProfileMenuOpen={isProfileMenuOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
        renderProfileDropdown={renderProfileDropdown}
      />

      {/* Mobile Sidebar Overlay */}
      {renderMobileMenu()}

      {/* Main Page Layout */}
      <div className="flex-1 flex overflow-hidden px-0 sm:px-6 pb-20 lg:pb-6 pt-4 sm:pt-6 gap-6">
        {/* Left Sidebars Container (Desktop layout with 2 floating cards) */}
        <div className="hidden lg:flex flex-col gap-6 w-60 h-full shrink-0">
          
          {/* Main Navigation Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all overflow-y-auto no-scrollbar">
            <nav className="space-y-1">
              {navLinks.map((link) => {
                if ('children' in link && link.children) {
                  return (
                    <div key={link.label} className="space-y-1">
                      <div className="flex items-center px-3.5 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1">
                        <link.icon className="w-4 h-4 mr-2.5 text-slate-400" />
                        <span>{link.label}</span>
                      </div>
                      <div className="pl-4 border-l border-slate-100 ml-5.5 space-y-1 flex flex-col">
                        {link.children.map(child => {
                          const isChildActive = location.pathname.startsWith(child.to)
                          return (
                            <Link
                              key={child.label}
                              to={child.to}
                              className={`flex items-center px-3 py-1.5 text-xs rounded-tenant-btn transition-colors ${
                                isChildActive 
                                  ? 'bg-tenant-primary/10 text-tenant-primary font-bold' 
                                  : 'text-slate-500 hover:bg-slate-805 font-semibold'
                              }`}
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                } else {
                  const item = link as NavItem
                  const isActive = item.exact 
                    ? location.pathname === item.to || location.pathname === `${item.to}/`
                    : location.pathname.startsWith(item.to)

                  return (
                    <Link 
                      key={item.label}
                      to={item.to} 
                      className={getLinkClass(item.to, item.exact)}
                    >
                      <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
                      {item.label}
                    </Link>
                  )
                }
              })}
            </nav>
          </aside>

          {/* Quick Actions Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all shrink-0">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-4 px-2">AÇÕES RÁPIDAS</h3>
            <div className="space-y-3">
              <Link to="/dashboard/agenda?new=true" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-tenant-primary text-white rounded-tenant-btn hover:bg-tenant-primary/95 transition-all shadow-sm">
                + Nova Aula
              </Link>
              <Link to="/dashboard/patients?new=true" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-tenant-secondary text-white rounded-tenant-btn hover:bg-tenant-secondary/95 transition-all shadow-sm">
                + Novo Aluno
              </Link>
            </div>
          </aside>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-none sm:rounded-3xl h-full">
          <Outlet />
        </main>
      </div>

      {/* Premium Mobile Bottom Navigation for Teachers */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.4)'
        }}
        className="lg:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-2 z-40 shadow-[0_-4px_20px_rgba(15,23,42,0.03)] pb-safe"
      >
        {bottomLinks.map((link) => {
          const isActive = link.exact
            ? location.pathname === link.to || location.pathname === `${link.to}/`
            : location.pathname.startsWith(link.to)

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive 
                  ? 'text-tenant-primary scale-105' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <link.icon className={`w-5.5 h-5.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-[10px] mt-1 font-extrabold tracking-tight ${isActive ? 'font-black text-tenant-primary' : 'text-slate-400'}`}>
                {link.label}
              </span>
            </Link>
          )
        })}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            isMobileMenuOpen 
              ? 'text-tenant-primary scale-105' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Menu className={`w-5.5 h-5.5 ${isMobileMenuOpen ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className={`text-[10px] mt-1 font-extrabold tracking-tight ${isMobileMenuOpen ? 'font-black text-tenant-primary' : 'text-slate-400'}`}>
            Mais
          </span>
        </button>
      </div>
    </div>
  )
}
