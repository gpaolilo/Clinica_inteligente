import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts'
import { 
  Flame, Brain, Trophy, Clock, ArrowLeft, CheckCircle, Copy, Plus, 
  Trash2, FileText, CheckSquare, MessageSquare 
} from 'lucide-react'

// Premium Glassmorphism card container
const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-[28px] overflow-hidden ${className}`}>
    {children}
  </div>
)

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export default function PatientDetails() {
  const { id: patientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session, role } = useAuthStore()
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Data states
  const [patient, setPatient] = useState<any>(null)
  const [gamification, setGamification] = useState<any>({ xp: 0, level: 1, current_streak: 0, longest_streak: 0 })
  const [achievements, setAchievements] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [scenarioSessions, setScenarioSessions] = useState<any[]>([])
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'STUDENT_ROOM' | 'INSIGHTS' | 'EXERCISES' | 'CLASSES' | 'PROGRESS' | 'CADASTRO'>('STUDENT_ROOM')
  
  // Form values
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [studentLevel, setStudentLevel] = useState('')
  const [studentGoal, setStudentGoal] = useState('')
  const [classBalance, setClassBalance] = useState(0)
  const [aiCreditsToAdd, setAiCreditsToAdd] = useState(0)

  // Invite manager states
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  // To-do list items (local state synced to localStorage or dynamic)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodoText, setNewTodoText] = useState('')

  // Recharts states
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])

  const staticBadges = [
    { id: 'first_steps', name: 'Primeiros Passos', desc: 'Concluiu a primeira aula prática', icon: '🌱' },
    { id: '7_day_streak', name: 'Chama Semanal', desc: 'Alcançou 7 dias de ofensiva', icon: '🔥' },
    { id: 'vocab_master', name: 'Mestre Vocab', desc: 'Aprendeu mais de 30 palavras', icon: '📚' },
    { id: 'scenario_champ', name: 'Campeão de Cenário', desc: 'Concluiu 5 conversações de IA', icon: '💬' },
    { id: 'grammar_guru', name: 'Grammar Guru', desc: 'Manteve pontuação acima de 90%', icon: '🎓' },
    { id: 'high_flyer', name: 'Fluência Ouro', desc: 'Atingiu score de fluência excelente', icon: '🏆' },
    { id: 'perfect_attendance', name: 'Aluno Nota 10', desc: 'Completou todas as aulas agendadas', icon: '✨' }
  ]

  const loadData = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      // 1. Fetch patient
      const { data: patData, error: patErr } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()
      
      if (patErr || !patData) {
        console.error(patErr)
        alert('Erro ao carregar dados do aluno.')
        navigate('/dashboard/patients')
        return
      }

      setPatient(patData)
      setName(patData.name || '')
      setEmail(patData.email || '')
      setPhone(patData.phone || '')
      setStatus(patData.status || 'ACTIVE')
      setStudentLevel(patData.student_level || '')
      setStudentGoal(patData.student_goal || '')
      setClassBalance(patData.class_balance || 0)

      // Only fetch student data if the type is ALUNO
      if (patData.client_type === 'ALUNO') {
        // 2. Fetch gamification
        const { data: gamData } = await supabase
          .from('gamification_profiles')
          .select('*')
          .eq('patient_id', patientId)
          .maybeSingle()
        if (gamData) setGamification(gamData)

        // 3. Fetch achievements
        const { data: achData } = await supabase
          .from('achievements')
          .select('*')
          .eq('patient_id', patientId)
        if (achData) setAchievements(achData)

        // 4. Fetch learning events for AI insights
        const { data: eventsData } = await supabase
          .from('learning_events')
          .select('*, sessions!inner(scheduled_date)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
        
        if (eventsData) {
          const grouped = eventsData.reduce((acc: any, event: any) => {
            if (!acc[event.session_id]) {
              acc[event.session_id] = {
                id: event.session_id,
                sessions: event.sessions,
                fluency_score: 'BOM',
                confidence_score: 'MÉDIO',
                summary: 'Análise extraída dos eventos de aprendizado da sessão.',
                grammar_errors: [],
                vocabulary_suggestions: [],
                next_actions: []
              }
            }
            if (event.event_type === 'session_metrics') {
              acc[event.session_id].fluency_score = event.details.fluency_score
              acc[event.session_id].confidence_score = event.details.confidence_score
              acc[event.session_id].summary = event.details.summary
            }
            if (event.event_type === 'grammar_error') {
              acc[event.session_id].grammar_errors.push(event.details)
            }
            if (event.event_type === 'vocabulary_gap') {
              acc[event.session_id].vocabulary_suggestions.push(event.details.suggested_word || event.details.missing_word)
            }
            if (event.event_type === 'context_need') {
              acc[event.session_id].next_actions.push(`Focar em: ${event.details.scenario}`)
            }
            return acc
          }, {})
          const groupedList = Object.values(grouped)
          setInsights(groupedList)

          // Prepopulate To-Dos based on next actions if todos are empty
          const storedTodos = localStorage.getItem(`todos_${patientId}`)
          if (storedTodos) {
            setTodos(JSON.parse(storedTodos))
          } else {
            const initialTodos: TodoItem[] = []
            groupedList.forEach((ins: any) => {
              if (ins.next_actions) {
                ins.next_actions.slice(0, 2).forEach((action: string) => {
                  initialTodos.push({
                    id: Math.random().toString(),
                    text: action,
                    completed: false
                  })
                })
              }
            })
            if (initialTodos.length === 0) {
              initialTodos.push({ id: '1', text: 'Revisar estruturas de conversação básica', completed: false })
              initialTodos.push({ id: '2', text: 'Completar o primeiro exercício de fixação', completed: false })
            }
            setTodos(initialTodos)
            localStorage.setItem(`todos_${patientId}`, JSON.stringify(initialTodos))
          }
        }

        // 5. Fetch Exercises (Homework plans)
        const { data: eData } = await supabase
          .from('homework_plans')
          .select('*, sessions!inner(scheduled_date)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
        if (eData) setExercises(eData)

        // 6. Fetch scenario sessions
        const { data: scData } = await supabase
          .from('scenario_sessions')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
        if (scData) setScenarioSessions(scData || [])

        // 7. Calculate charts data
        const { data: clientInsights } = await supabase
          .from('student_insights')
          .select('created_at, fluency_score, confidence_score, grammar_errors, vocabulary_suggestions')
          .eq('patient_id', patientId)

        const allActivities = [
          ...(clientInsights || []).map(i => ({
            created_at: i.created_at,
            fluency_score: i.fluency_score || 0,
            confidence_score: i.confidence_score || 0,
            grammar_errors_count: i.grammar_errors?.length || 0,
            vocab_suggestions_count: i.vocabulary_suggestions?.length || 0
          })),
          ...(scData || []).map(s => ({
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

          const avgFluency = allActivities.reduce((acc: number, act: any) => acc + (act.fluency_score || 0), 0) / allActivities.length
          const avgConfidence = allActivities.reduce((acc: number, act: any) => acc + (act.confidence_score || 0), 0) / allActivities.length
          const avgGrammarErrors = allActivities.reduce((acc: number, act: any) => acc + (act.grammar_errors_count || 0), 0) / allActivities.length
          const grammarScore = Math.max(0, 100 - (avgGrammarErrors * 10))
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
      } else {
        // Fetch clinical notes if the type is PACIENTE
        const { data: notesData } = await supabase
          .from('clinical_notes')
          .select('*, sessions!inner(patient_id, scheduled_date)')
          .eq('sessions.patient_id', patientId)
          .order('created_at', { ascending: false })
        if (notesData) setNotes(notesData)
        setActiveTab('CADASTRO') // For patient, default to cadastro/clinical notes
      }

      // 8. Fetch lessons/sessions
      const { data: sessData } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: false })
      if (sessData) setSessions(sessData)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [patientId])

  // Todo CRUD handlers
  const handleToggleTodo = (todoId: string) => {
    const updated = todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t)
    setTodos(updated)
    localStorage.setItem(`todos_${patientId}`, JSON.stringify(updated))
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoText.trim()) return
    const newItem: TodoItem = {
      id: Math.random().toString(),
      text: newTodoText.trim(),
      completed: false
    }
    const updated = [...todos, newItem]
    setTodos(updated)
    setNewTodoText('')
    localStorage.setItem(`todos_${patientId}`, JSON.stringify(updated))
  }

  const handleDeleteTodo = (todoId: string) => {
    const updated = todos.filter(t => t.id !== todoId)
    setTodos(updated)
    localStorage.setItem(`todos_${patientId}`, JSON.stringify(updated))
  }

  // Save/Update Form Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    if (!session) {
      setSaving(false)
      return
    }
    const psychologist_id = session.user.id
    let initialAiCredits = patient?.ai_credits_balance || 0
    const creditsToTransfer = parseInt(aiCreditsToAdd.toString(), 10) || 0

    if (patient.client_type === 'ALUNO' && creditsToTransfer > 0) {
      // 1. Fetch teacher wallet balance to verify
      const { data: wallet, error: walletErr } = await supabase
        .from('teacher_wallets')
        .select('current_balance')
        .eq('teacher_id', psychologist_id)
        .maybeSingle()

      if (walletErr || !wallet) {
        alert('Erro ao consultar carteira de créditos do professor. Certifique-se de possuir uma carteira ativa.')
        setSaving(false)
        return
      }

      if (wallet.current_balance < creditsToTransfer) {
        alert(`Saldo de créditos de IA insuficiente na sua carteira. Você possui apenas ${wallet.current_balance} créditos, mas tentou transferir ${creditsToTransfer}.`)
        setSaving(false)
        return
      }

      // 2. Deduct from teacher's wallet
      const { error: deductErr } = await supabase
        .from('teacher_wallets')
        .update({ 
          current_balance: wallet.current_balance - creditsToTransfer,
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', psychologist_id)

      if (deductErr) {
        alert('Erro ao deduzir créditos de sua carteira: ' + deductErr.message)
        setSaving(false)
        return
      }

      // 3. Log credit transaction for teacher
      await supabase
        .from('credit_transactions')
        .insert([{
          teacher_id: psychologist_id,
          type: 'consumption',
          amount: -creditsToTransfer,
          source: 'student_transfer',
          description: `Transferência de créditos de IA para o aluno: ${name}`
        }])

      initialAiCredits += creditsToTransfer
    }

    const payload = {
      name,
      email,
      phone,
      status,
      student_level: patient.client_type === 'ALUNO' ? studentLevel : null,
      student_goal: patient.client_type === 'ALUNO' ? studentGoal : null,
      class_balance: parseFloat(classBalance.toString()) || 0,
      ai_credits_balance: initialAiCredits
    }

    try {
      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', patientId)

      if (error) throw error
      alert('Cadastro atualizado com sucesso!')
      setAiCreditsToAdd(0)
      loadData()
    } catch (err: any) {
      alert('Erro ao atualizar cadastro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Invite actions
  const handleInvite = async (type: 'EMAIL' | 'WHATSAPP' | 'COPY') => {
    if (!email) {
      alert('Por favor, preencha o campo de E-mail para enviar o convite.')
      return
    }
    setInviteLoading(true)
    try {
      // Ensure current changes are saved
      const payload = {
        name,
        email,
        phone,
        status,
        student_level: patient.client_type === 'ALUNO' ? studentLevel : null,
        student_goal: patient.client_type === 'ALUNO' ? studentGoal : null,
        class_balance: parseFloat(classBalance.toString()) || 0
      }
      await supabase.from('patients').update(payload).eq('id', patientId)

      const apiRes = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          email: email,
          name: name,
          role: patient.client_type === 'ALUNO' ? 'STUDENT' : 'PATIENT'
        })
      })

      if (apiRes.ok) {
        const apiData = await apiRes.json()
        if (apiData.user?.id) {
          await supabase.from('patients').update({ user_id: apiData.user.id }).eq('id', patientId)
        }

        if (apiData.actionLink) {
          setInviteLink(apiData.actionLink)
        }

        if (type === 'EMAIL') {
          alert('Convite enviado por e-mail com sucesso!')
        } else if (type === 'COPY') {
          if (apiData.actionLink) {
            await navigator.clipboard.writeText(apiData.actionLink)
            alert('Link de convite copiado para a área de transferência!')
          } else {
            alert('Convite enviado, mas não foi possível gerar o link de cópia.')
          }
        } else if (type === 'WHATSAPP') {
          if (!apiData.actionLink) {
            alert('Não foi possível gerar o link de compartilhamento do WhatsApp.')
          }
        }
      } else {
        const errText = await apiRes.text()
        alert('Erro ao processar convite: ' + errText)
      }
    } catch (err: any) {
      alert('Erro ao processar convite: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 font-semibold gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <span>Carregando dados do aluno...</span>
      </div>
    )
  }

  // Get initials for Avatar
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return fullName.substring(0, 2).toUpperCase()
  }

  const unlockedBadges = staticBadges.filter(sb => achievements.some(a => a.badge_id === sb.id))
  const lockedBadges = staticBadges.filter(sb => !achievements.some(a => a.badge_id === sb.id))

  // Next badge calculation (usually "First Steps" if 0 unlocked, or streak based)
  const nextBadge = achievements.length === 0 ? staticBadges[0] : (lockedBadges[0] || staticBadges[0])
  const pointsToNextBadge = 50
  const pointsProgress = gamification.xp % 50

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/dashboard/patients')} 
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> 
        Voltar para Alunos
      </button>

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-purple-50/50 border border-slate-200 p-6 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar Circle */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-2xl shadow-lg border-4 border-white shrink-0">
            {getInitials(name)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{name}</h1>
            <p className="text-slate-500 text-xs font-semibold mt-1 flex items-center gap-2">
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">Nível {studentLevel || '-'}</span>
              <span>•</span>
              <span>{unlockedBadges.length} de {staticBadges.length} conquistas desbloqueadas</span>
            </p>
            
            {/* Quick Metrics */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>{gamification.xp || 0} pts</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{gamification.current_streak || 0}d streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Badge Card */}
        {patient.client_type === 'ALUNO' && (
          <div className="bg-white/80 border border-slate-200 p-4.5 rounded-2xl flex items-center gap-4 min-w-[280px] shadow-sm">
            <div className="text-3xl bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border border-slate-100 shrink-0">
              {nextBadge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Próxima Conquista:</span>
              <span className="block font-black text-slate-800 text-sm mt-0.5 truncate">{nextBadge.name}</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${(pointsProgress / pointsToNextBadge) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 shrink-0">{pointsProgress}/{pointsToNextBadge} XP</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Tab Menu */}
      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50 overflow-x-auto gap-1">
        {patient.client_type === 'ALUNO' && (
          <>
            <button 
              onClick={() => setActiveTab('STUDENT_ROOM')} 
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'STUDENT_ROOM' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Espaço do Aluno
            </button>
            <button 
              onClick={() => setActiveTab('INSIGHTS')} 
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'INSIGHTS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Insights da IA
            </button>
            <button 
              onClick={() => setActiveTab('EXERCISES')} 
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'EXERCISES' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Exercícios
            </button>
            <button 
              onClick={() => setActiveTab('PROGRESS')} 
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'PROGRESS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Progresso
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveTab('CLASSES')} 
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'CLASSES' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {patient.client_type === 'ALUNO' ? 'Aulas e Atividades' : 'Sessões'}
        </button>
        <button 
          onClick={() => setActiveTab('CADASTRO')} 
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'CADASTRO' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Cadastro
        </button>
      </div>

      {/* 3. Tab Contents */}
      <div className="space-y-6">
        
        {/* STUDENT ROOM TAB */}
        {activeTab === 'STUDENT_ROOM' && patient.client_type === 'ALUNO' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Dashboard Cards */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile progress card */}
              <GlassCard className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100">
                    {studentLevel || 'A1'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">{name}</h3>
                    <p className="text-slate-450 text-xs font-semibold mt-0.5">{sessions.filter(s => s.status === 'COMPLETED').length} aulas concluídas • {classBalance} créditos de aula</p>
                  </div>
                </div>

                <div className="flex gap-4 shrink-0">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center min-w-[76px] shadow-sm">
                    <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Fluência</span>
                    <span className="block font-black text-emerald-500 text-lg mt-0.5">{radarData[0]?.A || 0}%</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center min-w-[76px] shadow-sm">
                    <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Progresso</span>
                    <span className="block font-black text-indigo-500 text-lg mt-0.5">{Math.min(100, Math.round((sessions.filter(s => s.status === 'COMPLETED').length / 10) * 100))}%</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center min-w-[76px] shadow-sm">
                    <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Rank</span>
                    <span className="block font-black text-amber-500 text-lg mt-0.5">#1</span>
                  </div>
                </div>
              </GlassCard>

              {/* Weekly Streak Tracker */}
              <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 shrink-0" />
                    <span>Ofensiva de Prática Semanal</span>
                  </h3>
                  <span className="text-slate-450 text-xs font-bold">{gamification.longest_streak || 0} dias (Recorde)</span>
                </div>

                {/* Monday to Sunday tracker list */}
                <div className="grid grid-cols-7 gap-3 text-center">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, idx) => {
                    const todayIdx = new Date().getDay()
                    const adjustedIdx = todayIdx === 0 ? 6 : todayIdx - 1 // Make Mon = 0, Sun = 6
                    const isActive = idx <= adjustedIdx && gamification.current_streak > (adjustedIdx - idx)
                    
                    return (
                      <div key={day} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{day}</span>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isActive 
                            ? 'bg-gradient-to-tr from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20' 
                            : 'bg-slate-150 text-slate-400'
                        }`}>
                          <Flame className="w-4.5 h-4.5" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

              {/* To-Do Activity Checklist */}
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span>Atividades Recomendadas & Tarefas</span>
                </h3>

                <form onSubmit={handleAddTodo} className="flex gap-2.5 mb-4">
                  <input 
                    type="text"
                    value={newTodoText}
                    onChange={e => setNewTodoText(e.target.value)}
                    placeholder="Adicionar nova atividade recomendada para o aluno..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all placeholder-slate-400"
                  />
                  <button 
                    type="submit"
                    className="bg-dark hover:bg-black text-neon font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </form>

                {todos.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-6">Nenhuma tarefa cadastrada. Adicione tarefas para orientar a prática do aluno.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {todos.map(todo => (
                      <div key={todo.id} className="flex items-center justify-between py-3">
                        <button
                          onClick={() => handleToggleTodo(todo.id)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {todo.completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-300 rounded-md shrink-0" />
                          )}
                          <span className={`text-sm font-semibold transition-all ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {todo.text}
                          </span>
                        </button>
                        <button 
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

            </div>

            {/* Right Col: Badges Grid */}
            <div className="space-y-6">
              
              {/* Badges card list */}
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Quadro de Conquistas ({unlockedBadges.length}/{staticBadges.length})</span>
                </h3>

                <div className="space-y-4">
                  {staticBadges.map(badge => {
                    const isUnlocked = achievements.some(a => a.badge_id === badge.id)
                    const unlockInfo = achievements.find(a => a.badge_id === badge.id)
                    
                    return (
                      <div 
                        key={badge.id} 
                        className={`p-3 border rounded-2xl flex items-center gap-3 transition-all ${
                          isUnlocked 
                            ? 'bg-gradient-to-r from-slate-50 to-indigo-50/20 border-slate-200' 
                            : 'bg-slate-50/50 border-slate-100 opacity-60'
                        }`}
                      >
                        <div className={`text-2xl w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                          isUnlocked ? 'bg-white border-slate-200' : 'bg-slate-200/50 border-slate-200/30 grayscale'
                        }`}>
                          {badge.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block font-black text-slate-800 text-xs truncate">{badge.name}</span>
                          <span className="block text-[10px] text-slate-450 mt-0.5 truncate">{badge.desc}</span>
                        </div>
                        {isUnlocked && unlockInfo && (
                          <span className="text-[8px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded border border-emerald-100 shrink-0 uppercase tracking-wider">
                            Desbloqueado
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </GlassCard>

            </div>

          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === 'INSIGHTS' && patient.client_type === 'ALUNO' && (
          <div className="space-y-6">
            {insights.length === 0 ? (
              <GlassCard className="p-12 text-center text-slate-400">Nenhum insight gerado para este aluno ainda.</GlassCard>
            ) : (
              <div className="space-y-6">
                {insights.map(insight => (
                  <GlassCard key={insight.id} className="p-6 relative">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded mb-2 inline-block">Métricas da Sessão</span>
                          <h4 className="text-lg font-bold text-slate-800">Aula em {new Date(insight.sessions.scheduled_date).toLocaleDateString('pt-BR')}</h4>
                        </div>
                        <div className="flex space-x-3 text-center">
                           <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[70px]">
                             <div className="text-2xl font-black text-emerald-500">{insight.fluency_score}</div>
                             <div className="text-[10px] uppercase font-bold text-slate-400">Fluência</div>
                           </div>
                           <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[70px]">
                             <div className="text-2xl font-black text-amber-500">{insight.confidence_score}</div>
                             <div className="text-[10px] uppercase font-bold text-slate-400">Confiança</div>
                           </div>
                        </div>
                     </div>
                     
                     <div className="space-y-4">
                       <div>
                         <h5 className="text-sm font-bold text-slate-700 mb-1">Resumo da Aula</h5>
                         <p className="text-sm text-slate-650 bg-slate-50 p-3 rounded-lg leading-relaxed">{insight.summary}</p>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <h5 className="text-sm font-bold text-slate-700 mb-2">Erros Gramaticais</h5>
                           {Array.isArray(insight.grammar_errors) && insight.grammar_errors.map((g:any, i:number) => (
                             <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-2 mb-2 text-xs">
                                <span className="line-through text-rose-500 font-medium block">{g.sentence}</span>
                                <span className="text-emerald-600 font-bold block my-1">→ {g.correction}</span>
                                <span className="text-slate-500 italic block">{g.explanation}</span>
                             </div>
                           ))}
                           {(!insight.grammar_errors || insight.grammar_errors.length === 0) && <p className="text-xs text-slate-400">Nenhum erro registrado.</p>}
                         </div>
                         
                         <div>
                           <h5 className="text-sm font-bold text-slate-700 mb-2">Sugestões de Vocabulário</h5>
                           <div className="flex flex-wrap gap-2">
                             {Array.isArray(insight.vocabulary_suggestions) && insight.vocabulary_suggestions.map((v:string, i:number) => (
                               <span key={i} className="px-2 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs rounded font-medium">{v}</span>
                             ))}
                           </div>
                           
                           <h5 className="text-sm font-bold text-slate-700 mb-2 mt-4">Próximos Passos (Alvo)</h5>
                           <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                              {Array.isArray(insight.next_actions) && insight.next_actions.map((v:string, i:number) => <li key={i}>{v}</li>)}
                           </ul>
                         </div>
                       </div>
                     </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EXERCISES TAB */}
        {activeTab === 'EXERCISES' && patient.client_type === 'ALUNO' && (
          <div className="space-y-6">
            {exercises.length === 0 ? (
              <GlassCard className="p-12 text-center text-slate-400">Nenhum exercício gerado ainda.</GlassCard>
            ) : (
              <div className="space-y-6">
                {exercises.map(exGroup => (
                  <GlassCard key={exGroup.id} className="p-6">
                    <div className="mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
                       <div>
                         <h4 className="text-base font-bold text-slate-800">Prática Pós-Sessão</h4>
                         <span className="text-xs font-semibold text-slate-500">{new Date(exGroup.sessions.scheduled_date).toLocaleDateString()}</span>
                       </div>
                       <button 
                          onClick={() => window.print()}
                          className="text-xs font-bold bg-dark text-neon hover:bg-black px-4 py-2 rounded-full shadow-sm transition-all"
                       >
                          Exportar PDF
                       </button>
                    </div>
                    
                    <div className="space-y-6">
                       {Array.isArray(exGroup.exercises) && exGroup.exercises.map((e:any, idx:number) => (
                         <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                           <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${e.type === 'grammar' ? 'bg-indigo-100 text-indigo-700' : e.type === 'vocabulary' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{e.type}</span>
                           </div>
                           <p className="text-sm font-bold text-dark mb-3">{e.question}</p>
                           <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 font-semibold mb-2 outline-none">Ver Resposta & Explicação</summary>
                              <div className="pl-4 border-l-2 border-blue-200 py-1 space-y-1 mt-2">
                                <p><span className="font-bold text-emerald-600">Resposta:</span> {e.answer}</p>
                                <p><span className="font-bold text-slate-650">Explicação:</span> {e.explanation}</p>
                              </div>
                           </details>
                         </div>
                       ))}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'PROGRESS' && patient.client_type === 'ALUNO' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Radar Skills */}
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

            {/* Historical Progress Line Chart */}
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
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Sem dados históricos suficientes</div>
              )}
            </GlassCard>

          </div>
        )}

        {/* CLASSES & ACTIVITIES TAB */}
        {activeTab === 'CLASSES' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List of sessions (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-base">Registro de Aulas</h3>
                <span className="text-slate-450 text-xs font-bold">{sessions.length} aulas registradas</span>
              </div>

              {sessions.length === 0 ? (
                <GlassCard className="p-8 text-slate-400 text-center text-xs">Nenhuma aula registrada para este aluno.</GlassCard>
              ) : (
                <div className="space-y-3">
                  {sessions.map(sess => (
                    <GlassCard key={sess.id} className="p-4.5 border-l-4 border-l-primary-500 flex justify-between items-center gap-4">
                      <div>
                        <h4 className="font-black text-sm text-slate-800">Sessão em {new Date(sess.scheduled_date).toLocaleDateString('pt-BR')}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(sess.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${
                        sess.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : sess.status === 'SCHEDULED' 
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {sess.status === 'COMPLETED' ? 'Concluída' : sess.status === 'SCHEDULED' ? 'Agendada' : 'Aguardando'}
                      </span>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>

            {/* List of Scenario Sessions Transcripts (1 col) */}
            {patient.client_type === 'ALUNO' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Conversas com IA</h3>
                {scenarioSessions.length === 0 ? (
                  <GlassCard className="p-8 text-slate-400 text-center text-xs">O aluno ainda não praticou cenários com a IA.</GlassCard>
                ) : (
                  <div className="space-y-3">
                    {scenarioSessions.map(sc => (
                      <GlassCard key={sc.id} className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase">{sc.scenario_type.replace('_', ' ')}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{new Date(sc.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-center mt-1">
                          <div className="bg-slate-50 rounded p-1">
                            <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Gramática</span>
                            <span className="block font-black text-xs text-slate-800 mt-0.5">{sc.grammar_score || 0}%</span>
                          </div>
                          <div className="bg-slate-50 rounded p-1">
                            <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Fluência</span>
                            <span className="block font-black text-xs text-slate-800 mt-0.5">{sc.fluency_score || 0}%</span>
                          </div>
                          <div className="bg-slate-50 rounded p-1">
                            <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Confiança</span>
                            <span className="block font-black text-xs text-slate-800 mt-0.5">{sc.confidence_score || 0}%</span>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clinical Notes (For PACIENTE type) */}
            {patient.client_type === 'PACIENTE' && (
              <div className="lg:col-span-3 space-y-4">
                <h3 className="font-bold text-slate-800 text-base">Prontuários Clínicos</h3>
                {notes.length === 0 ? (
                  <GlassCard className="p-12 text-center text-slate-400">Nenhum prontuário registrado.</GlassCard>
                ) : (
                  <div className="space-y-4">
                    {notes.map(note => (
                      <GlassCard key={note.id} className="p-5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                          <strong className="text-slate-800">Sessão: {new Date(note.sessions.scheduled_date).toLocaleDateString('pt-BR')}</strong>
                          {note.is_signed ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-emerald-100">Assinado</span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-amber-100">Rascunho</span>
                          )}
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{note.final_note || note.ai_evolution}</p>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* CADASTRO TAB */}
        {activeTab === 'CADASTRO' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Editor (2 cols) */}
            <div className="lg:col-span-2">
              <GlassCard className="p-6">
                <h3 className="font-bold text-slate-800 text-base mb-6 pb-3 border-b border-slate-100">Editar Dados Cadastrais</h3>
                
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input 
                      required 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                      <input 
                        required 
                        type="text" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800" 
                      />
                    </div>
                  </div>

                  {patient.client_type === 'ALUNO' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Nível do Aluno</label>
                        <select 
                          required 
                          value={studentLevel} 
                          onChange={e => setStudentLevel(e.target.value)} 
                          className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-semibold bg-white"
                        >
                          <option value="" disabled>Selecione um nível</option>
                          {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Objetivo de Aprendizado</label>
                        <input 
                          required 
                          type="text" 
                          value={studentGoal} 
                          onChange={e => setStudentGoal(e.target.value)} 
                          className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 transition-all bg-white" 
                        />
                      </div>
                    </div>
                  )}

                  {role === 'TEACHER' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Saldo de Aulas (Créditos)</label>
                      <p className="text-xs text-slate-450 mb-2">Quantas aulas o aluno tem disponíveis para agendar?</p>
                      <input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        value={classBalance} 
                        onChange={e => setClassBalance(parseFloat(e.target.value) || 0)} 
                        className="w-full sm:w-1/3 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-800 font-bold" 
                      />
                    </div>
                  )}

                  {patient.client_type === 'ALUNO' && (
                    <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-indigo-900">Saldo de Créditos de IA do Aluno</label>
                        <span className="text-lg font-black text-slate-800 block mt-1">
                          {patient.ai_credits_balance || 0} <span className="text-xs font-bold text-slate-400">créditos</span>
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-indigo-950 uppercase">
                          Transferir mais créditos para o Aluno
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          value={aiCreditsToAdd} 
                          onChange={e => setAiCreditsToAdd(parseInt(e.target.value) || 0)} 
                          className="w-full sm:w-1/3 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-700 transition-all bg-white" 
                        />
                        <p className="text-[10px] text-slate-450">
                          O valor inserido será deduzido do saldo da sua Carteira de IA.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value)} 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-800 font-semibold"
                    >
                      <option value="ACTIVE">{patient.client_type === 'ALUNO' ? 'Ativo' : 'Em acompanhamento (Ativo)'}</option>
                      <option value="INACTIVE">{patient.client_type === 'ALUNO' ? 'Inativo' : 'Alta / Inativo'}</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="bg-dark hover:bg-black text-neon font-bold py-2.5 px-6 rounded-xl transition-all shadow-md disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </GlassCard>
            </div>

            {/* Invite Manager (1 col) */}
            <div>
              <GlassCard className="p-6 bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">Acesso à Plataforma</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Gere o link de convite ou envie por e-mail para o aluno cadastrar a senha e acessar a plataforma.
                </p>

                {patient.user_id ? (
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Conta ativa e vinculada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inviteLink ? (
                      <div className="bg-white p-3 border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                        <span className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Link de Convite Gerado:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="text" 
                            readOnly 
                            value={inviteLink} 
                            className="flex-1 bg-slate-50 border border-slate-150 text-[10px] font-semibold px-2 py-1.5 rounded-lg text-slate-600 outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink)
                              alert('Link copiado!')
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-colors shrink-0"
                          >
                            Copiar
                          </button>
                        </div>
                        
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Olá ${name}! Aqui está o seu link de convite para acessar o Flowike e criar sua senha de acesso: ${inviteLink}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold text-[10px] py-2 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => setInviteLink(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] py-2 px-3 rounded-lg transition-colors shrink-0"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={inviteLoading || !email}
                          onClick={() => handleInvite('EMAIL')}
                          className="w-full bg-dark hover:bg-black text-neon font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          {inviteLoading ? 'Enviando...' : 'Enviar por E-mail'}
                        </button>

                        <button
                          type="button"
                          disabled={inviteLoading || !email}
                          onClick={() => handleInvite('COPY')}
                          className="w-full bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <Copy className="w-4 h-4 shrink-0" />
                          Copiar Link de Convite
                        </button>

                        <button
                          type="button"
                          disabled={inviteLoading || !email}
                          onClick={() => handleInvite('WHATSAPP')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          Enviar via WhatsApp
                        </button>
                      </div>
                    )}
                    {!email && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">
                        * Preencha o e-mail do aluno para liberar o envio do convite.
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            </div>

          </div>
        )}

      </div>

    </div>
  )
}
