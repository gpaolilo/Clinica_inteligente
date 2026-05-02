import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import WeeklyCalendar from '../components/dashboard/WeeklyCalendar'

export default function Dashboard() {
  const { session } = useAuthStore()
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
        .eq('status', 'SCHEDULED')

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

  // 2. Carrega as KPIs financeiras detalhadas
  useEffect(() => {
    async function loadFinKpis() {
      try {
        let apiSuccess = false
        try {
          const res = await fetch('/api/dashboard/kpis')
          const isJson = res.headers.get('content-type')?.includes('application/json')
          if (res.ok && isJson) {
            const data = await res.json()
            setKpis({
              expected_revenue: data.expected_revenue || 0,
              last_month_revenue: data.last_month_revenue || 0,
              average_revenue: data.average_revenue || 0,
              potential_revenue: data.potential_revenue || 0
            })
            apiSuccess = true
          }
        } catch (e) {
          console.warn('Vercel API falhou. Tentando fallback local...')
        }

        if (!apiSuccess) {
          // Fallback manual local
          const now = new Date()
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
          const lastMonthEnd = currentMonthStart

          const { data: currSessions } = await supabase.from('sessions')
            .select('price, status')
            .gte('scheduled_date', currentMonthStart)
            .lt('scheduled_date', nextMonthStart)
            .in('status', ['SCHEDULED', 'COMPLETED'])
          let expectedRevenue = 0
          currSessions?.forEach(s => { expectedRevenue += (s.price || 0) })

          const { data: lastSessions } = await supabase.from('sessions')
            .select('price')
            .gte('scheduled_date', lastMonthStart)
            .lt('scheduled_date', lastMonthEnd)
            .eq('status', 'COMPLETED')
          let lastMonthRevenue = 0
          lastSessions?.forEach(s => { lastMonthRevenue += (s.price || 0) })

          const averageRevenue = currSessions?.length ? (expectedRevenue / currSessions.length) : 150
          const potentialRevenue = 8 * 20 * averageRevenue - expectedRevenue

          setKpis({
            expected_revenue: expectedRevenue,
            last_month_revenue: lastMonthRevenue,
            average_revenue: averageRevenue,
            potential_revenue: potentialRevenue > 0 ? potentialRevenue : 0
          })
        }

      } catch (err) {
        console.error("Erro geral KPIs", err)
      } finally {
        setLoadingKpis(false)
      }
    }
    loadFinKpis()
  }, [])

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Dashboard KPI Cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mr-4 text-blue-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Clientes Ativos</div>
            <div className="text-2xl font-bold text-slate-800">{loadingStats ? '-' : basicStats.activePatients}</div>
          </div>
        </div>
        
        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mr-4 text-emerald-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Sessões Hoje</div>
            <div className="text-2xl font-bold text-slate-800">{loadingStats ? '-' : basicStats.sessionsToday}</div>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/dashboard/finance')}
          className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-rose-100 flex items-center cursor-pointer hover:shadow-md hover:border-rose-200 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mr-4 text-rose-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <div className="text-rose-500 text-xs font-semibold tracking-wide uppercase">Faturas Pendentes</div>
            <div className="text-2xl font-bold text-slate-800">{loadingStats ? '-' : basicStats.pendingPayments}</div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mr-4 text-indigo-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Receita (Mês Atual)</div>
            <div className="text-2xl font-bold text-slate-800">R$ {loadingKpis ? '-' : kpis.expected_revenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mr-4 text-slate-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Receita (Mês Passado)</div>
            <div className="text-2xl font-bold text-slate-800">R$ {loadingKpis ? '-' : kpis.last_month_revenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mr-4 text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Ticket Médio</div>
            <div className="text-2xl font-bold text-slate-800">R$ {loadingKpis ? '-' : kpis.average_revenue.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px] bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mr-4 text-purple-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div className="text-slate-500 text-xs font-semibold tracking-wide uppercase">Ociosidade</div>
            <div className="text-2xl font-bold text-slate-800">R$ {loadingKpis ? '-' : kpis.potential_revenue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Weekly Calendar Full View */}
      <WeeklyCalendar />

    </div>
  )
}
