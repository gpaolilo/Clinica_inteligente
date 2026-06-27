import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Brain, Sparkles, Target, MessageSquare, BookOpen, ArrowRight, ChevronRight } from 'lucide-react'

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${className}`}>
    {children}
  </div>
)

const getFluencyFeedback = (score: number) => {
  if (score >= 85) return { status: 'Excelente fluxo!', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' }
  if (score >= 70) return { status: 'Boa comunicação!', color: 'text-primary-700 bg-primary-50 border-primary-100' }
  return { status: 'A caminho do topo! Continue praticando.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
}

const getConfidenceFeedback = (score: number) => {
  if (score >= 85) return { status: 'Postura excelente!', color: 'text-purple-700 bg-purple-50 border-purple-100' }
  if (score >= 70) return { status: 'Muito seguro!', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' }
  return { status: 'Ótimo começo! Confiança vem com o tempo.', color: 'text-amber-700 bg-amber-50 border-amber-100' }
}

export default function LessonInsights() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<any[]>([])
  const [selectedInsight, setSelectedInsight] = useState<any>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!session) return
      
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!patient) return

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
          <p className="text-slate-500 mt-1">Análise detalhada do seu desempenho nas aulas com a Inteligência Artificial.</p>
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
            <motion.div variants={itemVariants}>
              <GlassCard className="p-6 md:p-8 relative overflow-hidden bg-gradient-to-tr from-emerald-500/10 via-primary-500/5 to-transparent border-slate-200/80 shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-primary-500">
                  <Brain className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-2">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" /> Resumo de Conquistas
                  </h2>
                  <p className="text-slate-650 leading-relaxed text-base">
                    {selectedInsight.summary || 'A IA não gerou um resumo para esta aula.'}
                  </p>
                </div>
              </GlassCard>
            </motion.div>

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
                        <p className="text-slate-500 text-sm leading-relaxed mt-2 pt-2 border-t border-slate-100/60">{error.explanation}</p>
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

          {/* Side Column - Scores & Vocab */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4 flex flex-col justify-between items-center min-h-[110px]">
                <div className="text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Fluência</p>
                  <div className="text-3xl font-black text-primary-600">
                    {selectedInsight.fluency_score || 0}<span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
                <div className={`text-[9px] font-bold text-center mt-2 px-2 py-0.5 rounded-full border ${getFluencyFeedback(selectedInsight.fluency_score || 0).color}`}>
                  {getFluencyFeedback(selectedInsight.fluency_score || 0).status}
                </div>
              </GlassCard>
              <GlassCard className="p-4 flex flex-col justify-between items-center min-h-[110px]">
                <div className="text-center">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Confiança</p>
                  <div className="text-3xl font-black text-purple-600">
                    {selectedInsight.confidence_score || 0}<span className="text-sm text-slate-400">%</span>
                  </div>
                </div>
                <div className={`text-[9px] font-bold text-center mt-2 px-2 py-0.5 rounded-full border ${getConfidenceFeedback(selectedInsight.confidence_score || 0).color}`}>
                  {getConfidenceFeedback(selectedInsight.confidence_score || 0).status}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" /> Focos de Prática
                </h3>
                <ul className="space-y-3">
                  {selectedInsight.main_weaknesses?.length > 0 ? (
                    selectedInsight.main_weaknesses.map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/40 p-2.5 rounded-xl transition-all">
                        <ChevronRight className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">Nenhum foco de atenção registrado.</li>
                  )}
                </ul>
              </GlassCard>
            </motion.div>

            {selectedInsight.recommended_topics?.length > 0 && (
              <motion.div variants={itemVariants}>
                <GlassCard className="p-6">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-500" /> Sugestões de Temas
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

            {selectedInsight.next_actions?.length > 0 && (
              <motion.div variants={itemVariants}>
                <GlassCard className="p-6">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-500" /> Suas Próximas Ações
                  </h3>
                  <ul className="space-y-2">
                    {selectedInsight.next_actions.map((action: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-650 font-medium">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" /> Sugestões de Vocabulário
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInsight.vocabulary_suggestions?.length > 0 ? (
                    selectedInsight.vocabulary_suggestions.map((vocab: any, idx: number) => (
                      <div key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200">
                        {vocab.word || vocab}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Nenhuma sugestão.</p>
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
