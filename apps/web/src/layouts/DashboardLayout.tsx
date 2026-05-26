import { useState, useEffect } from 'react'
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTenantBranding } from '../hooks/useTenantBranding'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, CalendarDays, DollarSign, Clock, Palette, LogOut, Menu, X } from 'lucide-react'

export default function DashboardLayout() {
  const { session, user, loading, signOut } = useAuthStore()
  const { appName, logoUrl } = useTenantBranding()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
          <LogOut className="w-4.5 h-4.5" />
          Sair da Plataforma
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-dark font-sans selection:bg-neon selection:text-dark">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <div className="bg-tenant-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-black">
              {appName.charAt(0)}
            </div>
          )}
          <h1 className="font-bold text-tenant-text tracking-tight">{appName}</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-500 bg-slate-50 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

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

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col z-10 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative h-[calc(100vh-73px)] lg:h-screen">
        <div className="flex-1 overflow-y-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
