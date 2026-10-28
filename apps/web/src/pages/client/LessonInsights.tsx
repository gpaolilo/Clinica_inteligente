import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Brain, Sparkles, Target, MessageSquare, BookOpen, ArrowRight } from 'lucide-react'

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${className}`}>
    {children}
  </div>
)

const getFluencyFeedback = (score: number, isBeginner: boolean) => {
  if (isBeginner) {
    if (score >= 85) return { status: 'Excelente fluxo natural!', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' }
    if (score >= 70) return { status: 'Boa comunicação e ritmo!', color: 'text-primary-700 bg-primary-50 border-primary-100' }
    return { status: 'Evoluindo a cada aula! Continue assim.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
  }
  if (score >= 85) return { status: 'Great conversational flow!', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' }
  if (score >= 70) return { status: 'Good communication pace!', color: 'text-primary-700 bg-primary-50 border-primary-100' }
  return { status: 'Making steady progress! Keep it up.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
}

const getConfidenceFeedback = (score: number, isBeginner: boolean) => {
  if (isBeginner) {
    if (score >= 85) return { status: 'Super seguro e participativo!', color: 'text-purple-700 bg-purple-50 border-purple-100' }
    if (score >= 70) return { status: 'Boa postura ao falar!', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' }
    return { status: 'Ótima coragem! A segurança vem com a prática.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
  }
  if (score >= 85) return { status: 'Highly confident presence!', color: 'text-purple-700 bg-purple-50 border-purple-100' }
  if (score >= 70) return { status: 'Solid communicative confidence!', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' }
  return { status: 'Great effort! Confidence builds with practice.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
}

// Gentle Portuguese translation/sanitizer for beginner students
function cleanGentleInsight(text: string, isBeginner: boolean): string {
  if (!text) return ''
  let out = text.trim()
  if (isBeginner) {
    out = out.replace(/\bThe student demonstrated\b/gi, 'Você demonstrou')
    out = out.replace(/\bThe student demonstrates\b/gi, 'Você demonstra')
    out = out.replace(/\bThe student has difficulty with\b/gi, 'Pratique com carinho')
    out = out.replace(/\bWeakness in\b/gi, 'Ponto para lapidar:')
    out = out.replace(/\bMistake in\b/gi, 'Dica de prática:')
    out = out.replace(/\bNeeds improvement in\b/gi, 'Oportunidade de treino em')
    out = out.replace(/\bFocus on\b/gi, 'Foque com calma em')
    out = out.replace(/\bPractice reading aloud\b/gi, 'Praticar leitura em voz alta')
    out = out.replace(/\bWork on past tense\b/gi, 'Trabalhar tempos verbais no passado')
  }
  return out
}

export default function LessonInsights() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<any[]>([])
  const [selectedInsight, setSelectedInsight] = useState<any>(null)
  const [studentLevel, setStudentLevel] = useState<string>('B1')

  useEffect(() => {
    const fetchInsights = async () => {
      if (!session) return
      
      const { data: patient } = await supabase
        .from('patients')
        .select('id, student_level')
        .eq('user_id', session.user.id)
        .single()

      if (!patient) return

      if (patient.student_level) {
        setStudentLevel(patient.student_level)
      }

      const { data: insightsData } = await supabase
        .from('student_insights')
        .select('*, sessions(scheduled_date)')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (insightsData && insightsData.length > 0) {
        setInsights(insightsData)
        setSelectedInsight(insightsData[0])
      }
      setLoading(false)
    }

    fetchInsights()
  }, [session])

  const isBeginner = ['A1', 'A2', 'INICIANTE', 'BÁSICO', 'BASICO'].includes((studentLevel || '').toUpperCase())

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 md:p-8 max-w-7xl mx-auto space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary-500" /> Evolução & Insights
          </h1>
          <p className="text-slate-500 mt-1">
            {isBeginner 
              ? 'Análise leve e acolhedora do seu desempenho nas aulas com a nossa IA.' 
              : 'Detailed and constructive analysis of your conversational performance.'}
          </p>
        </div>

        {insights.length > 0 && (
          <select 
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedInsight?.id}
            onChange={(e) => setSelectedInsight(insights.find(i => i.id === e.target.value))}
          >
            {insights.map(i => (
              <option key={i.id} value={i.id}>
                Aula de {new Date(i.sessions?.scheduled_date || i.created_at).toLocaleDateString('pt-BR')}
              </option>
            ))}
          </select>
        )}
      </motion.div>

      {!selectedInsight ? (
        <GlassCard className="p-12 text-center">
          <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Nenhum Insight Encontrado</h2>
          <p className="text-slate-500 mt-2">Você ainda não possui aulas analisadas pela nossa IA. Faça sua primeira aula para ver seu relatório!</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Summary & Corrections */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Resumo de Conquistas - Conciso e Suave */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 md:p-7 relative overflow-hidden bg-gradient-to-tr from-emerald-500/10 via-primary-500/5 to-transparent border-slate-200/80 shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-primary-500">
                  <Brain className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
                      {isBeginner ? 'Resumo de Conquistas' : 'Lesson Summary & Achievements'}
                    </h2>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      {isBeginner ? 'Progresso Contínuo' : 'Steady Progress'}
                    </span>
                  </div>
                  <p className="text-slate-650 leading-relaxed text-base font-medium">
                    {cleanGentleInsight(selectedInsight.summary, isBeginner) || (isBeginner ? 'Ótima dedicação na aula de hoje! Continue praticando com entusiasmo.' : 'Great engagement in today’s session! Keep practicing with confidence.')}
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            {/* Como soar mais natural - PRESERVADO COMO ESTÁ */}
            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" /> Como soar mais natural
              </h3>
              <div className="space-y-4">
                {selectedInsight.grammar_errors?.length > 0 ? (
                  selectedInsight.grammar_errors.map((error: any, idx: number) => (
                    <GlassCard key={idx} className="p-5 overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
                      <div className="pl-2 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Você expressou</span>
                            <div className="text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm font-medium">
                              {error.mistake}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Forma recomendada
                            </span>
                            <div className="text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded-lg px-3 py-1.5 text-sm font-bold">
                              {error.correction}
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mt-2 pt-2 border-t border-slate-100/60">
                          {cleanGentleInsight(error.explanation, isBeginner)}
                        </p>
                      </div>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard className="p-6 text-center text-slate-500">
                    Sua fala está excelente! Não há pontos de destaque para lapidar no momento.
                  </GlassCard>
                )}
              </div>
            </motion.div>
          </div>

          {/* Side Column - Scores, Practice Focus & Actions */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4 flex flex-col justify-between items-center min-h-[110px]">
                <div className="text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {isBeginner ? 'Fluência' : 'Fluency'}
                  </p>
                  <div className="text-3xl font-black text-primary-600">
                    {selectedInsight.fluency_score || 0}<span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
                <div className={`text-[9px] font-bold text-center mt-2 px-2 py-0.5 rounded-full border ${getFluencyFeedback(selectedInsight.fluency_score || 0, isBeginner).color}`}>
                  {getFluencyFeedback(selectedInsight.fluency_score || 0, isBeginner).status}
                </div>
              </GlassCard>
              <GlassCard className="p-4 flex flex-col justify-between items-center min-h-[110px]">
                <div className="text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {isBeginner ? 'Confiança' : 'Confidence'}
                  </p>
                  <div className="text-3xl font-black text-purple-600">
                    {selectedInsight.confidence_score || 0}<span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
                <div className={`text-[9px] font-bold text-center mt-2 px-2 py-0.5 rounded-full border ${getConfidenceFeedback(selectedInsight.confidence_score || 0, isBeginner).color}`}>
                  {getConfidenceFeedback(selectedInsight.confidence_score || 0, isBeginner).status}
                </div>
              </GlassCard>
            </motion.div>

            {/* Focos Amigáveis de Prática - Resumidos e Suaves */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    {isBeginner ? 'Próximos Passos de Evolução' : 'Practice Focus'}
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                    {isBeginner ? 'Dicas suaves' : 'Friendly tips'}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {selectedInsight.main_weaknesses?.length > 0 ? (
                    selectedInsight.main_weaknesses.slice(0, 3).map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 bg-amber-50/40 hover:bg-amber-50/70 border border-amber-100/70 p-3 rounded-xl transition-all">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{cleanGentleInsight(weakness, isBeginner)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">
                      {isBeginner ? 'Tudo fluindo super bem! Sem pontos críticos nesta aula.' : 'Great job! No critical focus points recorded for this lesson.'}
                    </li>
                  )}
                </ul>
              </GlassCard>
            </motion.div>

            {/* Sugestões de Temas */}
            {selectedInsight.recommended_topics?.length > 0 && (
              <motion.div variants={itemVariants}>
                <GlassCard className="p-6">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                    {isBeginner ? 'Sugestões de Temas' : 'Suggested Topics'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedInsight.recommended_topics.map((topic: string, idx: number) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-1 rounded-lg font-medium">
                        {topic}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Suas Próximas Ações */}
            {selectedInsight.next_actions?.length > 0 && (
              <motion.div variants={itemVariants}>
                <GlassCard className="p-6">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-500" />
                    {isBeginner ? 'Suas Próximas Ações' : 'Next Actions'}
                  </h3>
                  <ul className="space-y-2">
                    {selectedInsight.next_actions.map((action: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-650 font-medium">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                        <span>{cleanGentleInsight(action, isBeginner)}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            )}

            {/* Sugestões de Vocabulário */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  {isBeginner ? 'Sugestões de Vocabulário' : 'Vocabulary Spotlight'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.vocabulary_suggestions?.length > 0 ? (
                    selectedInsight.vocabulary_suggestions.map((vocab: any, idx: number) => (
                      <div key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200">
                        {vocab.word || vocab}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      {isBeginner ? 'Nenhuma sugestão adicional.' : 'No additional suggestions.'}
                    </p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

