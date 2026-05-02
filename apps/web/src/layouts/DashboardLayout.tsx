import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function DashboardLayout() {
  const { session, loading, signOut } = useAuthStore()

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-background text-dark font-sans selection:bg-neon selection:text-dark">
      {/* Sidebar Remodelada */}
      <aside className="w-68 bg-white border-r border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all">
        <div className="px-4 mb-10 flex items-center">
          <div className="w-8 h-8 rounded-lg bg-neon mr-3 shadow-sm flex items-center justify-center border border-lime-300">
             <svg className="w-5 h-5 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-dark tracking-tight">Clinica.ia</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {/* Active Link Model */}
          <Link to="/dashboard" className="flex items-center px-4 py-3.5 text-sm font-bold rounded-full bg-neon text-dark shadow-sm hover:scale-[1.02] transform transition-all duration-200">
            Painel Central
          </Link>
          
          <Link to="/dashboard/patients" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
            Meus Clientes
          </Link>
          <Link to="/dashboard/agenda" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
            Agenda Semanal
          </Link>
          <Link to="/dashboard/finance" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
            Módulo Financeiro
          </Link>
          <div className="pt-6 pb-2">
             <span className="px-4 text-xs font-bold text-slate-300 tracking-wider uppercase">Preferências</span>
          </div>
          <Link to="/dashboard/settings" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
            Configurações
          </Link>
        </nav>

        <div className="mt-auto">
          {/* Quick Actions */}
          <div className="mb-6 px-4">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              <Link to="/dashboard/patients" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm">
                + Novo Cliente
              </Link>
              <Link to="/dashboard/agenda" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-dark text-neon rounded-xl hover:bg-black transition-all shadow-sm">
                + Nova Sessão
              </Link>
            </div>
          </div>

          <div className="px-2">
            <button 
              onClick={signOut}
              className="w-full flex items-center px-4 py-3 text-sm font-semibold rounded-full text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Encerrar Sessão
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative bg-background">
        <Outlet />
      </main>
    </div>
  )
}
