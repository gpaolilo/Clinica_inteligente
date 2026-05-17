import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Register from './pages/Register'

// Layouts e Páginas (Profissionais)
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Agenda from './pages/Agenda'
import ActiveSession from './pages/ActiveSession'
import Settings from './pages/Settings'
import Finance from './pages/Finance'
import Profile from './pages/Profile'

// Layouts e Páginas (Admin)
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'

// Layouts e Páginas (Client)
import ClientLayout from './layouts/ClientLayout'
import ClientDashboard from './pages/client/ClientDashboard'
import LessonInsights from './pages/client/LessonInsights'
import ProgressAnalytics from './pages/client/ProgressAnalytics'

// Router Inteligente da Raiz
function RootRouter() {
  const { role, loading, session } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Carregando Plataforma...</div>
  if (!session) return <Navigate to="/login" replace />
  
  if (role === 'ADMIN') return <Navigate to="/admin" replace />
  if (role === 'STUDENT' || role === 'PATIENT') return <Navigate to="/client" replace />
  return <Navigate to="/dashboard" replace />
}

// Guarda de Rota por Papel
function RoleGuard({ allowedRoles, children }: { allowedRoles: string[], children: React.ReactNode }) {
  const { role, loading, session } = useAuthStore()
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Autenticando...</div>
  if (!session) return <Navigate to="/login" replace />
  if (role && !allowedRoles.includes(role)) return <Navigate to="/" replace />
  
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Ponto de Entrada Inteligente */}
        <Route path="/" element={<RootRouter />} />
        
        {/* Rotas de Profissionais */}
        <Route path="/dashboard" element={<RoleGuard allowedRoles={['TEACHER', 'PSYCHOLOGIST']}><DashboardLayout /></RoleGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="session/:id" element={<ActiveSession />} />
          <Route path="settings" element={<Settings />} />
          <Route path="finance" element={<Finance />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Rotas de Admin */}
        <Route path="/admin" element={<RoleGuard allowedRoles={['ADMIN']}><AdminLayout /></RoleGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Rotas de Clientes Finais */}
        <Route path="/client" element={<RoleGuard allowedRoles={['STUDENT', 'PATIENT']}><ClientLayout /></RoleGuard>}>
          <Route index element={<ClientDashboard />} />
          <Route path="insights" element={<LessonInsights />} />
          <Route path="analytics" element={<ProgressAnalytics />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Captura Tudo -> Joga pra Raiz que decide o destino */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
