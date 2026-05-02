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
        {/* Left Sidebars Container */}
        <div className="flex flex-col gap-6 w-68 h-full shrink-0">
          
          {/* Main Navigation Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all flex-1 overflow-y-auto no-scrollbar">
            <nav className="flex-1 space-y-2">
              <Link to="/dashboard" className="flex items-center px-4 py-3.5 text-sm font-bold rounded-full bg-neon text-dark shadow-sm hover:scale-[1.02] transform transition-all duration-200">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                Dashboard
              </Link>
              
              <Link to="/dashboard/patients" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                Clients
              </Link>
              
              <Link to="/dashboard/agenda" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                Agenda
              </Link>
              
              <Link to="/dashboard/finance" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Finance
              </Link>

              <Link to="/dashboard" className="flex items-center px-4 py-3.5 text-sm font-semibold rounded-full text-slate-500 hover:bg-slate-50 hover:text-dark transition-colors">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                Reminders
              </Link>
            </nav>
          </aside>

          {/* Quick Actions Sidebar */}
          <aside className="bg-white rounded-3xl border border-slate-100 flex flex-col py-6 px-4 shadow-sm z-10 transition-all shrink-0">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-4 px-2">Ações Rápidas</h3>
            <div className="space-y-3">
              <Link to="/dashboard/patients" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm">
                + Novo Cliente
              </Link>
              <Link to="/dashboard/agenda" className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold bg-dark text-neon rounded-xl hover:bg-black transition-all shadow-sm">
                + Nova Sessão
              </Link>
            </div>
          </aside>
        </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-3xl">
        <Outlet />
      </main>
      </div>
    </div>
  )
}
