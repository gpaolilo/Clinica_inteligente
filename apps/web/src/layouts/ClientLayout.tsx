import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import GamificationOverlay from '../components/ui/GamificationOverlay'
import { Menu, X, LayoutDashboard, Brain, Activity, BookOpen, MessageSquare, Book, User, LogOut, CalendarPlus, CalendarDays } from 'lucide-react'
import { useTenantBranding } from '../hooks/useTenantBranding'

export default function ClientLayout() {
  const { signOut, role } = useAuthStore()
  const { appName, logoUrl } = useTenantBranding()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const navLinks = role === 'STUDENT' ? [
    { to: '/client', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/client/book', label: 'Agendar Aula', icon: CalendarPlus },
    { to: '/client/agenda', label: 'Minha Agenda', icon: CalendarDays },
    { to: '/client/insights', label: 'Evolução & Insights', icon: Brain },
    { to: '/client/analytics', label: 'Analytics de Progresso', icon: Activity },
    { to: '/client/homework', label: 'Meus Exercícios', icon: BookOpen },
    { to: '/client/practice', label: 'Prática com IA', icon: MessageSquare },
    { to: '/client/vocabulary', label: 'Banco de Vocabulário', icon: Book },
    { to: '/client/profile', label: 'Meu Perfil', icon: User },
  ] : [
    { to: '/client', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/client/profile', label: 'Meu Perfil', icon: User },
  ]

  const SidebarContent = () => (
    <>
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
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = link.to === '/client' 
            ? location.pathname === '/client' 
            : location.pathname.includes(link.to)
            
          return (
            <Link 
              key={link.to}
              to={link.to} 
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-tenant-btn text-sm font-semibold transition-colors ${isActive ? 'bg-tenant-primary/10 text-tenant-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <link.icon className={`w-4.5 h-4.5 ${isActive ? 'text-tenant-primary' : 'text-slate-400'}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-3 border-t border-slate-100">
        <button 
          onClick={signOut}
          className="flex items-center justify-center gap-2 font-semibold px-3 py-2.5 w-full rounded-tenant-btn text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sair do Portal
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-[calc(100vh-73px)] lg:h-screen">
        <div className="flex-1 overflow-y-auto w-full">
          <Outlet />
        </div>
        <GamificationOverlay />
      </main>
    </div>
  )
}
