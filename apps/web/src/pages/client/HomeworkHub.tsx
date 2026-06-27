import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { BookOpen, CheckCircle, Clock, PlayCircle, Trophy, ArrowLeft, Send, Award, Sparkles, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 rounded-[24px] overflow-hidden ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
  >
    {children}
  </div>
)

export default function HomeworkHub() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [completedHomeworks, setCompletedHomeworks] = useState<Record<string, any>>({})
  
  // Estados para a Prática de Exercícios
  const [activeHomework, setActiveHomework] = useState<any | null>(null)
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState<number>(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [checkedExercises, setCheckedExercises] = useState<boolean[]>([])
  const [isCorrectArray, setIsCorrectArray] = useState<boolean[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showResultsScreen, setShowResultsScreen] = useState(false)
  const [finalScore, setFinalScore] = useState<number>(0)
  const [xpEarned, setXpEarned] = useState<number>(0)

  const fetchHomeworks = async () => {
    if (!session) return
    setLoading(true)
    
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (patientError) {
      console.error("Error fetching patient profile for user_id:", session.user.id, patientError)
    }

    if (!patient) {
      setLoading(false)
      return
    }

    const { data: plans } = await supabase
      .from('homework_plans')
      .select('*, sessions(scheduled_date)')
      .eq('patient_id', patient.id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })

    const { data: results } = await supabase
      .from('homework_results')
      .select('homework_plan_id, score, completed_at')
      .eq('patient_id', patient.id)

    if (plans) setHomeworks(plans)
    
    if (results) {
      const resultsMap = results.reduce((acc: Record<string, any>, r: any) => {
        // Guardar o resultado (preferencialmente com maior score ou mais recente)
        if (!acc[r.homework_plan_id] || new Date(r.completed_at) > new Date(acc[r.homework_plan_id].completed_at)) {
          acc[r.homework_plan_id] = r
        }
        return acc
      }, {})
      setCompletedHomeworks(resultsMap)
    }

    // Verificar se há parâmetros na URL para auto-iniciar prática do dashboard
    const searchParams = new URLSearchParams(window.location.search)
    const startParam = searchParams.get('start')
    const idParam = searchParams.get('id')

    if (plans && startParam === 'true' && idParam) {
      const planToStart = plans.find((p: any) => p.id === idParam)
      if (planToStart) {
        window.history.replaceState(null, '', '/client/homework')
        // Iniciar prática
        setActiveHomework(planToStart)
        setCurrentExerciseIdx(0)
        setAnswers(new Array(planToStart.exercises?.length || 0).fill(''))
        setCheckedExercises(new Array(planToStart.exercises?.length || 0).fill(false))
        setIsCorrectArray(new Array(planToStart.exercises?.length || 0).fill(false))
        setShowResultsScreen(false)
        setFinalScore(0)
        setXpEarned(0)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchHomeworks()
  }, [session])

  const handleStartPractice = (hw: any) => {
    setActiveHomework(hw)
    setCurrentExerciseIdx(0)
    setAnswers(new Array(hw.exercises?.length || 0).fill(''))
    setCheckedExercises(new Array(hw.exercises?.length || 0).fill(false))
    setIsCorrectArray(new Array(hw.exercises?.length || 0).fill(false))
    setShowResultsScreen(false)
    setFinalScore(0)
    setXpEarned(0)
  }

  const handleVerifyAnswer = () => {
    if (!activeHomework) return
    const currentEx = activeHomework.exercises[currentExerciseIdx]
    const userAnswer = (answers[currentExerciseIdx] || '').trim().toLowerCase()
    const correctAnswer = (currentEx.answer || '').trim().toLowerCase()
    
    // Escrita, fala, reflexão, bônus ou cenário são auto-aceitos (sem checagem estrita de strings)
    const isAutomaticType = ['writing', 'speaking', 'reflection', 'bonus', 'scenario'].includes(currentEx.type)
    
    // Comparação simples sem levar em conta acentos ou espaços extras
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").replace(/\s+/g," ")
    
    const isCorrect = isAutomaticType ? true : normalize(userAnswer) === normalize(correctAnswer)

    const newChecked = [...checkedExercises]
    newChecked[currentExerciseIdx] = true
    setCheckedExercises(newChecked)

    const newIsCorrect = [...isCorrectArray]
    newIsCorrect[currentExerciseIdx] = isCorrect
    setIsCorrectArray(newIsCorrect)
  }

  const handleOverrideCorrection = (isCorrect: boolean) => {
    const newIsCorrect = [...isCorrectArray]
    newIsCorrect[currentExerciseIdx] = isCorrect
    setIsCorrectArray(newIsCorrect)
  }

  const handleNext = () => {
    if (!activeHomework) return
    if (currentExerciseIdx < activeHomework.exercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1)
    }
  }

  const handleFinish = async () => {
    if (!activeHomework || !session) return
    setSubmitting(true)
    
    const correctCount = isCorrectArray.filter(Boolean).length
    const totalExercises = activeHomework.exercises.length
    const scorePercentage = parseFloat(((correctCount / totalExercises) * 100).toFixed(1))
    const totalXp = correctCount * 15 // 15 XP por acerto
    
    try {
      // 1. Salvar os resultados em homework_results
      const { error: insertError } = await supabase
        .from('homework_results')
        .insert([{
          homework_plan_id: activeHomework.id,
          psychologist_id: activeHomework.psychologist_id,
          patient_id: activeHomework.patient_id,
          exercises_results: activeHomework.exercises.map((ex: any, idx: number) => ({
            question: ex.question,
            user_answer: answers[idx] || '',
            is_correct: isCorrectArray[idx] || false,
            answer: ex.answer,
            explanation: ex.explanation,
            type: ex.type
          })),
          score: scorePercentage,
          completed_at: new Date().toISOString()
        }])

      if (insertError) throw insertError

      // 2. Atualizar XP e Nível na tabela gamification_profiles
      try {
        const { data: gamification, error: gError } = await supabase
          .from('gamification_profiles')
          .select('xp, level')
          .eq('patient_id', activeHomework.patient_id)
          .single()

        if (gError && gError.code !== 'PGRST116') throw gError

        if (gamification) {
          const currentXp = gamification.xp || 0
          const newXp = currentXp + totalXp
          // Cada 100 XP sobe um nível
          const newLevel = Math.floor(newXp / 100) + 1
          
          await supabase
            .from('gamification_profiles')
            .update({
              xp: newXp,
              level: newLevel,
              last_practice_date: new Date().toISOString()
            })
            .eq('patient_id', activeHomework.patient_id)
        } else {
          // Caso não exista, cria um perfil básico
          await supabase
            .from('gamification_profiles')
            .insert([{
              patient_id: activeHomework.patient_id,
              xp: totalXp,
              level: Math.floor(totalXp / 100) + 1,
              last_practice_date: new Date().toISOString()
            }])
        }
      } catch (gErr) {
        console.warn("Erro ao atualizar perfil de gamificação (pode ser contornado):", gErr)
      }

      setFinalScore(scorePercentage)
      setXpEarned(totalXp)
      setShowResultsScreen(true)
    } catch (err: any) {
      console.error("Erro ao salvar exercícios:", err)
      alert("Erro ao concluir dever de casa: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

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

  // MODO 1: Tela de Conclusão / Resultados
  if (activeHomework && showResultsScreen) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto min-h-[80vh] flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
          <GlassCard className="p-8 text-center border-emerald-100 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
            
            <Award className="w-20 h-20 text-emerald-500 mx-auto mb-6 animate-bounce" />
            
            <h1 className="text-3xl font-black text-slate-800 mb-2">Prática Concluída!</h1>
            <p className="text-slate-500 mb-8 font-medium">Você completou seus exercícios adaptativos com sucesso.</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Aproveitamento</span>
                <span className="text-3xl font-black text-slate-800">{finalScore}%</span>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex flex-col justify-center items-center">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Recompensa
                </span>
                <span className="text-3xl font-black text-emerald-700">+{xpEarned} XP</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setActiveHomework(null)
                fetchHomeworks()
              }}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
              Voltar para Central
            </button>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  // MODO 2: Interface Ativa de Resolução de Exercício
  if (activeHomework) {
    const currentEx = activeHomework.exercises[currentExerciseIdx]
    const totalExercises = activeHomework.exercises.length
    const progressPercent = ((currentExerciseIdx + 1) / totalExercises) * 100
    const isChecked = checkedExercises[currentExerciseIdx]
    const isUserCorrect = isCorrectArray[currentExerciseIdx]

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Header da Prática */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => {
              if (window.confirm("Tem certeza que deseja sair? O progresso desta sessão de prática será perdido.")) {
                setActiveHomework(null)
              }
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exercício {currentExerciseIdx + 1} de {totalExercises}
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
            className="bg-tenant-primary h-full rounded-full"
          />
        </div>

        {/* Card do Exercício */}
        <motion.div 
          key={currentExerciseIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6 md:p-8 space-y-6">
            {/* Categoria */}
            {/* Categoria & Seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-black uppercase tracking-wider">
                  {currentEx.section || 'Atividade Adaptativa'}
                </span>
                <span className={clsx(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                  currentEx.type === 'grammar' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  currentEx.type === 'vocabulary' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-blue-50 text-blue-600 border border-blue-100'
                )}>
                  {currentEx.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isChecked && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${isUserCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {isUserCorrect ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {isUserCorrect ? 'Concluído' : 'Revisar'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {currentEx.time_estimate || 2} min • +{currentEx.xp_reward || 15} XP
                </span>
              </div>
            </div>

            {/* Pergunta */}
            <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-snug">
              {currentEx.question}
            </h2>

            {/* Campo de Resposta */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Sua Resposta</label>
              {currentEx.type === 'speaking' ? (
                <div className="bg-slate-50 border border-slate-200/60 rounded-[20px] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 justify-center py-2">
                    <button
                      type="button"
                      disabled={isChecked}
                      onClick={() => {
                        const newAnswers = [...answers]
                        newAnswers[currentExerciseIdx] = "Gravação de áudio registrada e processada pela IA: " + currentEx.answer
                        setAnswers(newAnswers)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <PlayCircle className="w-4 h-4" /> Simular Gravação de Fala
                    </button>
                    <span className="text-xs text-slate-400 font-semibold">Ou digite sua resposta abaixo</span>
                  </div>
                  <textarea 
                    disabled={isChecked}
                    value={answers[currentExerciseIdx] || ''}
                    onChange={(e) => {
                      const newAnswers = [...answers]
                      newAnswers[currentExerciseIdx] = e.target.value
                      setAnswers(newAnswers)
                    }}
                    rows={2}
                    placeholder="Transcreva ou escreva sua resposta aqui..."
                    className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-tenant-primary outline-none transition-all text-slate-800 font-medium text-sm resize-none"
                  />
                </div>
              ) : (
                <textarea 
                  disabled={isChecked}
                  value={answers[currentExerciseIdx] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers]
                    newAnswers[currentExerciseIdx] = e.target.value
                    setAnswers(newAnswers)
                  }}
                  rows={currentEx.type === 'writing' ? 6 : 3}
                  placeholder={
                    currentEx.type === 'writing' ? "Escreva sua redação, email ou produção escrita aqui..." :
                    currentEx.type === 'reflection' ? "Reflita e escreva sua opinião aqui..." :
                    "Escreva sua resposta em inglês aqui..."
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[20px] focus:bg-white focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-slate-800 font-medium shadow-sm resize-none disabled:opacity-75 disabled:bg-slate-50/50"
                />
              )}
            </div>

            {/* Feedback / Correção */}
            {isChecked && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 border-t border-slate-100 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Gabarito</span>
                    <p className="text-emerald-900 font-bold">{currentEx.answer}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Feedback do Sistema</span>
                    <p className="text-slate-700 text-sm font-semibold">
                      {['writing', 'speaking', 'reflection', 'bonus', 'scenario'].includes(currentEx.type)
                        ? 'Excelente! Sua produção foi registrada e será computada nos seus relatórios de progresso.'
                        : isUserCorrect 
                          ? 'Excelente! Resposta equivalente ao gabarito.' 
                          : 'A resposta digitada divergiu do padrão. Você pode ajustar abaixo se considerar que estava correta.'}
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">Explicação Teórica</span>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">{currentEx.explanation}</p>
                </div>

                {/* Sobrescrever Correção Manual */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                  <span>A correção da IA estava correta?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOverrideCorrection(true)}
                      className={`px-3 py-1.5 rounded-lg border transition-all ${isUserCorrect ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                      Marcar como Certo
                    </button>
                    <button 
                      onClick={() => handleOverrideCorrection(false)}
                      className={`px-3 py-1.5 rounded-lg border transition-all ${!isUserCorrect ? 'bg-rose-500 text-white border-rose-500' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                      Marcar como Errado
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Ações */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              {!isChecked ? (
                <button 
                  onClick={handleVerifyAnswer}
                  disabled={!(answers[currentExerciseIdx] || '').trim()}
                  className="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Verificar Resposta
                </button>
              ) : (
                currentExerciseIdx < totalExercises - 1 ? (
                  <button 
                    onClick={handleNext}
                    className="bg-tenant-primary text-white font-bold py-3.5 px-8 rounded-xl hover:bg-tenant-primary-hover transition-colors shadow-md flex items-center gap-2"
                  >
                    Próximo Exercício
                  </button>
                ) : (
                  <button 
                    onClick={handleFinish}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? 'Salvando...' : 'Concluir Prática'}
                  </button>
                )
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  // MODO 3: Listagem de Exercícios Disponíveis (Estado Inicial)
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
            const result = completedHomeworks[hw.id]
            
            return (
              <motion.div key={hw.id} variants={itemVariants}>
                <GlassCard className="p-6 flex flex-col h-full group hover:-translate-y-1">
                  <div className="mb-auto">
                    <div className="flex justify-between items-start mb-4">
                      {result ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Concluído ({result.score}%)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-550" /> +{hw.exercises?.reduce((sum: number, ex: any) => sum + (ex.xp_reward || 15), 0)} XP
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" /> Aula de {date}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-xl text-slate-800 mb-2">Revisão e Prática</h3>
                    <p className="text-slate-500 text-sm mb-4 font-medium">
                      Criado a partir da sua aula para fortalecer pontos específicos de gramática, vocabulário e conversação.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Questões</span>
                        <span className="font-black text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">{exercisesCount}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">Duração</span>
                        <span className="font-black text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                          {hw.exercises?.reduce((sum: number, ex: any) => sum + (ex.time_estimate || 2), 0)} min
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleStartPractice(hw)}
                    className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg ${
                      result 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/60' 
                        : 'bg-slate-900 text-white hover:bg-tenant-primary'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5" /> 
                    {result ? 'Refazer Prática' : 'Iniciar Prática'}
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

