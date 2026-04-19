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
      <header className="mb-10">
        <h2 className="text-4xl font-extrabold text-dark tracking-tight">
          Olá, Dr(a). {user?.user_metadata?.full_name?.split(' ')[0] || 'Psicólogo(a)'}
        </h2>
        <p className="text-slate-500 mt-2 font-medium">Aqui está o resumo da sua clínica hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="text-slate-500 text-sm font-bold tracking-wide uppercase mb-3">Pacientes Ativos</div>
          <div className="text-5xl font-black text-dark mb-4">{loading ? '-' : stats.activePatients}</div>
          <div className="text-xs font-bold text-dark mt-auto bg-neon inline-block px-3 py-1.5 rounded-full self-start">Na sua base</div>
        </div>
        <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="text-slate-500 text-sm font-bold tracking-wide uppercase mb-3">Sessões Hoje</div>
          <div className="text-5xl font-black text-dark mb-4">{loading ? '-' : stats.sessionsToday}</div>
          <div className="text-xs font-bold text-dark mt-auto bg-slate-100 inline-block px-3 py-1.5 rounded-full self-start">Ver agenda</div>
        </div>
        <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="text-slate-500 text-sm font-bold tracking-wide uppercase mb-3">Prontuários Atrasados</div>
          <div className="text-5xl font-black text-dark mb-4">{loading ? '-' : stats.lateNotes}</div>
          {stats.lateNotes > 0 ? (
            <div className="text-xs text-white font-bold mt-auto bg-rose-500 inline-block px-3 py-1.5 rounded-full self-start">Pendentes assinatura</div>
          ) : (
            <div className="text-xs text-dark font-bold mt-auto bg-neon inline-block px-3 py-1.5 rounded-full self-start">Tudo em dia!</div>
          )}
        </div>
        <div className="bg-dark p-8 rounded-[32px] shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg className="w-24 h-24 text-neon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <div className="text-slate-400 text-sm font-bold tracking-wide uppercase mb-3 z-10">Receita Recebida</div>
          <div className="text-4xl font-black text-neon mb-4 z-10">R$ {loading ? '-' : stats.revenue.toFixed(2)}</div>
          <div className="text-xs text-dark font-bold mt-auto bg-white inline-block px-3 py-1.5 rounded-full self-start z-10">Módulo Financeiro</div>
        </div>
      </div>
      
      <div className="mt-10 bg-surface rounded-[32px] shadow-sm border border-slate-100 p-12 text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-background rounded-full flex mx-auto items-center justify-center mb-6 border border-slate-200">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-dark mb-2">
           {stats.sessionsToday === 0 ? "Sua agenda está limpa" : "Você tem sessões marcadas para hoje!"}
        </h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto font-medium leading-relaxed">
          {stats.sessionsToday === 0 
           ? "Não há consultas alocadas para esta data. Que tal cadastrar um novo paciente ou revisar as configurações da clínica?" 
           : "Vá para a sua aba de Agenda Semanal para iniciar a transcrição de IA e automatizar a evolução dos pacientes de hoje."}
        </p>
        <button onClick={() => navigate('/dashboard/agenda')} className="bg-dark hover:bg-black text-neon px-8 py-3.5 rounded-full font-bold transition-all shadow-md flex items-center transform hover:-translate-y-0.5">
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Abrir Agenda Semanal
        </button>
      </div>
    </div>
  )
}
