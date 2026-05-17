import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ClientLayout() {
  const { signOut, role } = useAuthStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Client */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
             <div className="bg-primary-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black">C</div>
             <h1 className="text-xl font-bold text-slate-800 tracking-tight">Portal do {role === 'STUDENT' ? 'Aluno' : 'Paciente'}</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            to="/client" 
            className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname === '/client' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            Dashboard
          </Link>
          {role === 'STUDENT' && (
            <>
              <Link 
                to="/client/insights" 
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/insights') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                Evolução & Insights
              </Link>
              <Link 
                to="/client/analytics" 
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/analytics') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                Analytics de Progresso
              </Link>
              <Link 
                to="/client/homework" 
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/homework') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                Meus Exercícios
              </Link>
              <Link 
                to="/client/practice" 
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/practice') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                Prática com IA
              </Link>
              <Link 
                to="/client/vocabulary" 
                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/vocabulary') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              >
                Banco de Vocabulário
              </Link>
            </>
          )}
          <Link 
            to="/client/profile" 
            className={`flex items-center px-4 py-3 rounded-xl font-bold transition-colors ${location.pathname.includes('/client/profile') ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            Meu Perfil
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={signOut}
            className="flex items-center justify-center font-bold px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            Sair do Portal
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
