import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import RequestSessionModal from '../../components/client/RequestSessionModal'
import { motion, Variants } from 'framer-motion'
import { Flame, Brain, Calendar, Trophy, ArrowRight, Star, Clock, Award, Sparkles, FileText, ShieldCheck } from 'lucide-react'
import { useTenantBranding } from '../../hooks/useTenantBranding'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import PlacementTestModal from '../../components/assessment/PlacementTestModal'
import LevelRevealModal from '../../components/assessment/LevelRevealModal'
import AudioBeforeAfterPlayer from '../../components/assessment/AudioBeforeAfterPlayer'
import StudentContractModal from '../../components/contract/StudentContractModal'
import ContractViewerModal from '../../components/contract/ContractViewerModal'

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
  const [latestInsights, setLatestInsights] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingHomeworks, setPendingHomeworks] = useState<any[]>([])
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  
  // Assessment states
  const [assessments, setAssessments] = useState<any[]>([])
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [selectedAssessmentForModal, setSelectedAssessmentForModal] = useState<any>(null)
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false)

  // Contract states
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [isContractViewerOpen, setIsContractViewerOpen] = useState(false)

  const fetchData = async () => {
    if (!session) return
    setLoading(true)
    
    // 1. Encontrar o registro do paciente vinculado a este usuário
    const { data: patient } = await supabase
      .from('patients')
      .select('id, psychologist_id, name, cpf, rg, profession, address, cep, city, class_balance, ai_credits_balance, student_level, contract_signed, contract_signed_at, contract_initials, contract_signature, contract_data')
      .eq('user_id', session.user.id)
      .single()

    if (!patient) {
      setLoading(false)
      return
    }

    const cachedLevel = 
      localStorage.getItem(`flowike_student_level_${patient.id}`) ||
      (session.user?.id ? localStorage.getItem(`flowike_student_level_${session.user.id}`) : null)

    if (cachedLevel && !patient.student_level) {
      patient.student_level = cachedLevel
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

    // 4. Buscar Últimos Insights (da tabela student_insights)
    const { data: insights } = await supabase
      .from('student_insights')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (insights && insights.length > 0) {
      const latest = insights[0]
      // Calcular score de gramática e vocabulário dinamicamente
      const grammarErrorsCount = latest.grammar_errors?.length || 0
      latest.grammar_score = Math.max(0, 100 - (grammarErrorsCount * 10))

      const vocabCount = latest.vocabulary_suggestions?.length || 0
      latest.vocabulary_score = Math.min(100, 50 + (vocabCount * 10))

      setLatestInsights(latest)
    }

    // 5. Buscar Deveres de Casa Pendentes
    const { data: publishedPlans } = await supabase
      .from('homework_plans')
      .select('*, sessions(scheduled_date)')
      .eq('patient_id', patient.id)
      .eq('status', 'PUBLISHED')

    const { data: resultsData } = await supabase
      .from('homework_results')
      .select('homework_plan_id')
      .eq('patient_id', patient.id)

    if (publishedPlans) {
      const completedPlanIds = new Set(resultsData?.map((r: any) => r.homework_plan_id) || [])
      const pending = publishedPlans.filter((plan: any) => !completedPlanIds.has(plan.id))
      setPendingHomeworks(pending)
    }

    // 5.5 Buscar Avaliações de Nível
    const { data: assessData } = await supabase
      .from('level_assessments')
      .select('*')
      .eq('student_id', patient.id)
      .order('created_at', { ascending: false })
    if (assessData) setAssessments(assessData || [])

    // 6. Buscar Histórico de Insights para Gráficos
    const { data: insightsHistory } = await supabase
      .from('student_insights')
      .select('created_at, fluency_score, confidence_score, grammar_errors, vocabulary_suggestions')
      .eq('patient_id', patient.id)

    // 7. Buscar Prática de Cenários IA para Gráficos
    const { data: scenarioSessions } = await supabase
      .from('scenario_sessions')
      .select('created_at, fluency_score, confidence_score, grammar_score')
      .eq('patient_id', patient.id)

    // Combinar e formatar dados para os gráficos
    const allActivities = [
      ...(insightsHistory || []).map(i => ({
        created_at: i.created_at,
        fluency_score: i.fluency_score || 0,
        confidence_score: i.confidence_score || 0,
        grammar_errors_count: i.grammar_errors?.length || 0,
        vocab_suggestions_count: i.vocabulary_suggestions?.length || 0
      })),
      ...(scenarioSessions || []).map(s => ({
        created_at: s.created_at,
        fluency_score: s.fluency_score || 0,
        confidence_score: s.confidence_score || 0,
        grammar_errors_count: s.grammar_score ? Math.max(0, Math.round((100 - s.grammar_score) / 10)) : 2,
        vocab_suggestions_count: s.fluency_score ? Math.max(0, Math.round((100 - s.fluency_score) / 15)) : 1
      }))
    ]

    allActivities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    if (allActivities.length > 0) {
      const formattedTimeline = allActivities.map((act: any) => ({
        date: new Date(act.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        Fluência: act.fluency_score || 0,
        Confiança: act.confidence_score || 0
      }))
      setTimelineData(formattedTimeline)

      // Calcular médias para Radar
      const avgFluency = allActivities.reduce((acc: number, act: any) => acc + (act.fluency_score || 0), 0) / allActivities.length
      const avgConfidence = allActivities.reduce((acc: number, act: any) => acc + (act.confidence_score || 0), 0) / allActivities.length
      
      // Estimar nota de Gramática
      const avgGrammarErrors = allActivities.reduce((acc: number, act: any) => acc + (act.grammar_errors_count || 0), 0) / allActivities.length
      const grammarScore = Math.max(0, 100 - (avgGrammarErrors * 10))

      // Engajamento de vocabulário
      const avgVocab = allActivities.reduce((acc: number, act: any) => acc + (act.vocab_suggestions_count || 0), 0) / allActivities.length
      const vocabScore = Math.min(100, 50 + (avgVocab * 10))

      setRadarData([
        { subject: 'Fluência', A: Math.round(avgFluency), fullMark: 100 },
        { subject: 'Confiança', A: Math.round(avgConfidence), fullMark: 100 },
        { subject: 'Gramática', A: Math.round(grammarScore), fullMark: 100 },
        { subject: 'Vocabulário', A: Math.round(vocabScore), fullMark: 100 },
        { subject: 'Compreensão', A: Math.round((avgFluency + avgConfidence) / 2), fullMark: 100 },
      ])
    }

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
      {/* Elegant Header Row */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              Olá, {firstName} <span className="inline-block animate-wave text-2xl">👋</span>
            </h1>
            {(() => {
              const effectiveLevel = 
                patientRecord?.student_level || 
                (assessments.find(a => a.status === 'COMPLETED')?.assigned_level) ||
                (patientRecord?.id ? localStorage.getItem(`flowike_student_level_${patientRecord.id}`) : null) ||
                (session?.user?.id ? localStorage.getItem(`flowike_student_level_${session.user.id}`) : null) ||
                null

              return effectiveLevel ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black shadow-sm tracking-wide">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  <span>Nível CEFR: {effectiveLevel}</span>
                </span>
              ) : null
            })()}
          </div>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            {dashboardMessage || (latestInsights?.fluency_score > 80 
              ? "Sua fluência está excelente! Continue o ótimo trabalho."
              : "Pronto para evoluir ainda mais no seu aprendizado hoje?")}
          </p>
        </div>
        
        <button 
          onClick={() => window.location.href='/client/book'}
          className="flex items-center gap-2 bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-2.5 px-5 rounded-tenant-btn hover:-translate-y-0.5 transition-all duration-200 shadow-sm text-sm"
        >
          <Calendar className="w-4 h-4" />
          Agendar Aula
        </button>
      </motion.div>

      {/* 1. PLACEMENT TEST OR LEVEL CARD */}
      {(() => {
        const completedAssessments = assessments.filter(a => a.status === 'COMPLETED')
        const pendingAssessment = assessments.find(a => a.status === 'PENDING')
        const latestAssessment = completedAssessments[0]
        const effectiveLevel = 
          patientRecord?.student_level || 
          latestAssessment?.assigned_level ||
          (patientRecord?.id ? localStorage.getItem(`flowike_student_level_${patientRecord.id}`) : null) ||
          (session?.user?.id ? localStorage.getItem(`flowike_student_level_${session.user.id}`) : null) ||
          null

        const needsInitialTest = !effectiveLevel && completedAssessments.length === 0

        // GATE 1: INITIAL PLACEMENT TEST (IF NOT TESTED YET)
        if (needsInitialTest) {
          return (
            <motion.div variants={itemVariants} className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white rounded-[28px] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-500/20">
              <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                      Diagnóstico de Nivelamento CEFR
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Contrato Assinado
                    </span>
                  </div>
                  <h2 
                    style={{ color: '#ffffff' }}
                    className="text-xl sm:text-2xl font-black text-white !text-white tracking-tight"
                  >
                    Descubra seu Nível Atual de Inglês
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-medium">
                    Faça seu teste de 5 minutos com <strong>leitura em voz alta gravada</strong>, <strong>desafio gramatical</strong> e <strong>interpretação de texto</strong>. Seu primeiro áudio ficará salvo para compararmos sua evolução ao longo do curso!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsContractViewerOpen(true)}
                    className="w-full sm:w-auto px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ver Contrato</span>
                  </button>

                  <button
                    onClick={() => setIsTestModalOpen(true)}
                    className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Fazer Teste de Nível</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        }

        // PENDING PROGRESS TEST REQUESTED BY TEACHER
        if (pendingAssessment) {
          return (
            <motion.div variants={itemVariants} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-[24px] p-5 sm:p-6 shadow-lg relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 text-white px-2 py-0.5 rounded">
                      Solicitação do Professor
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">Novo Teste de Progresso Pendente</h3>
                  <p className="text-xs text-white/80 font-medium">
                    Seu professor solicitou uma nova leitura para medir e comparar a evolução do seu nível.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsContractViewerOpen(true)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Contrato</span>
                </button>

                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-700 hover:bg-slate-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <span>Iniciar Teste</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        }

        // ACTIVE STUDENT WITH CONTRACT & LEVEL COMPLETED
        return (
          <motion.div variants={itemVariants} className="bg-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                {effectiveLevel || 'B1'}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Seu Nível Oficial CEFR</span>
                <h3 className="text-base font-black text-slate-800">
                  Nível {effectiveLevel || 'B1'} • {completedAssessments.length || 1} {completedAssessments.length <= 1 ? 'Avaliação Realizada' : 'Avaliações Realizadas'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Pontuação Geral: <strong>{Math.round(latestAssessment?.overall_score || 85)}%</strong> • Pronúncia: <strong>{Math.round(latestAssessment?.pronunciation_score || 85)}%</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
              <button
                onClick={() => setIsContractViewerOpen(true)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Ver Contrato Assinado</span>
              </button>

              <button
                onClick={() => {
                  setSelectedAssessmentForModal(latestAssessment || { assigned_level: effectiveLevel, overall_score: 85 })
                  setIsRevealModalOpen(true)
                }}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ver Revelação de Nível</span>
              </button>
            </div>
          </motion.div>
        )
      })()}

      {/* 2. Audio Before & After Speech Player (if student has recorded audio) */}
      {(() => {
        const completedWithAudio = assessments.filter(a => a.status === 'COMPLETED' && a.audio_url)
        const initialA = completedWithAudio.length > 0 ? completedWithAudio[completedWithAudio.length - 1] : undefined
        const latestA = completedWithAudio.length > 0 ? completedWithAudio[0] : undefined
        return (initialA || latestA) ? (
          <motion.div variants={itemVariants}>
            <AudioBeforeAfterPlayer initialAssessment={initialA} latestAssessment={latestA} />
          </motion.div>
        ) : null
      })()}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Card 1: Official Student English Level */}
        {(() => {
          const effectiveLevel = 
            patientRecord?.student_level || 
            (assessments.find(a => a.status === 'COMPLETED')?.assigned_level) ||
            (patientRecord?.id ? localStorage.getItem(`flowike_student_level_${patientRecord.id}`) : null) ||
            (session?.user?.id ? localStorage.getItem(`flowike_student_level_${session.user.id}`) : null) ||
            null

          return (
            <GlassCard className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-indigo-600">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  {effectiveLevel || '—'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nível de Inglês</p>
                  <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                    {effectiveLevel ? `Nível ${effectiveLevel}` : 'Não avaliado'}
                  </p>
                </div>
              </div>
            </GlassCard>
          )
        })()}

        {/* Card 2: Ofensiva */}
        <GlassCard className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
              <Flame className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ofensiva</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">
                {gamification.current_streak || 0} {gamification.current_streak === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Card 3: XP Total */}
        <GlassCard className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Trophy className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">XP Total</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">{gamification.xp || 0}</p>
            </div>
          </div>
        </GlassCard>

        {/* Card 4: Nível Gamificação */}
        <GlassCard className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-tenant-secondary/10 text-tenant-secondary rounded-xl">
              <Star className="w-5.5 h-5.5 text-tenant-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nível de XP</p>
              <p className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">Rank {gamification.level || 1}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Session (Left Col) */}
        <div className="lg:col-span-2 space-y-6">
          {pendingHomeworks.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-600 animate-pulse" /> Exercícios de Fixação Pendentes
                </h2>
                <button 
                  onClick={() => window.location.href='/client/homework'} 
                  className="text-xs font-bold text-tenant-primary hover:text-tenant-primary-hover uppercase tracking-wider"
                >
                  Ver Todos
                </button>
              </div>
              <div className="space-y-4">
                {pendingHomeworks.map((plan) => {
                  const dateStr = new Date(plan.sessions?.scheduled_date || plan.created_at).toLocaleDateString('pt-BR')
                  const exercisesCount = plan.exercises?.length || 0
                  const timeEstimateTotal = plan.exercises?.reduce((sum: number, ex: any) => sum + (ex.time_estimate || 2), 0) || 0
                  const xpRewardTotal = plan.exercises?.reduce((sum: number, ex: any) => sum + (ex.xp_reward || 15), 0) || 0

                  return (
                    <GlassCard 
                      key={plan.id} 
                      className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-emerald-500 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50/50 p-3 rounded-xl text-center min-w-[72px] border border-emerald-100/60">
                          <p className="text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                            Tarefas
                          </p>
                          <p className="text-emerald-800 text-xl font-black mt-0.5">
                            {exercisesCount}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-850">Exercício Adaptativo • Aula de {dateStr}</h3>
                          <p className="text-slate-400 flex items-center gap-3 mt-1 text-xs font-semibold">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeEstimateTotal} min</span>
                            <span className="text-purple-655 font-bold">+{xpRewardTotal} XP</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.location.href='/client/homework'}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all self-start sm:self-auto"
                      >
                        Praticar <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </GlassCard>
                  )
                })}
              </div>
            </motion.div>
          )}

          {upcomingSessions.length > 0 ? (
            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-tenant-primary" /> Próximas Aulas
                </h2>
                <button 
                  onClick={() => window.location.href='/client/agenda'} 
                  className="text-xs font-bold text-tenant-primary hover:text-tenant-primary-hover uppercase tracking-wider"
                >
                  Ver Agenda Completa
                </button>
              </div>
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <GlassCard key={session.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-tenant-primary hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="bg-tenant-primary/10 p-3 rounded-xl text-center min-w-[72px]">
                        <p className="text-tenant-primary text-[10px] font-black uppercase tracking-wider">
                          {new Date(session.scheduled_date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-tenant-primary text-xl font-black mt-0.5">
                          {new Date(session.scheduled_date).getDate()}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-800">Aula com {session.psychologists?.full_name?.split(' ')[0] || 'Professor'}</h3>
                        <p className="text-slate-400 flex items-center gap-1 mt-1 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(session.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="px-3.5 py-1.5 bg-slate-100 rounded-lg font-bold text-xs text-slate-500 self-start sm:self-auto uppercase tracking-wider">
                      {session.status === 'PENDING' ? 'Aguardando' : 'Confirmado'}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
               <GlassCard className="p-8 border-l-4 border-l-tenant-primary flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h2 className="text-xl font-bold text-slate-800">Nenhuma aula agendada</h2>
                    <p className="text-slate-500 text-sm max-w-md font-medium">
                      Você tem <span className="text-tenant-primary font-bold">{patientRecord?.class_balance || 0} aulas</span> e <span className="text-tenant-primary font-bold">{patientRecord?.ai_credits_balance || 0} créditos de IA</span> em seu saldo. Agende sua próxima aula para continuar evoluindo.
                    </p>
                  </div>
                  <button 
                    onClick={() => window.location.href='/client/book'}
                    className="bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-3 px-6 rounded-tenant-btn transition-all duration-200 flex items-center gap-2 shadow-md shrink-0 text-sm"
                  >
                    <Calendar className="w-4.5 h-4.5" />
                    Agendar Agora
                  </button>
               </GlassCard>
            </motion.div>
          )}

          {/* Timeline Chart (Evolução Histórica) */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 h-[360px] flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wider text-slate-400">Evolução Histórica</h3>
              {timelineData.length > 0 ? (
                <div className="flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <filter id="glowFluency" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                        <filter id="glowConfidence" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tenant-border)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--tenant-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: 'var(--tenant-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backgroundColor: 'var(--tenant-card-bg)',
                          borderColor: 'var(--tenant-border)',
                          color: 'var(--tenant-text)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)'
                        }}
                        itemStyle={{ color: 'var(--tenant-text)' }}
                        labelStyle={{ color: 'var(--tenant-text)', opacity: 0.8 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Fluência" 
                        stroke="var(--tenant-secondary)" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: 'var(--tenant-secondary)', strokeWidth: 0 }} 
                        activeDot={{ r: 6 }} 
                        filter="url(#glowFluency)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Confiança" 
                        stroke="var(--tenant-primary)" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: 'var(--tenant-primary)', strokeWidth: 0 }} 
                        activeDot={{ r: 6 }} 
                        filter="url(#glowConfidence)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm">
                  Faça sua primeira aula para acompanhar sua evolução histórica
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* AI Recommendations & Radar Chart (Right Col) */}
        <motion.div variants={itemVariants} className="space-y-6">
          <GlassCard className="p-5 relative overflow-hidden border border-tenant-border/50">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Brain className="w-20 h-20 text-tenant-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 font-bold text-base text-slate-800 border-b border-slate-100 pb-3 mb-4">
                <Brain className="w-4.5 h-4.5 text-tenant-primary" />
                <span>Foco da Semana</span>
              </div>
              {latestInsights?.main_weaknesses?.length > 0 ? (
                <ul className="space-y-3">
                  {latestInsights.main_weaknesses.slice(0, 3).map((w: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-500 font-medium">
                      <ArrowRight className="w-4 h-4 text-tenant-primary shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed mt-2 font-medium">
                  Faça mais aulas para que nossa IA entenda seu padrão de aprendizado e sugira áreas de foco.
                </p>
              )}
              
              <button 
                onClick={() => window.location.href='/client/practice'}
                className="w-full mt-5 bg-tenant-primary/10 hover:bg-tenant-primary/20 text-tenant-primary font-bold py-2.5 rounded-tenant-btn transition-colors text-sm flex items-center justify-center gap-2"
              >
                Praticar Cenários Livres
              </button>
            </div>
          </GlassCard>

          {/* Radar Chart */}
          <GlassCard className="p-6 h-[360px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wider text-slate-400">Habilidades (Radar)</h3>
            {radarData.length > 0 ? (
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="var(--tenant-border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--tenant-text-secondary)', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar 
                      name="Habilidades" 
                      dataKey="A" 
                      stroke="var(--tenant-primary)" 
                      fill="var(--tenant-primary)" 
                      fillOpacity={0.4} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm">
                Dados insuficientes para gerar o radar de habilidades
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {isModalOpen && <RequestSessionModal onClose={() => setIsModalOpen(false)} onSaved={fetchData} />}

      {/* Student Contract Signing Modal */}
      {isContractModalOpen && patientRecord && (
        <StudentContractModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          patient={patientRecord}
          onSigned={() => {
            fetchData()
          }}
        />
      )}

      {/* Student Contract Viewer / Download Modal */}
      {isContractViewerOpen && patientRecord && (
        <ContractViewerModal
          isOpen={isContractViewerOpen}
          onClose={() => setIsContractViewerOpen(false)}
          patient={patientRecord}
        />
      )}

      {/* Placement Test Modal for Student */}
      {isTestModalOpen && patientRecord && (
        <PlacementTestModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          studentId={patientRecord.id}
          studentName={firstName}
          teacherId={patientRecord.psychologist_id}
          existingAssessment={assessments.find((a: any) => a.status === 'PENDING')}
          onCompleted={(result: any) => {
            if (result?.assigned_level) {
              localStorage.setItem(`flowike_student_level_${patientRecord.id}`, result.assigned_level)
              if (patientRecord.user_id) {
                localStorage.setItem(`flowike_student_level_${patientRecord.user_id}`, result.assigned_level)
              }
              setPatientRecord((prev: any) => ({
                ...prev,
                student_level: result.assigned_level
              }))
            }
            fetchData()
          }}
        />
      )}

      {/* Level Reveal Modal for Student */}
      {selectedAssessmentForModal && (
        <LevelRevealModal
          isOpen={isRevealModalOpen}
          onClose={() => {
            setIsRevealModalOpen(false)
            setSelectedAssessmentForModal(null)
          }}
          assessment={selectedAssessmentForModal}
          studentName={firstName}
        />
      )}
    </motion.div>
  )
}
