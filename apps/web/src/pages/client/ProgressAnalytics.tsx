import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Activity, Target, Zap, Medal } from 'lucide-react'

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${className}`}>
    {children}
  </div>
)

export default function ProgressAnalytics() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!session) return
      
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!patient) return

      // Fetch gamification
      const { data: gamification } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('patient_id', patient.id)
        .single()

      if (gamification) setProfile(gamification)

      // Fetch insights for timeline
      const { data: insights } = await supabase
        .from('student_insights')
        .select('created_at, fluency_score, confidence_score, grammar_errors, vocabulary_suggestions')
        .eq('patient_id', patient.id)

      // Fetch AI scenario sessions
      const { data: scenarioSessions } = await supabase
        .from('scenario_sessions')
        .select('created_at, fluency_score, confidence_score, grammar_score')
        .eq('patient_id', patient.id)

      // Merge and sort chronologically
      const allActivities = [
        ...(insights || []).map(i => ({
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

        // Calculate averages for Radar
        const avgFluency = allActivities.reduce((acc: number, act: any) => acc + (act.fluency_score || 0), 0) / allActivities.length
        const avgConfidence = allActivities.reduce((acc: number, act: any) => acc + (act.confidence_score || 0), 0) / allActivities.length
        
        // Estimate Grammar Score (start at 100, subtract for errors)
        const avgGrammarErrors = allActivities.reduce((acc: number, act: any) => acc + (act.grammar_errors_count || 0), 0) / allActivities.length
        const grammarScore = Math.max(0, 100 - (avgGrammarErrors * 10))

        // Vocabulary engagement (based on suggestions provided)
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

    fetchAnalytics()
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary-500" /> Analytics de Progresso
        </h1>
        <p className="text-slate-500 mt-1">Acompanhe sua evolução ao longo do tempo e identifique seus pontos fortes.</p>
      </motion.div>

      {/* Top Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="bg-primary-100 p-4 rounded-2xl text-primary-600"><Zap className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">Nível Atual</p>
            <p className="text-2xl font-black text-slate-800">{profile?.level || 1}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="bg-amber-100 p-4 rounded-2xl text-amber-600"><Target className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">XP Total</p>
            <p className="text-2xl font-black text-slate-800">{profile?.xp || 0}</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600"><Medal className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">Maior Ofensiva</p>
            <p className="text-2xl font-black text-slate-800">{profile?.longest_streak || 0} dias</p>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Habilidades (Radar)</h3>
            {radarData.length > 0 ? (
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Habilidades" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Dados insuficientes</div>
            )}
          </GlassCard>
        </motion.div>

        {/* Timeline Chart */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">Evolução Histórica</h3>
            {timelineData.length > 0 ? (
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="Fluência" stroke="#84cc16" strokeWidth={4} dot={{ r: 4, fill: '#84cc16', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Confiança" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Faça sua primeira aula para ver a evolução</div>
            )}
          </GlassCard>
        </motion.div>
      </div>

    </motion.div>
  )
}
