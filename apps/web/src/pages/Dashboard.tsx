import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

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

  const [upcomingToday, setUpcomingToday] = useState<any[]>([])
  const [studentGrowth, setStudentGrowth] = useState(0)
  const [planType, setPlanType] = useState('Starter')
  const [patientProductMap, setPatientProductMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return;

    async function loadDashboardData() {
      setLoading(true)
      try {
        const today = new Date()
        today.setHours(0,0,0,0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        // 1. Clientes Ativos, Sessões Hoje e Faturas Pendentes
        const { count: sCount } = await supabase.from('sessions')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_date', today.toISOString())
          .lt('scheduled_date', tomorrow.toISOString())
          .eq('status', 'SCHEDULED')

        const { count: pCount } = await supabase.from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { count: prevPatientsCount } = await supabase.from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .lt('created_at', sevenDaysAgo.toISOString())

        const currentPatients = pCount || 0
        const pastPatients = prevPatientsCount || 0
        let sGrowth = 0
        if (pastPatients > 0) {
          sGrowth = parseFloat((((currentPatients - pastPatients) / pastPatients) * 100).toFixed(1))
        } else if (currentPatients > 0) {
          sGrowth = 100.0
        }
        setStudentGrowth(sGrowth)

        const { count: payCount } = await supabase.from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING')

        setBasicStats({
          sessionsToday: sCount || 0,
          activePatients: pCount || 0,
          pendingPayments: payCount || 0
        })

        // 2. Próximas Aulas de Hoje (ou próximas gerais se hoje estiver vazio)
        const { data: todaySessions } = await supabase
          .from('sessions')
          .select('*, patient:patients(name, user_id, student_level, student_goal)')
          .eq('status', 'SCHEDULED')
          .gte('scheduled_date', today.toISOString())
          .lt('scheduled_date', tomorrow.toISOString())
          .order('scheduled_date', { ascending: true })

        let finalSessions = todaySessions || []
        
        if (todaySessions && todaySessions.length > 0) {
          setUpcomingToday(todaySessions)
        } else {
          const { data: nextSessions } = await supabase
            .from('sessions')
            .select('*, patient:patients(name, user_id, student_level, student_goal)')
            .eq('status', 'SCHEDULED')
            .gte('scheduled_date', new Date().toISOString())
            .order('scheduled_date', { ascending: true })
            .limit(3)
          
          if (nextSessions) {
            setUpcomingToday(nextSessions)
            finalSessions = nextSessions
          }
        }

        // Map purchased class names dynamically
        const patientUserIds = Array.from(new Set(finalSessions.map((s: any) => s.patient?.user_id).filter(Boolean)))
        if (patientUserIds.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select('payer_id, product_id, created_at')
            .in('payer_id', patientUserIds)
            .eq('status', 'SUCCEEDED')
            .eq('type', 'PRODUCT')
            .order('created_at', { ascending: false })

          const productIds = Array.from(new Set(payments?.map((p: any) => p.product_id).filter(Boolean) || []))
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('teacher_products')
              .select('id, name')
              .in('id', productIds)

            const productMap = new Map()
            products?.forEach((p: any) => productMap.set(p.id, p.name))

            const newPatientProductMap = new Map<string, string>()
            payments?.forEach((pay: any) => {
              if (!newPatientProductMap.has(pay.payer_id) && pay.product_id) {
                const prodName = productMap.get(pay.product_id)
                if (prodName) {
                  newPatientProductMap.set(pay.payer_id, prodName)
                }
              }
            })
            setPatientProductMap(newPatientProductMap)
          }
        }

        // 3. Buscar o plano de assinatura do psicólogo
        const { data: psychData } = await supabase
          .from('psychologists')
          .select('plan_type')
          .eq('id', session!.user.id)
          .maybeSingle()

        if (psychData?.plan_type) {
          setPlanType(psychData.plan_type)
        }

        // 3. Faturamento Financeiro
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
        console.error("Erro ao carregar dados do dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [session])

  const teacherName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Professor'

  const revenueGrowth = kpis.last_month_revenue > 0
    ? parseFloat((((kpis.expected_revenue - kpis.last_month_revenue) / kpis.last_month_revenue) * 100).toFixed(1))
    : (kpis.expected_revenue > 0 ? 100.0 : 0.0)

  // Dados para o gráfico de faturamento Recharts
  const chartData = [
    { day: '1', Revenue: kpis.expected_revenue * 0.12 },
    { day: '7', Revenue: kpis.expected_revenue * 0.32 },
    { day: '14', Revenue: kpis.expected_revenue * 0.55 },
    { day: '21', Revenue: kpis.expected_revenue * 0.72 },
    { day: '28', Revenue: kpis.expected_revenue * 0.91 },
    { day: '30', Revenue: kpis.expected_revenue }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1200px] mx-auto space-y-8 font-urbanist bg-[#f8fafc] min-h-full">
      {/* Header Premium */}
      <div className="flex justify-between items-center pb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Good morning, {teacherName} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-semibold">Here's what's happening today.</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100/50 px-4.5 py-2 rounded-2xl flex items-center justify-center shrink-0">
          <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">{planType} Plan</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Students */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col justify-between h-[150px] hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Students</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-4xl font-black text-slate-800">{basicStats.activePatients}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${studentGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {studentGrowth >= 0 ? `+${studentGrowth}` : studentGrowth}%
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-auto font-medium">this week</span>
        </div>

        {/* Card 2: Classes Today */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col justify-between h-[150px] hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Classes Today</span>
          <span className="text-4xl font-black text-slate-800 mt-2 block">{basicStats.sessionsToday}</span>
          <button 
            onClick={() => navigate('/dashboard/agenda')}
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:underline mt-auto text-left outline-none block"
          >
            View schedule
          </button>
        </div>

        {/* Card 3: Revenue (This Month) */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col justify-between h-[150px] hover:shadow-md transition-shadow">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Revenue (This Month)</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-black text-slate-800">
              R$ {kpis.expected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {revenueGrowth >= 0 ? `+${revenueGrowth}` : revenueGrowth}%
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-auto font-medium">vs last month</span>
        </div>
      </div>

      {/* Grid Layout for Details */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Upcoming Classes */}
        <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col space-y-6">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 block">
            Upcoming Classes
          </h2>
          
          {upcomingToday.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              {upcomingToday.map((session) => {
                const dt = new Date(session.scheduled_date)
                const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const name = session.patient?.name || 'Student'
                
                // Fetch dynamic purchased class name from patientProductMap
                const purchasedClassName = patientProductMap.get(session.patient?.user_id)
                const classTitle = purchasedClassName || session.patient?.student_goal || "Aula de Inglês"

                return (
                  <div key={session.id} className="py-5 flex justify-between items-center border-b border-slate-100/70 last:border-b-0 hover:bg-slate-50/50 px-2 rounded-2xl transition-all duration-200 gap-4">
                    <div className="space-y-1.5">
                      <h3 className="font-extrabold text-slate-800 text-[15px]">{classTitle}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-xs font-semibold">
                        <span className="text-slate-800 font-extrabold">{name}</span>
                        <span className="text-slate-350">•</span>
                        <span>{dateStr}</span>
                        <span className="text-slate-350">•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/dashboard/session/${session.id}`)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-extrabold text-xs py-2.5 px-5 rounded-xl transition-all shadow-sm shrink-0"
                    >
                      Join
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
              <Calendar className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-slate-500 font-bold text-sm">No scheduled classes for today</p>
            </div>
          )}
        </div>

        {/* Right Column: Revenue Overview Chart */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[24px] border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Revenue Overview
            </h2>
            <span className="text-[11px] font-extrabold text-slate-400">This Month</span>
          </div>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-3xl font-black text-slate-800">
              R$ {kpis.expected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className={`text-xs font-black ${revenueGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {revenueGrowth >= 0 ? `+${revenueGrowth}` : revenueGrowth}%
            </span>
          </div>

          {/* Line Chart */}
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`R$ ${parseFloat(value).toFixed(0)}`, 'Faturamento']}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
