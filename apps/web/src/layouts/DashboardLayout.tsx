import { useState } from 'react'
import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function DashboardLayout() {
  const { session, user, loading, signOut } = useAuthStore()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  
  const initial = user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-dark font-sans selection:bg-neon selection:text-dark">
      {/* Horizontal Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm border-b border-slate-100 z-20">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-lg bg-neon mr-3 shadow-sm flex items-center justify-center border border-lime-300">
             <svg className="w-5 h-5 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-xl font-bold text-dark tracking-tight">Clinica.ia</h1>
        </div>
        <div className="flex items-center space-x-5">
          <Link to="/dashboard/settings" className="text-slate-400 hover:text-dark transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm hover:border-slate-300 transition-colors focus:outline-none"
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
                  className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  Meu Perfil
                </Link>
                <button 
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    signOut()
                  }}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-4 sm:p-6 gap-6">
        {/* Floating Sidebar */}
        <aside className="w-68 bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all overflow-y-auto no-scrollbar">

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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-3xl">
        <Outlet />
      </main>
      </div>
    </div>
  )
}
