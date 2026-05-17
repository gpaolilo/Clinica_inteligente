import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { Mic, Send, MessageSquare, Play, X, Briefcase, ShoppingBag, Coffee, ChevronRight, CheckCircle2 } from 'lucide-react'
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
  { id: 'job_interview', title: 'Entrevista de Emprego', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Simule uma entrevista para uma vaga na sua área.' },
  { id: 'sales_pitch', title: 'Apresentação de Vendas', icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Treine seu poder de persuasão em inglês.' },
  { id: 'casual_chat', title: 'Conversa Casual (Café)', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Pratique small talk em um ambiente descontraído.' }
]

export default function ScenarioPractice() {
  const { session } = useAuthStore()
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [sessionScore, setSessionScore] = useState<any>(null)

  const handleStartScenario = (id: string) => {
    setActiveScenario(id)
    setMessages([{ role: 'assistant', content: 'Hello! I will be your conversation partner for this scenario. Are you ready to begin?' }])
    setSessionScore(null)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return
    
    const userMsg = { role: 'user', content: inputText }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsAiTyping(true)

    // Simulate AI response (since we don't have the real streaming endpoint fully connected here yet)
    setTimeout(() => {
      setIsAiTyping(false)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'That is a great point. Can you elaborate more on your previous experience regarding this matter?' 
      }])
    }, 1500)
  }

  const handleFinishScenario = async () => {
    setIsAiTyping(true)
    // Simulate scoring and saving to DB
    setTimeout(async () => {
      setIsAiTyping(false)
      const score = { fluency: 85, grammar: 90, confidence: 80 }
      setSessionScore(score)

      if (session) {
        const { data: patient } = await supabase.from('patients').select('id').eq('user_id', session.user.id).single()
        if (patient) {
          await supabase.from('scenario_sessions').insert({
            patient_id: patient.id,
            scenario_type: activeScenario,
            transcript: messages,
            fluency_score: score.fluency,
            grammar_score: score.grammar,
            confidence_score: score.confidence,
            duration_seconds: 300,
            feedback: { comment: 'Ótima performance geral, boa escolha de vocabulário.' }
          })
        }
      }
    }, 2000)
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
            onClick={() => setActiveScenario(null)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {sessionScore ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
              <GlassCard className="p-8 text-center border-emerald-100">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Sessão Concluída!</h2>
                <p className="text-slate-500 mb-8">Ótimo trabalho. Aqui está a sua avaliação instantânea:</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Fluência</p>
                    <p className="text-3xl font-black text-primary-600">{sessionScore.fluency}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Gramática</p>
                    <p className="text-3xl font-black text-purple-600">{sessionScore.grammar}%</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 mb-1">Confiança</p>
                    <p className="text-3xl font-black text-amber-600">{sessionScore.confidence}%</p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveScenario(null)}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
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
                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                      <p className="leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isAiTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
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
                  placeholder="Digite sua resposta ou use o microfone..."
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl transition-colors shadow-lg shadow-primary-500/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={handleFinishScenario}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                >
                  Encerrar Simulação
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
          <MessageSquare className="w-8 h-8 text-primary-500" /> Prática de Cenários
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
                <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">{scenario.title}</h3>
                <p className="text-slate-500 text-sm">{scenario.desc}</p>
              </div>
              
              <div className="mt-8 flex items-center justify-between text-sm font-bold text-slate-400 group-hover:text-primary-600 transition-colors">
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
