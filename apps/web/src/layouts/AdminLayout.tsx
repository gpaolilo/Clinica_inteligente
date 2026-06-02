import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { 
  LayoutDashboard, Users, UserCheck, Layers, Zap, Activity, 
  TrendingUp, AlertTriangle, Mail, DollarSign, LogOut, ChevronDown, Brain
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Auto close on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdown(null)
    }
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [])

  // Auto close on route change
  useEffect(() => {
    setOpenDropdown(null)
  }, [location.pathname])

  const navGroups = [
    {
      label: 'Visão Geral',
      path: '/admin',
      icon: LayoutDashboard,
      single: true,
    },
    {
      label: 'Usuários',
      icon: Users,
      items: [
        { path: '/admin/users', label: 'Cadastro de Usuários', description: 'Gerenciar perfis de professores, alunos e administradores', icon: Users },
        { path: '/admin/teacher-requests', label: 'Solicitações de Professores', description: 'Revisar e aprovar novos professores', icon: UserCheck },
        { path: '/admin/student-requests', label: 'Solicitações de Alunos', description: 'Revisar matrículas de novos alunos', icon: UserCheck },
      ],
    },
    {
      label: 'SaaS & Finanças',
      icon: DollarSign,
      items: [
        { path: '/admin/plans', label: 'Planos SaaS', description: 'Gerenciar planos, preços e limites da plataforma', icon: Layers },
        { path: '/admin/payments', label: 'Faturamento & Pagamentos', description: 'Assinaturas de tenants e histórico financeiro', icon: DollarSign },
      ],
    },
    {
      label: 'Inteligência Artificial',
      icon: Brain,
      items: [
        { path: '/admin/features', label: 'Custos de IA', description: 'Modelos de custo e precificação de tokens', icon: Zap },
        { path: '/admin/usage', label: 'Uso de IA', description: 'Visualizar consumo de créditos e chamadas de API', icon: Activity },
        { path: '/admin/profitability', label: 'Margem de Lucro', description: 'Análise de margens de lucro e rentabilidade', icon: TrendingUp },
      ],
    },
    {
      label: 'Sistema & Logs',
      icon: AlertTriangle,
      items: [
        { path: '/admin/alerts', label: 'Alertas do Sistema', description: 'Notificações de erros e anomalias de custos', icon: AlertTriangle },
        { path: '/admin/email-logs', label: 'Histórico de E-mails', description: 'Logs de envio e status de entrega de e-mails', icon: Mail },
      ],
    },
  ]

  const isGroupActive = (group: typeof navGroups[0]) => {
    if (group.single && group.path) {
      return location.pathname === group.path
    }
    return group.items?.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/')) || false
  }

  const handleGroupClick = (e: React.MouseEvent, groupLabel: string) => {
    e.stopPropagation()
    setOpenDropdown(openDropdown === groupLabel ? null : groupLabel)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <img src="/Flowike_icon.png" alt="Flowike Logo" className="w-10 h-10 object-contain" />
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
        <div className="border-t border-slate-100 bg-white relative">
          <div className="max-w-7xl mx-auto px-6 overflow-visible">
            <nav className="flex space-x-2.5 -mb-px py-1.5">
              {navGroups.map((group) => {
                const isActive = isGroupActive(group)
                const IconComponent = group.icon

                if (group.single && group.path) {
                  return (
                    <Link 
                      key={group.path}
                      to={group.path}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all rounded-xl ${
                        isActive 
                          ? 'text-indigo-650 bg-indigo-50/50 font-black' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{group.label}</span>
                    </Link>
                  )
                }

                return (
                  <div 
                    key={group.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(group.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      onClick={(e) => handleGroupClick(e, group.label)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all rounded-xl ${
                        isActive 
                          ? 'text-indigo-650 bg-indigo-50/50 font-black' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        openDropdown === group.label ? 'transform rotate-180 text-indigo-600' : 'text-slate-400'
                      }`} />
                    </button>

                    <AnimatePresence>
                      {openDropdown === group.label && group.items && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute left-0 mt-1 w-96 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 p-2.5 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {group.items.map((item) => {
                              const isItemActive = location.pathname.startsWith(item.path)
                              const SubIcon = item.icon
                              return (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                                    isItemActive 
                                      ? 'bg-indigo-50/50 text-indigo-600' 
                                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                                    isItemActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    <SubIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-snug mt-0.5 line-clamp-2">
                                      {item.description}
                                    </p>
                                  </div>
                                </Link>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
