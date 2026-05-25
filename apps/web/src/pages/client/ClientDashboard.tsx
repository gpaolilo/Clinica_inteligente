import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import RequestSessionModal from '../../components/client/RequestSessionModal'
import { motion, Variants } from 'framer-motion'
import { Flame, Brain, Calendar, Trophy, ArrowRight, Star, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { useTenantBranding } from '../../hooks/useTenantBranding'

// Premium glassmorphism container
const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-tenant-surface/80 backdrop-blur-xl border border-tenant-border shadow-sm hover:shadow-md transition-all duration-300 rounded-tenant-card overflow-hidden ${className}`}>
    {children}
  </div>
)

export default function ClientDashboard() {
  const { session, role } = useAuthStore()
  const { dashboardMessage } = useTenantBranding()
  const [loading, setLoading] = useState(true)
  const [patientRecord, setPatientRecord] = useState<any>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])
  const [gamification, setGamification] = useState<any>({ xp: 0, level: 1, current_streak: 0 })
  const [pendingHomework, setPendingHomework] = useState<any[]>([])
  const [latestInsights, setLatestInsights] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    if (!session) return
    setLoading(true)
    
    // 1. Encontrar o registro do paciente vinculado a este usuário
    const { data: patient } = await supabase
      .from('patients')
      .select('id, psychologist_id, name')
      .eq('user_id', session.user.id)
      .single()

    if (!patient) {
      setLoading(false)
      return
    }
    setPatientRecord(patient)

    // 2. Buscar próximas sessões com info do professor
    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('*, psychologists(full_name)')
      .eq('patient_id', patient.id)
      .in('status', ['SCHEDULED', 'PENDING'])
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(3)

    if (error) {
      console.error("Erro ao buscar sessões:", error)
    }

    if (sessionsData) {
      setUpcomingSessions(sessionsData)
    }

    // 3. Buscar Gamificação
    const { data: gamificationData } = await supabase
      .from('gamification_profiles')
      .select('*')
      .eq('patient_id', patient.id)
      .single()
    if (gamificationData) setGamification(gamificationData)

    // 4. Buscar Homework pendente
    const { data: homeworks } = await supabase
      .from('homework_plans')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })
      .limit(3)
    if (homeworks) setPendingHomework(homeworks)

    // 5. Buscar Últimos Insights (da tabela student_insights)
    const { data: insights } = await supabase
      .from('student_insights')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (insights && insights.length > 0) setLatestInsights(insights[0])

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [session, role])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tenant-primary"></div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  // Helper to safely get the user's first name
  const firstName = session?.user?.user_metadata?.full_name?.split(' ')[0] || patientRecord?.name?.split(' ')[0] || 'Aluno'

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Premium Hero Header */}
      <motion.div variants={itemVariants} className="relative bg-slate-900 rounded-tenant-card p-8 md:p-12 text-white shadow-2xl overflow-hidden animate-fade-in">
        {/* Abstract background blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-tenant-primary rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-[-20%] left-[10%] w-72 h-72 bg-tenant-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">
              Olá, {firstName} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-slate-300 text-lg max-w-xl">
              {dashboardMessage || (latestInsights?.fluency_score > 80 
                ? "Sua fluência está excelente! Continue o ótimo trabalho."
                : "Pronto para evoluir ainda mais no seu aprendizado hoje?")}
            </p>
          </div>
          
          <button 
            onClick={() => window.location.href='/client/book'}
            className="flex items-center gap-2 bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-4 px-8 rounded-tenant-btn hover:scale-105 transition-all duration-300 shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            Agendar Aula
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold">Ofensiva</p>
              <p className="text-2xl font-black text-slate-800">{gamification.current_streak} dias</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold">XP Total</p>
              <p className="text-2xl font-black text-slate-800">{gamification.xp}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold">Fluência</p>
              <p className="text-2xl font-black text-slate-800">{latestInsights?.fluency_score || 0}%</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-semibold">Nível</p>
              <p className="text-2xl font-black text-slate-800">{gamification.level}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Next Session & Pending Homework (Left Col) */}
        <div className="md:col-span-2 space-y-6">
          
          {upcomingSessions.length > 0 ? (
            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-tenant-primary" /> Próximas Aulas
                </h2>
                <button onClick={() => window.location.href='/client/agenda'} className="text-sm font-bold text-tenant-primary hover:text-tenant-primary-hover">Ver Agenda Completa</button>
              </div>
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <GlassCard key={session.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-tenant-primary">
                    <div className="flex items-center gap-4">
                      <div className="bg-tenant-primary/10 p-4 rounded-2xl text-center min-w-[80px]">
                        <p className="text-tenant-primary text-xs font-black uppercase">
                          {new Date(session.scheduled_date).toLocaleDateString('pt-BR', { month: 'short' })}
                        </p>
                        <p className="text-tenant-primary text-2xl font-black">
                          {new Date(session.scheduled_date).getDate()}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">Aula com {session.psychologists?.full_name?.split(' ')[0] || 'Professor'}</h3>
                        <p className="text-slate-500 flex items-center gap-1 mt-1 font-medium">
                          <Clock className="w-4 h-4" />
                          {new Date(session.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 self-start sm:self-auto">
                      {session.status === 'PENDING' ? 'Aguardando Aprovação' : 'Confirmado'}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
               <GlassCard className="p-8 border-l-4 border-l-tenant-primary">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Nenhuma aula agendada</h2>
                  <p className="text-slate-500 mb-6">Você tem <strong>{patientRecord?.class_balance || 0} aulas disponíveis</strong> em seu saldo. Agende sua próxima aula para continuar evoluindo.</p>
                  <button 
                    onClick={() => window.location.href='/client/book'}
                    className="bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-3 px-6 rounded-tenant-btn transition-all flex items-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Agendar Agora
                  </button>
               </GlassCard>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" /> Exercícios Recomendados
              </h2>
              {pendingHomework.length > 0 && (
                <button className="text-sm font-bold text-tenant-primary hover:text-tenant-primary-hover flex items-center gap-1 transition-colors">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {pendingHomework.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
                <p className="text-slate-500 font-medium">Você está em dia com seus exercícios!</p>
              </GlassCard>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {pendingHomework.map((hw) => (
                  <GlassCard key={hw.id} className="p-5 flex flex-col h-full group hover:bg-slate-50">
                    <div className="mb-auto">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                          Adaptativo
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          +50 XP
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 line-clamp-2">{hw.title || 'Revisão Baseada em IA'}</h3>
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                        Criado a partir da sua última aula para fortalecer seus pontos fracos.
                      </p>
                    </div>
                    <button className="w-full mt-4 bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-2.5 rounded-tenant-btn flex items-center justify-center gap-2 transition-colors">
                      Iniciar Prática
                    </button>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* AI Recommendations & Latest Insights (Right Col) */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Recomendações
            </h2>
            <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 border-none text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-2">Foco da Semana</h3>
                {latestInsights?.main_weaknesses?.length > 0 ? (
                  <ul className="space-y-3 mt-4">
                    {latestInsights.main_weaknesses.slice(0,3).map((w: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-300">
                        <ArrowRight className="w-4 h-4 text-tenant-accent shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed mt-2">
                    Faça mais aulas para que nossa IA entenda seu padrão de aprendizado e sugira áreas de foco.
                  </p>
                )}
                
                <button className="w-full mt-6 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl transition-colors text-sm backdrop-blur-sm">
                  Praticar Cenários Livres
                </button>
              </div>
            </GlassCard>
          </div>
          
          {/* Quick Stats or Vocabulary count could go here */}
          <GlassCard className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">Seu Progresso</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">Gramática</span>
                  <span className="font-bold text-slate-800">75%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-tenant-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">Vocabulário</span>
                  <span className="font-bold text-slate-800">60%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {isModalOpen && <RequestSessionModal onClose={() => setIsModalOpen(false)} onSaved={fetchData} />}
    </motion.div>
  )
}
