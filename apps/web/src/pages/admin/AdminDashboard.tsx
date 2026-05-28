import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalPsychologists: 0,
    totalSessions: 0,
    pendingTeacherRequests: 0,
    pendingStudentRequests: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      // Como o admin tem acesso total via RLS ou bypass, ele consegue contar tudo.
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: teachersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER')
      const { count: psychoCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PSYCHOLOGIST')
      const { count: sessionsCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true })
      const { count: pendingTeachers } = await supabase.from('teacher_signup_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
      const { count: pendingStudents } = await supabase.from('student_enrollment_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')

      setStats({
        totalUsers: usersCount || 0,
        totalTeachers: teachersCount || 0,
        totalPsychologists: psychoCount || 0,
        totalSessions: sessionsCount || 0,
        pendingTeacherRequests: pendingTeachers || 0,
        pendingStudentRequests: pendingStudents || 0
      })
    }
    fetchStats()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Visão Geral da Plataforma</h2>
        <p className="text-slate-500 mt-1 text-sm">Acompanhe o crescimento e volume do seu SaaS.</p>
      </div>

      {/* Alertas de solicitações pendentes */}
      {(stats.pendingTeacherRequests > 0 || stats.pendingStudentRequests > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.pendingTeacherRequests > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <h4 className="text-amber-800 font-extrabold text-sm">Solicitações de Professores Pendentes</h4>
                <p className="text-xs text-amber-600 mt-1 font-semibold">Existem {stats.pendingTeacherRequests} cadastros de professores aguardando aprovação.</p>
              </div>
              <a href="/admin/teacher-requests" className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-full transition-all shrink-0">
                Revisar
              </a>
            </div>
          )}
          {stats.pendingStudentRequests > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl flex justify-between items-center shadow-sm">
              <div>
                <h4 className="text-indigo-800 font-extrabold text-sm">Matrículas de Alunos Pendentes</h4>
                <p className="text-xs text-indigo-600 mt-1 font-semibold">Existem {stats.pendingStudentRequests} solicitações de matrículas aguardando confirmação.</p>
              </div>
              <a href="/admin/student-requests" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-full transition-all shrink-0">
                Confirmar
              </a>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-500 mb-1">Total de Usuários</p>
          <p className="text-3xl font-black text-slate-800">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-500 mb-1">Professores</p>
          <p className="text-3xl font-black text-blue-600">{stats.totalTeachers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-500 mb-1">Psicólogos</p>
          <p className="text-3xl font-black text-emerald-600">{stats.totalPsychologists}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-500 mb-1">Volume de Sessões</p>
          <p className="text-3xl font-black text-indigo-600">{stats.totalSessions}</p>
        </div>
      </div>
    </div>
  )
}
