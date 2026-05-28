import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Check, ClipboardList, BookOpen, GraduationCap, Globe, Users, Link2, Sparkles, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react'

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
      // 1. Criar usuário no Supabase Auth com role TEACHER na metadata
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

      // 2. Inserir solicitação em teacher_signup_requests
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

      // Avança para a tela de Sucesso
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro no cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans selection:bg-lime-400 selection:text-black relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-2xl z-10 py-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-900/65 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 rounded-[32px] shadow-2xl flex flex-col"
            >
              <div className="text-center mb-8">
                <div className="bg-lime-400/10 text-lime-400 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-lime-400/20 shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">Criar Conta Flowike</h2>
                <p className="text-slate-400 font-medium mt-2 text-sm">Abra as portas da sua própria academia digital com IA.</p>
              </div>

              {error && (
                <div className="bg-rose-950/40 text-rose-300 border border-rose-900/50 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 transition-all font-medium placeholder-slate-600 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">E-mail Profissional</label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@academia.com"
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 transition-all font-medium placeholder-slate-600 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">Crie uma Senha</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 transition-all font-medium placeholder-slate-600 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-lime-400/10 hover:shadow-lime-400/20 hover:-translate-y-0.5"
                >
                  <span>Continuar Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-8 text-center text-sm font-semibold text-slate-500">
                Já tem conta? <br/>
                <Link to="/login" className="text-lime-400 border-b border-lime-400/30 hover:border-lime-400 mt-2 inline-block transition-all pb-0.5">Faça Login</Link>
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
              className="bg-slate-900/65 backdrop-blur-xl border border-slate-800 p-8 sm:p-10 rounded-[32px] shadow-2xl flex flex-col"
            >
              <div className="text-center mb-6">
                <div className="bg-lime-400/10 text-lime-400 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-lime-400/20">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Conte-nos sobre sua Academia</h2>
                <p className="text-slate-400 font-medium mt-1 text-xs">Precisamos entender sua demanda de ensino para criar a melhor experiência.</p>
              </div>

              {error && (
                <div className="bg-rose-950/40 text-rose-300 border border-rose-900/50 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                      Nome da Academia
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sarah English Hub"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-medium placeholder-slate-600 text-sm"
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      País
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Brasil"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-medium placeholder-slate-600 text-sm"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Área de Ensino Principal
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-semibold text-sm"
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
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Quantidade de Alunos
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-semibold text-sm"
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
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">
                    <Link2 className="w-3.5 h-3.5 text-slate-500" />
                    Website ou Instagram (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: instagram.com/sarah.english"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-medium placeholder-slate-600 text-sm"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">Como você gerencia seus alunos hoje?</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-semibold text-sm"
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
                  <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider">Qual é o seu maior desafio atual?</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-lime-400 transition-all font-semibold text-sm"
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
                    className="flex items-center justify-center gap-1.5 px-4 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-sm rounded-xl transition-all shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-lime-400/10 hover:shadow-lime-400/20 hover:-translate-y-0.5 flex justify-center items-center gap-1.5"
                  >
                    {loading ? 'Processando Solicitação...' : 'Solicitar Acesso'}
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
              className="bg-slate-900/65 backdrop-blur-xl border border-slate-800 p-8 sm:p-12 rounded-[32px] shadow-2xl flex flex-col items-center text-center"
            >
              {/* Animated Success Check */}
              <div className="relative mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  className="bg-lime-400 text-slate-950 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-lime-400/20 relative z-10 border-4 border-slate-900"
                >
                  <Check className="w-10 h-10 stroke-[3.5]" />
                </motion.div>
                {/* Ripple glows */}
                <div className="absolute inset-0 bg-lime-400/20 rounded-full scale-125 animate-ping opacity-75" />
              </div>

              <h2 className="text-3xl font-black text-white tracking-tight">Solicitação Enviada! 🎉</h2>
              
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl w-full my-6 text-left space-y-4">
                <p className="text-slate-300 font-medium text-sm leading-relaxed">
                  Nossa equipe já recebeu suas informações e está revisando sua aplicação para garantir a exclusividade do Flowike.
                </p>
                <div className="h-[1px] bg-slate-800" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Tempo Estimado de Análise</span>
                  <span className="bg-lime-400/10 text-lime-400 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide border border-lime-400/20">Menos de 24h</span>
                </div>
              </div>

              <p className="text-slate-400 font-medium text-xs leading-relaxed max-w-md mb-8">
                Você receberá um e-mail de ativação assim que sua solicitação for aprovada. Se desejar pular a fila de espera, compartilhe o Flowike com outros criadores!
              </p>

              <div className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin)
                    alert('Link copiado para a área de transferência! Envie para seus contatos.')
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition-all border border-slate-750 active:scale-95"
                >
                  Copiar Link Indicação 🔗
                </button>
                <Link
                  to="/login"
                  className="bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 px-8 rounded-xl text-xs transition-all flex items-center justify-center gap-1 hover:shadow-lg shadow-lime-400/15"
                >
                  Ir para Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
