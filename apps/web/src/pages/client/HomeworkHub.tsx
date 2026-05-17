import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { BookOpen, CheckCircle, Clock, PlayCircle, Trophy } from 'lucide-react'

const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${className}`}>
    {children}
  </div>
)

export default function HomeworkHub() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<any[]>([])

  useEffect(() => {
    const fetchHomeworks = async () => {
      if (!session) return
      
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!patient) return

      const { data: plans } = await supabase
        .from('homework_plans')
        .select('*, sessions(scheduled_date)')
        .eq('patient_id', patient.id)
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false })

      if (plans) setHomeworks(plans)
      setLoading(false)
    }

    fetchHomeworks()
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
          <BookOpen className="w-8 h-8 text-primary-500" /> Central de Exercícios
        </h1>
        <p className="text-slate-500 mt-1">Exercícios adaptativos criados pela IA especialmente para as suas necessidades.</p>
      </motion.div>

      {homeworks.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Tudo em Dia!</h2>
          <p className="text-slate-500 mt-2">Você não possui exercícios pendentes. Ótimo trabalho!</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworks.map((hw) => {
            const exercisesCount = hw.exercises?.length || 0
            const date = new Date(hw.sessions?.scheduled_date || hw.created_at).toLocaleDateString('pt-BR')
            
            return (
              <motion.div key={hw.id} variants={itemVariants}>
                <GlassCard className="p-6 flex flex-col h-full group hover:-translate-y-1">
                  <div className="mb-auto">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Adaptativo
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Aula de {date}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-xl text-slate-800 mb-2">Revisão e Prática</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Criado a partir da sua aula para fortalecer pontos específicos.
                    </p>
                    
                    <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center mb-6">
                      <span className="text-sm font-medium text-slate-600">Exercícios</span>
                      <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded-md shadow-sm">{exercisesCount}</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 group-hover:bg-primary-600 transition-colors">
                    <PlayCircle className="w-5 h-5" /> Iniciar Prática
                  </button>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
