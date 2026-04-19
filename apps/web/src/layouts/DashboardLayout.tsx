import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function DashboardLayout() {
  const { session, loading, signOut } = useAuthStore()

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-primary-600 tracking-tight">Clinica.ia</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/dashboard" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-primary-50 text-primary-700">
            Painel Central
          </Link>
          <Link to="/dashboard/patients" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">
            Meus Pacientes
          </Link>
          <Link to="/dashboard/agenda" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">
            Agenda Semanal
          </Link>
          <Link to="/dashboard/finance" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">
            Módulo Financeiro
          </Link>
          <Link to="/dashboard/settings" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50">
            Configurações
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
