import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { 
  Check, BookOpen, GraduationCap, Globe, Users, 
  Link2, ShieldAlert, ArrowRight, ArrowLeft, Award, Trophy
} from 'lucide-react'

type SignupStep = 1 | 2 | 3 // 1: Basic Account, 2: Academy Context, 3: Success Screen

export default function Register() {
  const [step, setStep] = useState<SignupStep>(1)
  
  // Basic Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Academy Fields
  const [academyName, setAcademyName] = useState('')
  const [country, setCountry] = useState('')
  const [teachingArea, setTeachingArea] = useState('')
  const [studentCount, setStudentCount] = useState('')
  const [website, setWebsite] = useState('')
  
  // Additional Questions
  const [currentTools, setCurrentTools] = useState('')
  const [challenge, setChallenge] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teachingAreaOptions = [
    { value: 'English', label: 'Inglês' },
    { value: 'Spanish', label: 'Espanhol' },
    { value: 'Music', label: 'Música' },
    { value: 'Coaching', label: 'Coaching' },
    { value: 'Tutoring', label: 'Reforço Escolar' },
    { value: 'Business Education', label: 'Educação Executiva' },
    { value: 'Test Preparation', label: 'Preparação para Provas' },
    { value: 'Other', label: 'Outro' }
  ]

  const studentCountOptions = [
    { value: '1-10', label: '1 a 10 alunos' },
    { value: '11-30', label: '11 a 30 alunos' },
    { value: '31-100', label: '31 a 100 alunos' },
    { value: '100+', label: 'Mais de 100 alunos' }
  ]

  const currentToolsOptions = [
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'Planilhas', label: 'Planilhas (Excel/Sheets)' },
    { value: 'Google Agenda', label: 'Google Agenda' },
    { value: 'Plataforma LMS', label: 'Plataforma LMS (Hotmart/Moodle)' },
    { value: 'Múltiplas Ferramentas', label: 'Várias ferramentas juntas' }
  ]

  const challengeOptions = [
    { value: 'Criação de tarefas', label: 'Criação de dever de casa / tarefas' },
    { value: 'Organização de alunos', label: 'Organização e controle de alunos' },
    { value: 'Agendamento', label: 'Agendamento e aulas marcadas' },
    { value: 'Controle de pagamentos', label: 'Controle financeiro e cobranças' },
    { value: 'Engajamento de alunos', label: 'Manter alunos motivados' },
    { value: 'Escalar meu negócio', label: 'Escalar meu negócio de ensino' }
  ]

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        setError('Por favor, preencha todos os campos da conta.')
        return
      }
      if (password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.')
        return
      }
    }
    setError(null)
    setStep((prev) => (prev + 1) as SignupStep)
  }

  const prevStep = () => {
    setError(null)
    setStep((prev) => (prev - 1) as SignupStep)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!academyName || !country || !teachingArea || !studentCount || !currentTools || !challenge) {
      setError('Por favor, preencha todos os campos obrigatórios da academia.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { 
            full_name: name,
            role: 'TEACHER'
          }
        }
      })
      
      if (authError) {
        throw new Error(authError.message)
      }

      const { error: insertError } = await supabase
        .from('teacher_signup_requests')
        .insert([{
          full_name: name,
          email: email,
          academy_name: academyName,
          country: country,
          teaching_area: teachingArea,
          student_count: studentCount === '1-10' ? 5 : studentCount === '11-30' ? 20 : studentCount === '31-100' ? 50 : 150,
          website: website || null,
          challenge: challenge,
          current_tools: currentTools,
          status: 'PENDING'
        }])

      if (insertError) {
        throw new Error(insertError.message)
      }

      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro no cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#F8FAFC] select-none overflow-hidden">
      {/* 1. Left Side: Visual Student Portal Preview (Inspired by Mockup "Welcome back, Alex") */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#F5F3FF] relative items-center justify-center p-12 overflow-hidden border-r border-slate-100">
        {/* Dotted Grid Pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-xl space-y-10 z-10 w-full">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Flowike_icon.png" alt="Flowike" className="w-12 h-12 object-contain" />
              <img src="/Flowike_logo_name_only.png" alt="Flowike Logo Name" className="h-7 object-contain" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight">
              A premium learning <span className="text-[#8B5CF6]">experience</span> students love.
            </h1>
            
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm">
              Gamified learning, AI speech practice, vocabulary banks, and automatic homework grading that keep students motivated.
            </p>
          </div>

          {/* Student Welcome Dashboard Box (Inspired by mockup: Welcome back, Alex!) */}
          <div className="bg-white border border-slate-200 p-6 rounded-[28px] shadow-2xl shadow-slate-100/60 relative overflow-hidden space-y-4 text-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                  Welcome back, Alex! 🚀
                </h4>
                <p className="text-[9px] text-slate-400 font-semibold">Let's continue your learning journey today.</p>
              </div>
              <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded font-extrabold">Student Portal</span>
            </div>

            {/* Daily Streak and Level Progress */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Daily Streak</span>
                  <span className="text-xs font-black text-slate-700">🔥 12 Days</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#8B5CF6] border border-purple-100">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">XP Progress</span>
                  <span className="text-xs font-black text-slate-700">Lvl 7 (1.2k XP)</span>
                </div>
              </div>
            </div>

            {/* Radar chart of progress and focus list in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
              {/* Radar chart SVG representation */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Your Progress</span>
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 150 150">
                    <defs>
                      <linearGradient id="radar-glow-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <polygon points="75,30 118,61 101,111 49,111 32,61" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    <polygon points="75,45 107,68 95,102 55,102 43,68" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                    <polygon points="75,60 96,75 87,93 63,93 54,75" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="75" y1="75" x2="75" y2="30" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="75" y1="75" x2="118" y2="61" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="75" y1="75" x2="101" y2="111" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="75" y1="75" x2="49" y2="111" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="75" y1="75" x2="32" y2="61" stroke="#E2E8F0" strokeWidth="1" />
                    <polygon points="75,39 105,64 97,100 51,102 49,70" fill="url(#radar-glow-grad-2)" stroke="#8B5CF6" strokeWidth="1.5" />
                    <text x="75" y="24" textAnchor="middle" className="text-[7px] font-bold fill-slate-400 tracking-wider">GRAMMAR</text>
                    <text x="123" y="62" textAnchor="start" className="text-[7px] font-bold fill-slate-400 tracking-wider">VOCAB</text>
                    <text x="105" y="118" textAnchor="start" className="text-[7px] font-bold fill-slate-400 tracking-wider">PRONUNCIATION</text>
                    <text x="45" y="118" textAnchor="end" className="text-[7px] font-bold fill-slate-400 tracking-wider">FLUENCY</text>
                    <text x="27" y="62" textAnchor="end" className="text-[7px] font-bold fill-slate-400 tracking-wider">LISTENING</text>
                  </svg>
                  <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white border border-slate-200/85 shadow-md flex items-center justify-center text-[10px] font-extrabold text-slate-800">78%</div>
                </div>
              </div>

              {/* Today's Focus */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between shadow-sm">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-2">Today's Focus</span>
                  <div className="flex flex-col gap-1.5">
                    <span className="bg-white border border-slate-200 text-slate-600 text-[9px] px-2 py-1 rounded-md font-bold text-center">Past tense accuracy</span>
                    <span className="bg-white border border-slate-200 text-slate-600 text-[9px] px-2 py-1 rounded-md font-bold text-center">Business vocabulary</span>
                    <span className="bg-white border border-slate-200 text-slate-600 text-[9px] px-2 py-1 rounded-md font-bold text-center">Speaking confidence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Class / Homework Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">Your Next Class</span>
                  <p className="text-[9px] font-bold text-slate-700 mt-0.5">Business Negotiation</p>
                  <p className="text-[7px] text-slate-400">Today, 2:00 PM</p>
                </div>
                <span className="text-[7px] font-bold px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer transition-colors">Join</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider block">Homework Due</span>
                  <p className="text-[9px] font-bold text-slate-700 mt-0.5">Job Interview Practice</p>
                  <p className="text-[7px] text-slate-400">Due tomorrow</p>
                </div>
                <span className="text-[7px] font-bold px-2 py-1 bg-white border border-slate-250 text-slate-750 rounded cursor-pointer hover:bg-slate-100 transition-colors">Continue</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Side: Multi-Step Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none lg:hidden" />
        
        <div className="w-full max-w-lg space-y-6 relative z-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col"
              >
                <div className="text-center lg:text-left mb-6">
                  {/* Logo */}
                  <div className="flex justify-center lg:justify-start mb-6">
                    <img src="/Flowike_logo_transparent.png" alt="Flowike" className="h-10 object-contain" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Request access</h2>
                  <p className="text-slate-550 font-semibold mt-2 text-sm leading-relaxed">
                    Comece configurando seus dados de conta para entrar na fila.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-800 border border-rose-200/60 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2 shadow-sm animate-shake">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome"
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold placeholder-slate-400 text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">E-mail Profissional</label>
                    <input
                      type="email"
                      required
                      placeholder="exemplo@flowike.com"
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold placeholder-slate-400 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Crie uma Senha</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold placeholder-slate-400 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 text-sm"
                  >
                    <span>Continuar Cadastro</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="mt-8 text-center lg:text-left text-sm font-semibold text-slate-450">
                  Já tem conta? <br className="lg:hidden"/>
                  <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-bold border-b border-indigo-600/20 mt-2 inline-block transition-colors pb-0.5 ml-1 lg:ml-0">Faça Login</Link>
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col"
              >
                <div className="text-center lg:text-left mb-6">
                  <div className="flex justify-center lg:justify-start mb-6">
                    <img src="/Flowike_logo_transparent.png" alt="Flowike" className="h-10 object-contain" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Conte-nos sobre sua Academia</h2>
                  <p className="text-slate-550 font-semibold mt-1 text-xs">Precisamos entender sua demanda de ensino para criar a melhor experiência.</p>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-800 border border-rose-200/60 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2 shadow-sm animate-shake">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        Nome da Academia
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Sarah English Hub"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold placeholder-slate-400 text-sm"
                        value={academyName}
                        onChange={(e) => setAcademyName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        País
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Brasil"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold placeholder-slate-400 text-sm"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        Área de Ensino Principal
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold text-sm cursor-pointer"
                        value={teachingArea}
                        onChange={(e) => setTeachingArea(e.target.value)}
                      >
                        <option value="" disabled>Selecione...</option>
                        {teachingAreaOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Quantidade de Alunos
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold text-sm cursor-pointer"
                        value={studentCount}
                        onChange={(e) => setStudentCount(e.target.value)}
                      >
                        <option value="" disabled>Selecione...</option>
                        {studentCountOptions.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      Website ou Instagram (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: instagram.com/sarah.english"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold placeholder-slate-400 text-sm"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Como você gerencia seus alunos hoje?</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold text-sm cursor-pointer"
                      value={currentTools}
                      onChange={(e) => setCurrentTools(e.target.value)}
                    >
                      <option value="" disabled>Selecione uma opção...</option>
                      {currentToolsOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Qual é o seu maior desafio atual?</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-500 transition-all font-semibold text-sm cursor-pointer"
                      value={challenge}
                      onChange={(e) => setChallenge(e.target.value)}
                    >
                      <option value="" disabled>Selecione uma opção...</option>
                      {challengeOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={loading}
                      className="flex items-center justify-center gap-1.5 px-4 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm rounded-xl transition-all shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-1.5 text-sm"
                    >
                      {loading ? 'Processando...' : 'Solicitar Acesso'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-12 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col items-center text-center text-slate-800"
              >
                <div className="relative mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    className="bg-indigo-600 text-white w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-indigo-650/20 relative z-10 border-4 border-white"
                  >
                    <Check className="w-10 h-10 stroke-[3.5]" />
                  </motion.div>
                  <div className="absolute inset-0 bg-indigo-600/20 rounded-full scale-125 animate-ping opacity-75" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Solicitação Enviada! 🎉</h2>
                
                <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl w-full my-6 text-left space-y-4">
                  <p className="text-slate-550 font-semibold text-xs leading-relaxed">
                    Nossa equipe já recebeu suas informações e está revisando sua aplicação para garantir a exclusividade do Flowike.
                  </p>
                  <div className="h-[1px] bg-slate-200" />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Tempo Estimado de Análise</span>
                    <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide border border-indigo-100">Menos de 24h</span>
                  </div>
                </div>

                <p className="text-slate-500 font-medium text-xs leading-relaxed max-w-sm mb-8">
                  Você receberá um e-mail de ativação assim que sua solicitação for aprovada. Se desejar pular a fila de espera, compartilhe o Flowike com outros criadores!
                </p>

                <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin)
                      alert('Link copiado para a área de transferência! Envie para seus contatos.')
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs transition-all border border-slate-200 active:scale-95 shadow-sm"
                  >
                    Copiar Link Indicação 🔗
                  </button>
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 px-8 rounded-xl text-xs transition-all flex items-center justify-center gap-1 hover:shadow-lg shadow-indigo-600/15"
                  >
                    Ir para Login
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
