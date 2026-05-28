import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
             <div className="bg-rose-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black">A</div>
             <h1 className="text-xl font-bold text-white tracking-tight">Admin<span className="text-rose-500">.ia</span></h1>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          <Link 
            to="/admin" 
            className={`flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-colors font-semibold ${location.pathname === '/admin' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/admin/users" 
            className={`flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-colors font-semibold ${location.pathname.includes('/admin/users') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Gerenciar Usuários
          </Link>
          <Link 
            to="/admin/teacher-requests" 
            className={`flex items-center px-3.5 py-2.5 text-sm rounded-xl transition-colors font-semibold ${location.pathname.includes('/admin/teacher-requests') ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Solicitações de Professores
          </Link>
        </nav>
        
        <div className="p-3 border-t border-slate-800">
          <button 
            onClick={signOut}
            className="flex items-center px-3.5 py-2.5 text-sm w-full rounded-xl text-rose-400 hover:bg-slate-800 hover:text-rose-300 font-semibold transition-colors"
          >
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
