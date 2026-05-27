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
  Settings 
} from 'lucide-react'

export default function DashboardLayout() {
  const { session, user, loading, signOut } = useAuthStore()
  const { appName, logoUrl } = useTenantBranding()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const location = useLocation()

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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-dark font-sans selection:bg-neon selection:text-dark">
      {/* Stuck Header (Option 3 Optimized & Height Adjusted) */}
      <header className="w-full bg-tenant-surface border-b border-tenant-border shadow-[0_10px_30px_rgba(0,0,0,0.03)] px-8 py-5.5 flex justify-between items-center z-20 shrink-0 rounded-b-[2.5rem] border-x-0 border-t-0">
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu Button (visible on mobile/tablet) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
          >
            <Menu className="w-7 h-7" />
          </button>

          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-9 sm:h-10 max-w-[220px] object-contain" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-tenant-primary text-white shadow-sm flex items-center justify-center font-black text-lg">
               {appName.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-tenant-text tracking-tight hidden sm:block">{appName}</h1>
        </div>

        <div className="flex items-center space-x-6">
          <Link to="/dashboard/settings" className="text-slate-400 hover:text-tenant-primary transition-colors">
            <Settings className="w-6 h-6" />
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:border-slate-300 transition-colors focus:outline-none"
            >
              <span className="font-bold text-sm text-slate-600">{initial}</span>
            </button>

            {isProfileMenuOpen && (
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
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Page Layout */}
      <div className="flex-1 flex overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6 pt-4.5 sm:pt-6.5 gap-6">
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
        <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-3xl h-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
