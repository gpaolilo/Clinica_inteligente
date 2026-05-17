import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Brain, CheckCircle, TrendingUp, AlertTriangle, MessageSquare, Mic, AlertCircle } from 'lucide-react'

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${className}`}>
    {children}
  </div>
)

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
              <GlassCard className="p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 text-white border-none">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Brain className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2 text-white">Resumo da Aula</h2>
                  <p className="text-primary-50 leading-relaxed text-lg">
                    {selectedInsight.summary || 'A IA não gerou um resumo para esta aula.'}
                  </p>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" /> Correções Gramaticais
              </h3>
              <div className="space-y-4">
                {selectedInsight.grammar_errors?.length > 0 ? (
                  selectedInsight.grammar_errors.map((error: any, idx: number) => (
                    <GlassCard key={idx} className="p-5 flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-rose-500 mb-1 font-medium bg-rose-50 w-fit px-3 py-1 rounded-lg text-sm">
                          <span className="line-through">{error.mistake}</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1 rounded-lg">
                          <span>{error.correction}</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-3">{error.explanation}</p>
                      </div>
                    </GlassCard>
                  ))
                ) : (
                  <GlassCard className="p-6 text-center text-slate-500">
                    Nenhum erro gramatical de destaque! Excelente trabalho.
                  </GlassCard>
                )}
              </div>
            </motion.div>
          </div>

          {/* Side Column - Scores & Vocab */}
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <GlassCard className="p-5 text-center">
                <p className="text-slate-500 text-sm font-bold mb-1">Fluência</p>
                <div className="text-4xl font-black text-primary-600">{selectedInsight.fluency_score || 0}<span className="text-lg text-slate-400">%</span></div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <p className="text-slate-500 text-sm font-bold mb-1">Confiança</p>
                <div className="text-4xl font-black text-purple-600">{selectedInsight.confidence_score || 0}<span className="text-lg text-slate-400">%</span></div>
              </GlassCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" /> Pontos a Melhorar
                </h3>
                <ul className="space-y-3">
                  {selectedInsight.main_weaknesses?.length > 0 ? (
                    selectedInsight.main_weaknesses.map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-500">Nenhum ponto registrado.</li>
                  )}
                </ul>
              </GlassCard>
            </motion.div>

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
