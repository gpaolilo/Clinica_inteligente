import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, session } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ sessionsToday: 0, lateNotes: 0, revenue: 0, activePatients: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return;
    
    async function loadStats() {
      const today = new Date()
      today.setHours(0,0,0,0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      // Consultas de Hoje
      const { count: sCount } = await supabase.from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', today.toISOString())
        .lt('scheduled_date', tomorrow.toISOString())

      // Prontuários Atrasados (Não assinados)
      const { count: nCount } = await supabase.from('clinical_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_signed', false)

      // Receita Semanal/Mensal (Total Pago)
      const { data: invs } = await supabase.from('invoices').select('amount').eq('status', 'PAID')
      const sum = (invs || []).reduce((acc, curr) => acc + curr.amount, 0)

      // Pacientes Ativos
      const { count: pCount } = await supabase.from('patients')
         .select('*', { count: 'exact', head: true })
         .eq('status', 'ACTIVE')

      setStats({
        sessionsToday: sCount || 0,
        lateNotes: nCount || 0,
        revenue: sum,
        activePatients: pCount || 0
      })
      
      setLoading(false)
    }
    
    loadStats()
  }, [session])

  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
          Olá, Dr(a). {user?.user_metadata?.full_name?.split(' ')[0] || 'Psicólogo(a)'}
        </h2>
        <p className="text-slate-500 mt-2">Aqui está o resumo da sua clínica hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Pacientes Ativos</div>
          <div className="text-3xl font-bold text-slate-800">{loading ? '-' : stats.activePatients}</div>
          <div className="text-xs text-primary-600 mt-2 bg-primary-50 inline-block px-2 py-1 rounded">Na sua base</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Sessões Hoje</div>
          <div className="text-3xl font-bold text-slate-800">{loading ? '-' : stats.sessionsToday}</div>
          <div className="text-xs text-sky-600 mt-2 bg-sky-50 inline-block px-2 py-1 rounded">Ver agenda</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Prontuários Atrasados</div>
          <div className="text-3xl font-bold text-slate-800">{loading ? '-' : stats.lateNotes}</div>
          {stats.lateNotes > 0 ? (
            <div className="text-xs text-rose-600 mt-2 bg-rose-50 inline-block px-2 py-1 rounded">Pendentes assinatura</div>
          ) : (
            <div className="text-xs text-emerald-600 mt-2 bg-emerald-50 inline-block px-2 py-1 rounded">Tudo em dia!</div>
          )}
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Receita Recebida</div>
          <div className="text-3xl font-bold text-slate-800">R$ {loading ? '-' : stats.revenue.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2 inline-block px-2 py-1 rounded">Módulo Financeiro</div>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="text-slate-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
           {stats.sessionsToday === 0 ? "Agenda Livre" : "Você tem sessões marcadas para hoje!"}
        </h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          {stats.sessionsToday === 0 
           ? "Não há consultas alocadas. Você pode cadastrar uma sessão no seu calendário." 
           : "Vá para a sua aba de Agenda Semanal para Iniciar a Transcrição da IA e automatizar com os seus pacientes."}
        </p>
        <button onClick={() => navigate('/dashboard/agenda')} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Gerenciar Agenda
        </button>
      </div>
    </div>
  )
}
