import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { 
  LayoutDashboard, Users, UserCheck, Layers, Zap, Activity, 
  TrendingUp, AlertTriangle, Mail, DollarSign, LogOut
} from 'lucide-react'

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: 'Usuários', icon: Users },
    { path: '/admin/teacher-requests', label: 'Professores Recs', icon: UserCheck },
    { path: '/admin/student-requests', label: 'Alunos Recs', icon: UserCheck },
    { path: '/admin/plans', label: 'Planos SaaS', icon: Layers },
    { path: '/admin/features', label: 'Custos IA', icon: Zap },
    { path: '/admin/usage', label: 'Uso IA', icon: Activity },
    { path: '/admin/profitability', label: 'Margens IA', icon: TrendingUp },
    { path: '/admin/alerts', label: 'Alertas', icon: AlertTriangle },
    { path: '/admin/email-logs', label: 'E-mails', icon: Mail },
    { path: '/admin/payments', label: 'Financeiro', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <img src="/Flowike_icon.png" alt="Flowike Logo" className="w-8.5 h-8.5 object-contain" />
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-black text-slate-900 tracking-tight">Flowike</span>
              <span className="text-[10px] font-black tracking-wider uppercase bg-indigo-50 border border-indigo-150 text-indigo-650 px-2 py-0.5 rounded-md">
                Admin
              </span>
            </div>
          </div>

          {/* User Settings & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl">
              <div className="w-5 h-5 bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center text-[10px]">A</div>
              <span className="text-xs font-bold text-slate-650">Administrador</span>
            </div>

            <button 
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 rounded-2xl transition-all shadow-sm/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>

        </div>

        {/* Horizontal Navigation Sub-bar */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 overflow-x-auto no-scrollbar">
            <nav className="flex space-x-1.5 -mb-px pt-1">
              {navItems.map((item) => {
                const isActive = item.path === '/admin' 
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path)
                const IconComponent = item.icon

                return (
                  <Link 
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 shrink-0 ${
                      isActive 
                        ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30 font-black' 
                        : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/80'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-650' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-2 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
