import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import BrandStudioPage from './pages/BrandStudioPage'
import { TenantThemeProvider } from './components/branding/TenantThemeProvider'

// Layouts e Páginas (Profissionais)
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Agenda from './pages/Agenda'
import ActiveSession from './pages/ActiveSession'
import Settings from './pages/Settings'
import Finance from './pages/Finance'
import Profile from './pages/Profile'
import AvailabilitySettings from './pages/admin/AvailabilitySettings'

// Layouts e Páginas (Admin)
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import TeacherRequests from './pages/admin/TeacherRequests'

// Layouts e Páginas (Client)
import ClientLayout from './layouts/ClientLayout'
import ClientDashboard from './pages/client/ClientDashboard'
import LessonInsights from './pages/client/LessonInsights'
import ProgressAnalytics from './pages/client/ProgressAnalytics'
import HomeworkHub from './pages/client/HomeworkHub'
import ScenarioPractice from './pages/client/ScenarioPractice'
import VocabularyBank from './pages/client/VocabularyBank'
import BookClass from './pages/client/BookClass'
import StudentAgenda from './pages/client/StudentAgenda'

// Novas Páginas de Onboarding & Aprovação
import Onboarding from './pages/onboarding/Onboarding'
import ReviewPending from './pages/onboarding/ReviewPending'
import ReviewRejected from './pages/onboarding/ReviewRejected'

// Router Inteligente da Raiz
function RootRouter() {
  const { role, loading, session, approvalStatus, onboardingCompleted } = useAuthStore()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Carregando Plataforma...</div>
  if (!session) return <Navigate to="/login" replace />
  
  if (role === 'ADMIN') return <Navigate to="/admin" replace />
  if (role === 'STUDENT' || role === 'PATIENT') return <Navigate to="/client" replace />
  
  if (role === 'TEACHER') {
    if (approvalStatus === 'PENDING') return <Navigate to="/review-pending" replace />
    if (approvalStatus === 'REJECTED') return <Navigate to="/review-rejected" replace />
    if (!onboardingCompleted) return <Navigate to="/onboarding" replace />
  }

  return <Navigate to="/dashboard" replace />
}

// Guarda de Rota por Papel
function RoleGuard({ allowedRoles, children }: { allowedRoles: string[], children: React.ReactNode }) {
  const { role, loading, session, approvalStatus, onboardingCompleted } = useAuthStore()
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Autenticando...</div>
  if (!session) return <Navigate to="/login" replace />
  
  if (role === 'TEACHER') {
    if (approvalStatus === 'PENDING') return <Navigate to="/review-pending" replace />
    if (approvalStatus === 'REJECTED') return <Navigate to="/review-rejected" replace />
    if (!onboardingCompleted) return <Navigate to="/onboarding" replace />
  }

  if (role && !allowedRoles.includes(role)) return <Navigate to="/" replace />
  
  return <>{children}</>
}

// Guarda Especial para Páginas de Onboarding / Pendente
function TeacherOnlyGuard({ children }: { children: React.ReactNode }) {
  const { role, session, loading } = useAuthStore()
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Autenticando...</div>
  if (!session) return <Navigate to="/login" replace />
  if (role !== 'TEACHER') return <Navigate to="/" replace />
  
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <TenantThemeProvider>
        <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Rota de Onboarding e Status */}
        <Route path="/onboarding" element={<TeacherOnlyGuard><Onboarding /></TeacherOnlyGuard>} />
        <Route path="/review-pending" element={<TeacherOnlyGuard><ReviewPending /></TeacherOnlyGuard>} />
        <Route path="/review-rejected" element={<TeacherOnlyGuard><ReviewRejected /></TeacherOnlyGuard>} />
        
        {/* Ponto de Entrada Inteligente */}
        <Route path="/" element={<RootRouter />} />
        
        {/* Rotas de Profissionais */}
        <Route path="/dashboard" element={<RoleGuard allowedRoles={['TEACHER', 'PSYCHOLOGIST']}><DashboardLayout /></RoleGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="session/:id" element={<ActiveSession />} />
          <Route path="settings" element={<Settings />} />
          <Route path="availability" element={<AvailabilitySettings />} />
          <Route path="finance" element={<Finance />} />
          <Route path="profile" element={<Profile />} />
          <Route path="brand-studio" element={<BrandStudioPage />} />
        </Route>

        {/* Rotas de Admin */}
        <Route path="/admin" element={<RoleGuard allowedRoles={['ADMIN']}><AdminLayout /></RoleGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="teacher-requests" element={<TeacherRequests />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Rotas de Clientes Finais */}
        <Route path="/client" element={<RoleGuard allowedRoles={['STUDENT', 'PATIENT']}><ClientLayout /></RoleGuard>}>
          <Route index element={<ClientDashboard />} />
          <Route path="insights" element={<LessonInsights />} />
          <Route path="analytics" element={<ProgressAnalytics />} />
          <Route path="homework" element={<HomeworkHub />} />
          <Route path="practice" element={<ScenarioPractice />} />
          <Route path="vocabulary" element={<VocabularyBank />} />
          <Route path="book" element={<BookClass />} />
          <Route path="agenda" element={<StudentAgenda />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Rota Pública Adicional para White-label Academy (Login Customizado) */}
        <Route path="/academy/:slug" element={<Login />} />

        {/* Captura Tudo -> Joga pra Raiz que decide o destino */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </TenantThemeProvider>
    </BrowserRouter>
  )
}
