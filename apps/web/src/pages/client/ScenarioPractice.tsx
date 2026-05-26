import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useGamificationStore } from '../../stores/gamificationStore'
import { Mic, Send, MessageSquare, X, Briefcase, ShoppingBag, Coffee, ChevronRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm transition-all duration-300 rounded-[24px] overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''} ${className}`}
  >
    {children}
  </div>
)

const SCENARIOS = [
  { id: 'job_interview', title: 'Entrevista de Emprego', icon: Briefcase, color: 'text-tenant-primary', bg: 'bg-tenant-primary/10', desc: 'Simule uma entrevista para uma vaga na sua área.' },
  { id: 'sales_pitch', title: 'Apresentação de Vendas', icon: ShoppingBag, color: 'text-tenant-secondary', bg: 'bg-tenant-secondary/10', desc: 'Treine seu poder de persuasion em inglês.' },
  { id: 'casual_chat', title: 'Conversa Casual (Café)', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Pratique small talk em um ambiente descontraído.' }
]

const INITIAL_MESSAGES: Record<string, string> = {
  job_interview: "Hello! Thank you for coming in today. Let's start the interview. Can you please introduce yourself and tell me a bit about your professional background?",
  sales_pitch: "Hello. Thank you for setting up this meeting. I'm interested in hearing about your product. What solution are you pitching to me today?",
  casual_chat: "Hey there! Long time no see. How have you been? Let's grab a coffee and catch up!"
}

export default function ScenarioPractice() {
  const { session } = useAuthStore()
  const { addEvent } = useGamificationStore()
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [sessionScore, setSessionScore] = useState<any>(null)
  const [patientRecord, setPatientRecord] = useState<any>(null)

  useEffect(() => {
    const fetchPatient = async () => {
      if (!session) return
      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (data) setPatientRecord(data)
    }
    fetchPatient()
  }, [session])

  const handleStartScenario = (id: string) => {
    setActiveScenario(id)
    const initialText = INITIAL_MESSAGES[id] || 'Hello! I will be your conversation partner for this scenario. Are you ready to begin?'
    setMessages([{ role: 'assistant', content: initialText }])
    setSessionScore(null)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return
    
    const userMsg = { role: 'user', content: inputText }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputText('')
    setIsAiTyping(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      
      const res = await fetch('/api/scenario-engine/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scenarioType: activeScenario,
          messages: updatedMessages
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to fetch AI reply')
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (err: any) {
      console.error("Chat error:", err)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the AI. Please try sending your message again." }])
    } finally {
      setIsAiTyping(false)
    }
  }

  const handleFinishScenario = async () => {
    if (!patientRecord?.id) {
      alert("Erro: Registro do aluno não encontrado.")
      return
    }

    setIsAiTyping(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('/api/scenario-engine/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          patientId: patientRecord.id,
          scenarioType: activeScenario,
          transcript: messages,
          durationSeconds: 180
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to evaluate session')
      }

      const data = await res.json()
      setSessionScore(data.evaluation)
      
      // Trigger gamification overlay notification
      addEvent({
        type: 'xp',
        title: 'Prática Concluída!',
        description: 'Você treinou inglês e ganhou +100 XP!',
        value: 100
      })
    } catch (err: any) {
      console.error("Evaluation error:", err)
      alert("Erro ao encerrar e avaliar simulação: " + err.message)
    } finally {
      setIsAiTyping(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (activeScenario) {
    const scenarioDef = SCENARIOS.find(s => s.id === activeScenario)
    const Icon = scenarioDef?.icon || MessageSquare

    return (
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`${scenarioDef?.bg} p-2 rounded-xl`}>
              <Icon className={`w-5 h-5 ${scenarioDef?.color}`} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{scenarioDef?.title}</h2>
              <p className="text-xs text-slate-500 font-medium">Prática Interativa IA</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (window.confirm("Tem certeza que deseja sair? O progresso desta simulação será perdido.")) {
                setActiveScenario(null)
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
          {sessionScore ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
              <GlassCard className="p-8 text-center border-emerald-100">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Sessão Concluída!</h2>
                <p className="text-slate-500 mb-8">Ótimo trabalho. Aqui está a sua avaliação instantânea:</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Fluência</p>
                    <p className="text-2xl md:text-3xl font-black text-tenant-primary">{sessionScore.fluency_score || sessionScore.fluency}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Gramática</p>
                    <p className="text-2xl md:text-3xl font-black text-tenant-secondary">{sessionScore.grammar_score || sessionScore.grammar}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Confiança</p>
                    <p className="text-2xl md:text-3xl font-black text-amber-600">{sessionScore.confidence_score || sessionScore.confidence}%</p>
                  </div>
                </div>

                {sessionScore.feedback && (
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-6 text-left mb-8 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pontos Fortes</span>
                      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 font-semibold">
                        {sessionScore.feedback.strengths?.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Onde Melhorar</span>
                      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 font-semibold">
                        {sessionScore.feedback.improvements?.map((im: string, idx: number) => <li key={idx}>{im}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Avaliação Geral</span>
                      <p className="text-sm text-slate-600 leading-relaxed font-semibold">{sessionScore.feedback.overall_impression}</p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setActiveScenario(null)}
                  className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-md"
                >
                  Voltar aos Cenários
                </button>
              </GlassCard>
            </motion.div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence>
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl font-semibold text-sm ${msg.role === 'user' ? 'bg-tenant-primary text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isAiTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Input Area */}
        {!sessionScore && (
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-4 rounded-2xl transition-colors ${isRecording ? 'bg-rose-100 text-rose-500 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite sua resposta em inglês..."
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-tenant-primary text-slate-700 font-semibold"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-4 bg-tenant-primary hover:bg-tenant-primary-hover text-white rounded-2xl transition-colors shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={handleFinishScenario}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                >
                  Encerrar Simulação e Avaliar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-tenant-primary" /> Prática de Cenários
        </h1>
        <p className="text-slate-500 mt-1">Desenvolva sua fluência conversando com nossa IA em situações do mundo real.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SCENARIOS.map((scenario) => (
          <motion.div key={scenario.id} variants={itemVariants}>
            <GlassCard onClick={() => handleStartScenario(scenario.id)} className="p-6 h-full flex flex-col group">
              <div className="mb-auto">
                <div className={`${scenario.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                  <scenario.icon className={`w-7 h-7 ${scenario.color}`} />
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-tenant-primary transition-colors">{scenario.title}</h3>
                <p className="text-slate-500 text-sm font-medium">{scenario.desc}</p>
              </div>
              
              <div className="mt-8 flex items-center justify-between text-sm font-bold text-slate-400 group-hover:text-tenant-primary transition-colors">
                <span>Iniciar Simulação</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

    </motion.div>
  )
}
