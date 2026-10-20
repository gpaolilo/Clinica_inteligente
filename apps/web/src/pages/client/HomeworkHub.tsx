import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  BookOpen, CheckCircle, CheckCircle2, Clock, PlayCircle, Trophy, 
  ArrowLeft, ArrowRight, Award, Sparkles, AlertCircle, RefreshCw, 
  RotateCcw, X, Mic, Play, Check 
} from 'lucide-react'
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
  const [evaluatingIndex, setEvaluatingIndex] = useState<number | null>(null)
  const [writingEvaluations, setWritingEvaluations] = useState<Record<number, any>>({})

  // Estados para Caixas de Palavras e Opções Interativas (estilo Teste de Nivelamento Flowike)
  const [placedBoxesMap, setPlacedBoxesMap] = useState<Record<number, string[]>>({})
  const [wordBanksMap, setWordBanksMap] = useState<Record<number, { id: string, text: string }[]>>({})
  const [optionsMap, setOptionsMap] = useState<Record<number, string[]>>({})


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

  // Determinar o formato do exercício (Múltipla Escolha Tagged, Mover Caixas de Palavras, Fala ou Escrita)
  const getExerciseFormat = (ex: any): 'multiple_choice' | 'reorder_boxes' | 'speaking' | 'writing' => {
    if (!ex) return 'multiple_choice'
    if (ex.format === 'reorder_boxes' || (Array.isArray(ex.word_bank) && ex.word_bank.length >= 2)) {
      return 'reorder_boxes'
    }
    if (ex.format === 'multiple_choice' || (Array.isArray(ex.options) && ex.options.length >= 2)) {
      return 'multiple_choice'
    }
    if (ex.type === 'speaking') return 'speaking'
    if (ex.type === 'writing' || ex.type === 'reflection') return 'writing'

    // Detecção dinâmica inteligente
    const cleanAnswer = (ex.answer || '').trim()
    const words = cleanAnswer.split(/\s+/).filter(Boolean)
    const isUnscramblePrompt = (ex.question || '').toLowerCase().includes('order') || 
                               (ex.question || '').toLowerCase().includes('unscramble') ||
                               (ex.question || '').toLowerCase().includes('organize') ||
                               (ex.section || '').toLowerCase().includes('mistake') ||
                               (words.length >= 3 && words.length <= 12)

    if (isUnscramblePrompt) return 'reorder_boxes'
    if (words.length > 12) return 'writing'
    return 'multiple_choice'
  }

  // Obter ou gerar a lista de caixas de palavras disponíveis para o exercício
  const getWordBankForExercise = (ex: any, idx: number): { id: string, text: string }[] => {
    if (wordBanksMap[idx]) return wordBanksMap[idx]

    let rawWords: string[] = []
    if (Array.isArray(ex.word_bank) && ex.word_bank.length > 0) {
      rawWords = [...ex.word_bank]
    } else if (ex.answer) {
      const cleaned = (ex.answer || '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).filter(Boolean)
      const shuffled = [...cleaned]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      rawWords = shuffled
    }

    const resolved = rawWords.map((w, wIdx) => ({
      id: `wbox-${idx}-${wIdx}-${w}`,
      text: w
    }))

    wordBanksMap[idx] = resolved
    return resolved
  }

  // Obter ou gerar opções de múltipla escolha
  const getOptionsForExercise = (ex: any, idx: number): string[] => {
    if (optionsMap[idx]) return optionsMap[idx]

    let opts: string[] = []
    if (Array.isArray(ex.options) && ex.options.length >= 2) {
      opts = [...ex.options]
    } else if (ex.answer) {
      const correct = (ex.answer || '').trim()
      opts = [correct, 'None of the above', 'Both options are correct', 'Neither option applies']
    }

    optionsMap[idx] = opts
    return opts
  }

  const handleStartPractice = (hw: any) => {
    setActiveHomework(hw)
    setCurrentExerciseIdx(0)
    setAnswers(new Array(hw.exercises?.length || 0).fill(''))
    setCheckedExercises(new Array(hw.exercises?.length || 0).fill(false))
    setIsCorrectArray(new Array(hw.exercises?.length || 0).fill(false))
    setPlacedBoxesMap({})
    setWordBanksMap({})
    setOptionsMap({})
    setShowResultsScreen(false)
    setFinalScore(0)
    setXpEarned(0)
  }

  // Manipulação de caixas de palavras (mover para a resposta e devolver à gaveta)
  const handleAddWordBox = (box: { id: string, text: string }) => {
    const isChecked = checkedExercises[currentExerciseIdx]
    if (isChecked) return

    const currentPlaced = placedBoxesMap[currentExerciseIdx] || []
    if (currentPlaced.includes(box.id)) return

    const nextPlaced = [...currentPlaced, box.id]
    setPlacedBoxesMap(prev => ({ ...prev, [currentExerciseIdx]: nextPlaced }))

    const bank = getWordBankForExercise(activeHomework.exercises[currentExerciseIdx], currentExerciseIdx)
    const assembledText = nextPlaced.map(id => bank.find(b => b.id === id)?.text).filter(Boolean).join(' ')

    const nextAnswers = [...answers]
    nextAnswers[currentExerciseIdx] = assembledText
    setAnswers(nextAnswers)
  }

  const handleRemoveWordBox = (removeIndex: number) => {
    const isChecked = checkedExercises[currentExerciseIdx]
    if (isChecked) return

    const currentPlaced = placedBoxesMap[currentExerciseIdx] || []
    const nextPlaced = currentPlaced.filter((_, i) => i !== removeIndex)
    setPlacedBoxesMap(prev => ({ ...prev, [currentExerciseIdx]: nextPlaced }))

    const bank = getWordBankForExercise(activeHomework.exercises[currentExerciseIdx], currentExerciseIdx)
    const assembledText = nextPlaced.map(id => bank.find(b => b.id === id)?.text).filter(Boolean).join(' ')

    const nextAnswers = [...answers]
    nextAnswers[currentExerciseIdx] = assembledText
    setAnswers(nextAnswers)
  }

  const handleClearWordBoxes = () => {
    const isChecked = checkedExercises[currentExerciseIdx]
    if (isChecked) return

    setPlacedBoxesMap(prev => ({ ...prev, [currentExerciseIdx]: [] }))
    const nextAnswers = [...answers]
    nextAnswers[currentExerciseIdx] = ''
    setAnswers(nextAnswers)
  }

  const handleVerifyAnswer = async () => {
    if (!activeHomework) return
    const currentEx = activeHomework.exercises[currentExerciseIdx]
    const rawUserAnswer = (answers[currentExerciseIdx] || '').trim()
    const format = getExerciseFormat(currentEx)

    let isCorrect = false

    if (format === 'multiple_choice') {
      isCorrect = rawUserAnswer.toLowerCase() === (currentEx.answer || '').trim().toLowerCase()
    } else if (format === 'reorder_boxes') {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").toLowerCase().replace(/\s+/g," ").trim()
      isCorrect = normalize(rawUserAnswer) === normalize(currentEx.answer || '')
    } else if (format === 'writing' || format === 'speaking') {
      isCorrect = rawUserAnswer.length > 0
      if (format === 'writing' && rawUserAnswer.length > 5) {
        setEvaluatingIndex(currentExerciseIdx)
        try {
          const { StudentEngine } = await import('../../lib/student-engine-client')
          const evalResult = await StudentEngine.evaluateWriting(currentEx.question, rawUserAnswer, 'Intermediate')
          setWritingEvaluations(prev => ({ ...prev, [currentExerciseIdx]: evalResult }))
        } catch (err) {
          console.error("Failed to run grammar evaluation:", err)
        } finally {
          setEvaluatingIndex(null)
        }
      }
    }

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

  // MODO 2: Interface Ativa de Resolução de Exercício (Método e Design do Teste de Nivelamento Flowike)
  if (activeHomework) {
    const currentEx = activeHomework.exercises[currentExerciseIdx]
    const totalExercises = activeHomework.exercises.length
    const progressPercent = ((currentExerciseIdx + 1) / totalExercises) * 100
    const isChecked = checkedExercises[currentExerciseIdx]
    const isUserCorrect = isCorrectArray[currentExerciseIdx]
    const format = getExerciseFormat(currentEx)

    // Data para Múltipla Escolha
    const options = getOptionsForExercise(currentEx, currentExerciseIdx)
    const selectedOption = answers[currentExerciseIdx] || ''

    // Data para Mover Caixas de Palavras
    const wordBank = getWordBankForExercise(currentEx, currentExerciseIdx)
    const placedBoxIds = placedBoxesMap[currentExerciseIdx] || []
    const placedBoxes = placedBoxIds.map(id => wordBank.find(b => b.id === id)).filter(Boolean) as { id: string, text: string }[]

    // Checagem de prontidão para verificar
    const canVerify = format === 'multiple_choice' 
      ? Boolean(selectedOption)
      : format === 'reorder_boxes'
        ? placedBoxes.length > 0
        : Boolean((answers[currentExerciseIdx] || '').trim())

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Top Header estilo Flowike Placement Test */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                F
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Flowike Homework Challenge</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Exercício {currentExerciseIdx + 1} de {totalExercises} • {currentEx.section || 'Atividade Adaptativa'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                if (window.confirm("Deseja pausar esta prática? Você poderá retornar depois.")) {
                  setActiveHomework(null)
                }
              }}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progresso Suave */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>{Math.round(progressPercent)}% Concluído</span>
              <span>+{currentEx.xp_reward || 15} XP nesta questão</span>
            </div>
          </div>
        </div>

        {/* Card Principal do Exercício */}
        <motion.div 
          key={currentExerciseIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 md:p-8 shadow-md space-y-6">
            {/* Header da Questão com Badges de Categoria */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  {currentEx.section || 'Prática de Fixação'}
                </span>
                <span className={clsx(
                  "text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md",
                  format === 'reorder_boxes' ? 'bg-violet-50 text-violet-700' :
                  format === 'multiple_choice' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-amber-50 text-amber-700'
                )}>
                  {format === 'reorder_boxes' ? 'Mover Caixas de Palavras' :
                   format === 'multiple_choice' ? 'Múltipla Escolha' :
                   format === 'speaking' ? 'Fala em Inglês' : 'Produção Textual'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isChecked && (
                  <span className={clsx(
                    "text-xs font-black flex items-center gap-1 px-3 py-1 rounded-xl",
                    isUserCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                  )}>
                    {isUserCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                    {isUserCorrect ? 'Correto' : 'Revisar'}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {currentEx.time_estimate || 2} min • +{currentEx.xp_reward || 15} XP
                </span>
              </div>
            </div>

            {/* Título e Pergunta em Destaque */}
            <div className="space-y-1">
              {currentEx.title && (
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {currentEx.title}
                </h4>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {currentEx.question}
              </h2>
            </div>

            {/* ======================================================== */}
            {/* FORMATO 1: MÚLTIPLA ESCOLHA (OPÇÕES TAGGED)             */}
            {/* ======================================================== */}
            {format === 'multiple_choice' && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-1 block">
                  Escolha uma das opções abaixo:
                </span>
                <div className="space-y-2.5">
                  {options.map((opt: string, optIdx: number) => {
                    const isSelected = selectedOption === opt
                    const isCorrectAnswer = (opt || '').trim().toLowerCase() === (currentEx.answer || '').trim().toLowerCase()

                    return (
                      <button
                        key={optIdx}
                        disabled={isChecked}
                        onClick={() => {
                          const newAnswers = [...answers]
                          newAnswers[currentExerciseIdx] = opt
                          setAnswers(newAnswers)
                        }}
                        className={clsx(
                          "w-full p-4 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between cursor-pointer",
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50/60",
                          isChecked && isCorrectAnswer && "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20",
                          isChecked && isSelected && !isCorrectAnswer && "bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={clsx(
                            "w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border transition-colors",
                            isSelected 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                            {['A', 'B', 'C', 'D', 'E'][optIdx] || optIdx + 1}
                          </span>
                          <span className="text-sm font-bold leading-normal">{opt}</span>
                        </div>

                        <span className={clsx(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                        )}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* FORMATO 2: CAIXAS DE PALAVRAS PARA MOVER (REORDER)      */}
            {/* ======================================================== */}
            {format === 'reorder_boxes' && (
              <div className="space-y-4 pt-2">
                {/* Área da Resposta (Caixas Movidas) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Sua Resposta (Ordem das Caixas):
                    </span>
                    {placedBoxes.length > 0 && !isChecked && (
                      <button
                        onClick={handleClearWordBoxes}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Reiniciar Caixas
                      </button>
                    )}
                  </div>

                  <div className={clsx(
                    "min-h-[88px] p-4 bg-slate-50/70 border-2 border-dashed rounded-2xl flex flex-wrap gap-2.5 items-center transition-all",
                    placedBoxes.length === 0 ? "border-slate-200 justify-center text-center" : "border-indigo-200 bg-indigo-50/20"
                  )}>
                    {placedBoxes.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 select-none">
                        Toque nas caixas de palavras abaixo para organizar sua resposta
                      </p>
                    ) : (
                      <AnimatePresence>
                        {placedBoxes.map((box, bIdx) => (
                          <motion.button
                            key={`${box.id}-${bIdx}`}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            disabled={isChecked}
                            onClick={() => handleRemoveWordBox(bIdx)}
                            className={clsx(
                              "px-4 py-2.5 rounded-xl font-black text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer",
                              isChecked
                                ? (isUserCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")
                                : "bg-indigo-600 hover:bg-rose-600 text-white hover:shadow-md"
                            )}
                            title="Toque para devolver à gaveta"
                          >
                            <span>{box.text}</span>
                            {!isChecked && <X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Gaveta de Caixas de Palavras Disponíveis */}
                {!isChecked && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-1 block">
                      Caixas de Palavras Disponíveis (toque para mover):
                    </span>
                    <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl">
                      {wordBank.map((box) => {
                        const isPlaced = placedBoxIds.includes(box.id)
                        return (
                          <button
                            key={box.id}
                            disabled={isPlaced}
                            onClick={() => handleAddWordBox(box)}
                            className={clsx(
                              "px-4 py-2.5 rounded-xl font-black text-sm transition-all",
                              isPlaced
                                ? "bg-slate-200/50 border-2 border-dashed border-slate-300/60 text-transparent cursor-default opacity-30 select-none"
                                : "bg-white hover:bg-indigo-50/70 border-2 border-slate-200 hover:border-indigo-400 text-slate-800 shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                            )}
                          >
                            {box.text}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* FORMATO 3: DESAFIO DE FALA COM IA                       */}
            {/* ======================================================== */}
            {format === 'speaking' && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4 text-center">
                <div className="space-y-2">
                  <span className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <Mic className="w-7 h-7" />
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800">Pratique sua Pronúncia em Voz Alta</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Grave sua fala para simular a resposta ou digite sua resposta abaixo.
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    disabled={isChecked}
                    onClick={() => {
                      const newAnswers = [...answers]
                      newAnswers[currentExerciseIdx] = "Gravação de áudio registrada com sucesso: " + currentEx.answer
                      setAnswers(newAnswers)
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" /> Registrar Gravação de Voz
                  </button>
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
                  placeholder="Ou digite sua fala aqui..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium resize-none"
                />
              </div>
            )}

            {/* ======================================================== */}
            {/* FORMATO 4: PRODUÇÃO ESCRITA / DISSERTATIVA               */}
            {/* ======================================================== */}
            {format === 'writing' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Sua Redação / Resposta
                </label>
                <textarea
                  disabled={isChecked}
                  value={answers[currentExerciseIdx] || ''}
                  onChange={(e) => {
                    const newAnswers = [...answers]
                    newAnswers[currentExerciseIdx] = e.target.value
                    setAnswers(newAnswers)
                  }}
                  rows={5}
                  placeholder="Escreva sua resposta detalhada em inglês aqui..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium text-sm shadow-xs resize-none"
                />
              </div>
            )}

            {/* ======================================================== */}
            {/* FEEDBACK & GABARITO (QUANDO VERIFICADO)                  */}
            {/* ======================================================== */}
            {isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 border-t border-slate-100 space-y-4"
              >
                {/* Banner de Resultado */}
                <div className={clsx(
                  "p-4 rounded-2xl border flex items-center justify-between",
                  isUserCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-rose-50 border-rose-200 text-rose-950"
                )}>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      isUserCorrect ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                    )}>
                      {isUserCorrect ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </span>
                    <div>
                      <h4 className="font-black text-sm">
                        {isUserCorrect ? 'Excelente! Resposta Correta' : 'Atenção aos Detalhes'}
                      </h4>
                      <p className="text-xs font-semibold opacity-80">
                        {isUserCorrect 
                          ? `Parabéns! Você ganhou +${currentEx.xp_reward || 15} XP de fluência.` 
                          : 'Revise o gabarito e a explicação didática abaixo para fixar o aprendizado.'}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black px-3 py-1 bg-white/70 rounded-xl border border-black/5">
                    {isUserCorrect ? `+${currentEx.xp_reward || 15} XP` : '0 XP'}
                  </span>
                </div>

                {/* Gabarito correto */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                    Gabarito Oficial:
                  </span>
                  <p className="text-slate-900 font-extrabold text-sm sm:text-base">
                    {currentEx.answer}
                  </p>
                </div>

                {/* Explicação Didática */}
                {currentEx.explanation && (
                  <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">
                      Explicação & Regra Gramatical:
                    </span>
                    <p className="text-slate-700 text-xs sm:text-sm font-medium leading-relaxed">
                      {currentEx.explanation}
                    </p>
                  </div>
                )}

                {/* Feedback Específico de Redação por IA */}
                {writingEvaluations[currentExerciseIdx] && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">
                      Análise de Escrita & Gramática (IA):
                    </span>
                    <p className="text-slate-700 text-xs sm:text-sm font-medium leading-relaxed">
                      {writingEvaluations[currentExerciseIdx].overall_feedback}
                    </p>
                    {writingEvaluations[currentExerciseIdx].improved_version && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Versão Sugerida pela IA:
                        </span>
                        <p className="text-indigo-950 text-xs sm:text-sm font-bold italic">
                          "{writingEvaluations[currentExerciseIdx].improved_version}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ajuste Manual se necessário */}
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl text-xs font-bold text-slate-500 border border-slate-100">
                  <span className="text-[11px]">A correção da IA foi adequada?</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOverrideCorrection(true)}
                      className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${isUserCorrect ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                      Marcar Correto
                    </button>
                    <button 
                      onClick={() => handleOverrideCorrection(false)}
                      className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${!isUserCorrect ? 'bg-rose-500 text-white border-rose-500' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}
                    >
                      Marcar Incorreto
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* BOTÕES DE NAVEGAÇÃO E AÇÃO                              */}
            {/* ======================================================== */}
            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <button
                onClick={() => {
                  if (currentExerciseIdx > 0) {
                    setCurrentExerciseIdx(currentExerciseIdx - 1)
                  }
                }}
                disabled={currentExerciseIdx === 0}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>

              <div className="flex items-center gap-3">
                {!isChecked ? (
                  evaluatingIndex === currentExerciseIdx ? (
                    <button 
                      disabled
                      className="bg-slate-900 text-white font-extrabold text-xs py-3 px-6 rounded-xl opacity-90 cursor-not-allowed flex items-center gap-2 shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Analisando com IA...</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleVerifyAnswer}
                      disabled={!canVerify}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      <span>Verificar Resposta</span>
                      <Check className="w-4 h-4" />
                    </button>
                  )
                ) : (
                  currentExerciseIdx < totalExercises - 1 ? (
                    <button 
                      onClick={handleNext}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <span>Próximo Exercício</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleFinish}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span>{submitting ? 'Salvando Resultados...' : 'Concluir Lição de Casa'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
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

