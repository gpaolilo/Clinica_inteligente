import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Activity, Loader2 
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'

export default function AdminUsage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'features' | 'teachers' | 'plans'>('features')
  
  const [metrics, setMetrics] = useState({
    totalUsage: 0,
    activeTeachersCount: 0,
    highestTeacherName: 'N/A',
    avgUsagePerTeacher: 0
  })

  const [usageTimeline, setUsageTimeline] = useState<any[]>([])
  const [usageByFeature, setUsageByFeature] = useState<any[]>([])
  const [usageByTeacher, setUsageByTeacher] = useState<any[]>([])
  const [usageByPlan, setUsageByPlan] = useState<any[]>([])

  useEffect(() => {
    async function loadUsageData() {
      setLoading(true)
      try {
        // 1. Fetch usage analytics
        const { data: logs } = await supabase
          .from('usage_analytics')
          .select('*, psychologists(full_name, plan_type)')
        
        // 2. Fetch counts
        const { count: teachersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'TEACHER')

        if (logs && logs.length > 0) {
          const total = logs.reduce((acc, l) => acc + l.credits_consumed, 0)
          
          // Grouping logic
          const featMap: Record<string, number> = {}
          const teacherMap: Record<string, number> = {}
          const planMap: Record<string, number> = {}
          const timelineMap: Record<string, number> = {}

          logs.forEach((l: any) => {
            // Features
            featMap[l.feature] = (featMap[l.feature] || 0) + l.credits_consumed

            // Teachers
            const tName = l.psychologists?.full_name || 'Sem Nome'
            teacherMap[tName] = (teacherMap[tName] || 0) + l.credits_consumed

            // Plans
            const pName = (l.psychologists?.plan_type || 'STARTER').toUpperCase()
            planMap[pName] = (planMap[pName] || 0) + l.credits_consumed

            // Timeline
            const day = new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            timelineMap[day] = (timelineMap[day] || 0) + l.credits_consumed
          })

          const highestTeacher = Object.entries(teacherMap).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0])

          setMetrics({
            totalUsage: total,
            activeTeachersCount: teachersCount || 0,
            highestTeacherName: highestTeacher[0],
            avgUsagePerTeacher: Math.round(total / (teachersCount || 1))
          })

          setUsageTimeline(Object.entries(timelineMap).map(([day, val]) => ({ day, creditos: val })))
          setUsageByFeature(Object.entries(featMap).map(([name, creditos]) => ({ name, creditos })))
          setUsageByTeacher(Object.entries(teacherMap).map(([name, creditos]) => ({ name, creditos })))
          setUsageByPlan(Object.entries(planMap).map(([name, creditos]) => ({ name, creditos })))
        } else {
          // Mock data if database is fresh
          setMetrics({
            totalUsage: 34500,
            activeTeachersCount: teachersCount || 15,
            highestTeacherName: 'Gabriel Paolilo',
            avgUsagePerTeacher: 2300
          })

          const mockTimeline = [
            { day: '26/05', creditos: 3200 },
            { day: '27/05', creditos: 4100 },
            { day: '28/05', creditos: 3800 },
            { day: '29/05', creditos: 5200 },
            { day: '30/05', creditos: 6100 },
            { day: '31/05', creditos: 5800 },
            { day: '01/06', creditos: 6300 }
          ]
          setUsageTimeline(mockTimeline)

          const mockFeatures = [
            { name: 'homework_generation', creditos: 12000 },
            { name: 'lesson_analysis', creditos: 15400 },
            { name: 'vocabulary_extraction', creditos: 4100 },
            { name: 'writing_evaluation', creditos: 3000 }
          ]
          setUsageByFeature(mockFeatures)

          const mockTeachers = [
            { name: 'Gabriel Paolilo', creditos: 8400 },
            { name: 'Alex Johnson', creditos: 7200 },
            { name: 'Sofia Silva', creditos: 5900 },
            { name: 'Elena Rostova', creditos: 4200 },
            { name: 'Marcus Aurelius', creditos: 3800 }
          ]
          setUsageByTeacher(mockTeachers)

          const mockPlans = [
            { name: 'STARTER', creditos: 5400 },
            { name: 'GROWTH', creditos: 12100 },
            { name: 'ACADEMY', creditos: 17000 }
          ]
          setUsageByPlan(mockPlans)
        }

      } catch (err) {
        console.error('Error loading admin usage statistics:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUsageData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
      </div>
    )
  }

  const COLORS = ['#4f46e5', '#a78bfa', '#fb7185', '#34d399', '#f59e0b']

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-850 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-rose-500 animate-pulse" /> Monitoramento de Uso de IA
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Acompanhe métricas em tempo real sobre a utilização e a distribuição de recursos baseados em IA.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Créditos Consumidos</span>
          <span className="text-3xl font-black text-slate-850 mt-1 block">{metrics.totalUsage}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-3 block">Total acumulado na plataforma</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Professores Utilizando</span>
          <span className="text-3xl font-black text-slate-850 mt-1 block">{metrics.activeTeachersCount}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-3 block">Professores ativos na plataforma</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maior Consumidor</span>
          <span className="text-xl font-black text-indigo-650 truncate mt-2 block">{metrics.highestTeacherName}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-3 block">Maior volume de chamadas registradas</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consumo Médio</span>
          <span className="text-3xl font-black text-slate-850 mt-1 block">{metrics.avgUsagePerTeacher}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-3 block">créditos por professor ativo</span>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Histórico de Uso Diário</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsageAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                <Tooltip />
                <Area type="monotone" dataKey="creditos" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Distribuição Detalhada</h3>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-100 pb-2">
              <button 
                onClick={() => setActiveTab('features')}
                className={`flex-1 pb-2 text-xs font-black transition-colors ${activeTab === 'features' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Por Recurso
              </button>
              <button 
                onClick={() => setActiveTab('teachers')}
                className={`flex-1 pb-2 text-xs font-black transition-colors ${activeTab === 'teachers' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Por Professor
              </button>
              <button 
                onClick={() => setActiveTab('plans')}
                className={`flex-1 pb-2 text-xs font-black transition-colors ${activeTab === 'plans' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Por Plano
              </button>
            </div>

            {/* Rendered active tab chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={
                  activeTab === 'features' ? usageByFeature :
                  activeTab === 'teachers' ? usageByTeacher : usageByPlan
                } layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} fontWeight="bold" width={80} />
                  <Tooltip />
                  <Bar dataKey="creditos" fill="#ec4899" radius={[0, 8, 8, 0]} barSize={10}>
                    {(activeTab === 'features' ? usageByFeature :
                      activeTab === 'teachers' ? usageByTeacher : usageByPlan
                    ).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
