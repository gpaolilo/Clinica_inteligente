import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import WeeklyCalendar from '../components/dashboard/WeeklyCalendar'

export default function Dashboard() {
  const { user, session } = useAuthStore()
  const navigate = useNavigate()
  
  const [basicStats, setBasicStats] = useState({ 
    sessionsToday: 0, 
    activePatients: 0,
    pendingPayments: 0
  })
  
  const [kpis, setKpis] = useState({
    expected_revenue: 0,
    last_month_revenue: 0,
    average_revenue: 0,
    potential_revenue: 0
  })

  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingKpis, setLoadingKpis] = useState(true)

  // 1. Carrega estatísticas básicas diretamente do Supabase via client (mantém o original rápido)
  useEffect(() => {
    if (!session) return;
    async function loadBasicStats() {
      const today = new Date()
      today.setHours(0,0,0,0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const { count: sCount } = await supabase.from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', today.toISOString())
        .lt('scheduled_date', tomorrow.toISOString())

      const { count: pCount } = await supabase.from('patients')
         .select('*', { count: 'exact', head: true })
         .eq('status', 'ACTIVE')

      const { count: payCount } = await supabase.from('invoices')
         .select('*', { count: 'exact', head: true })
         .eq('status', 'PENDING')

      setBasicStats({
        sessionsToday: sCount || 0,
        activePatients: pCount || 0,
        pendingPayments: payCount || 0
      })
      setLoadingStats(false)
    }
    loadBasicStats()
  }, [session])

  // 2. Carrega as KPIs financeiras detalhadas utilizando a nova API Vercel Serverless
  useEffect(() => {
    async function loadFinKpis() {
      try {
        const res = await fetch('/api/dashboard/kpis')
        const data = await res.json()
        if (res.ok) {
          setKpis({
            expected_revenue: data.expected_revenue || 0,
            last_month_revenue: data.last_month_revenue || 0,
            average_revenue: data.average_revenue || 0,
            potential_revenue: data.potential_revenue || 0
          })
        }
      } catch (err) {
        console.error("Erro ao puxar APIs", err)
      } finally {
        setLoadingKpis(false)
      }
    }
    loadFinKpis()
  }, [])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-10">
        <h2 className="text-4xl font-extrabold text-dark tracking-tight">
          Overview, Dr(a). {user?.user_metadata?.full_name?.split(' ')[0] || 'Psicólogo(a)'}
        </h2>
        <p className="text-slate-500 mt-2 font-medium">Seu painel de controle operacional e financeiro.</p>
      </header>

      {/* Row 1 - Operational (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="text-slate-500 text-sm font-bold tracking-wide uppercase mb-3">Clientes Ativos</div>
          <div className="text-5xl font-black text-dark mb-4">{loadingStats ? '-' : basicStats.activePatients}</div>
          <div className="text-xs font-bold text-dark mt-auto bg-neon inline-block px-3 py-1.5 rounded-full self-start">Na base</div>
        </div>
        
        <div className="bg-surface p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="text-slate-500 text-sm font-bold tracking-wide uppercase mb-3">Sessões Hoje</div>
          <div className="text-5xl font-black text-dark mb-4">{loadingStats ? '-' : basicStats.sessionsToday}</div>
          <div className="text-xs font-bold text-dark mt-auto bg-slate-100 inline-block px-3 py-1.5 rounded-full self-start">Consultas marcadas</div>
        </div>
        
        <div 
          onClick={() => navigate('/dashboard/finance')}
          className="bg-surface p-8 rounded-[32px] shadow-sm border border-rose-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <svg className="w-24 h-24 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </div>
          <div className="text-rose-500 text-sm font-bold tracking-wide uppercase mb-3 z-10">Pagamentos Pendentes</div>
          <div className="text-5xl font-black text-dark mb-4 z-10">{loadingStats ? '-' : basicStats.pendingPayments}</div>
          <div className="text-xs text-white font-bold mt-auto bg-rose-500 inline-block px-3 py-1.5 rounded-full self-start z-10 group-hover:bg-rose-600">Ver Faturas Pendentes ➔</div>
        </div>
      </div>

      {/* Row 2 - Financial KPIs (4 Cards) com Design Dark/Neon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-dark p-6 rounded-[32px] shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold tracking-wide uppercase mb-2 z-10">Receita Mês Atual</div>
          <div className="text-3xl font-black text-neon mb-3 z-10">R$ {loadingKpis ? '-' : kpis.expected_revenue.toFixed(2)}</div>
          <div className="text-[10px] text-dark font-bold mt-auto bg-white/90 inline-block px-2 py-1 rounded-full self-start z-10">Realizada e Agendada</div>
        </div>

        <div className="bg-dark p-6 rounded-[32px] shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold tracking-wide uppercase mb-2 z-10">Receita Mês Passado</div>
          <div className="text-3xl font-black text-white mb-3 z-10">R$ {loadingKpis ? '-' : kpis.last_month_revenue.toFixed(2)}</div>
          <div className="text-[10px] text-slate-800 font-bold mt-auto bg-slate-200 inline-block px-2 py-1 rounded-full self-start z-10">Total Completado</div>
        </div>

        <div className="bg-surface p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
          <div className="text-slate-500 text-xs font-bold tracking-wide uppercase mb-2">Ticket Médio</div>
          <div className="text-3xl font-black text-slate-700 mb-3">R$ {loadingKpis ? '-' : kpis.average_revenue.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-auto bg-slate-100 inline-block px-2 py-1 rounded-full self-start">Por Sessão</div>
        </div>

        <div className="bg-gradient-to-br from-primary-50 to-neon p-6 rounded-[32px] shadow-sm border border-neon flex flex-col justify-between relative overflow-hidden">
          <div className="text-primary-800 text-xs font-bold tracking-wide uppercase mb-2">Potencial de Ociosidade</div>
          <div className="text-3xl font-black text-dark mb-3">R$ {loadingKpis ? '-' : kpis.potential_revenue.toFixed(2)}</div>
          <div className="text-[10px] text-white font-bold mt-auto bg-dark inline-block px-2 py-1 rounded-full self-start">Oportunidade p/ Vender</div>
        </div>
      </div>

      {/* Weekly Calendar Full View */}
      <WeeklyCalendar />

    </div>
  )
}
