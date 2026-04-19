import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Agenda from './pages/Agenda'
import ActiveSession from './pages/ActiveSession'
import Settings from './pages/Settings'
import Finance from './pages/Finance'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Rotas Privadas (Dashboard) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="session/:id" element={<ActiveSession />} />
          <Route path="settings" element={<Settings />} />
          <Route path="finance" element={<Finance />} />
        </Route>

        {/* Redirect Root para Login/Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
