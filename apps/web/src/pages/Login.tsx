import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../hooks/useTenantBranding'
import { ShieldAlert, CheckCircle, ArrowRight, Sparkles, Activity, Users, Calendar } from 'lucide-react'

type ViewState = 'LOGIN' | 'FORGOT_PASSWORD' | 'UPDATE_PASSWORD'

export default function Login() {
  const [view, setView] = useState<ViewState>('LOGIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  
  const { 
    tenantId,
    appName,
    logoUrl,
    primaryColor,
    secondaryColor,
    loginMessage,
    loading: brandingLoading
  } = useTenantBranding()

  useEffect(() => {
    // Detecta se o usuário clicou em um link de recuperação de senha
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('UPDATE_PASSWORD')
        setError(null)
        setMessage('Defina sua nova senha abaixo.')
      }
    })
    
    if (window.location.hash.includes('type=recovery')) {
      setView('UPDATE_PASSWORD')
    }

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const isWhiteLabel = tenantId !== null && window.location.pathname.includes('/academy/')

  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-semibold text-sm">
        {isWhiteLabel ? 'Carregando Portal...' : 'Carregando Flowike...'}
      </div>
    )
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Instruções de recuperação foram enviadas para o seu e-mail.')
    }
    setLoading(false)
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando...')
      setTimeout(() => navigate('/'), 2000)
    }
    setLoading(false)
  }

  if (isWhiteLabel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-[#F8FAFC] select-none overflow-y-auto relative py-12 px-4">
        {/* Background dotted grid pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Glow background using teacher's theme colors */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: `${primaryColor}0D` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: `${secondaryColor || primaryColor}0D` }} />

        <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50">
          <div className="text-center">
            {/* Custom Teacher Logo or Initial Monogram */}
            <div className="flex justify-center mb-6">
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt={appName} className="max-h-12 object-contain" />
                  <span className="font-extrabold text-xl tracking-tight text-slate-800">{appName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {appName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-extrabold text-xl tracking-tight text-slate-800">{appName}</span>
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {view === 'LOGIN' && 'Entrar no Portal'}
              {view === 'FORGOT_PASSWORD' && 'Recuperar Senha'}
              {view === 'UPDATE_PASSWORD' && 'Definir Nova Senha'}
            </h2>
            <p className="text-slate-500 font-semibold mt-2 text-sm leading-relaxed">
              {view === 'LOGIN' && (loginMessage || `Acesse o portal da ${appName}`)}
              {view === 'FORGOT_PASSWORD' && 'Digite seu e-mail para receber as instruções.'}
              {view === 'UPDATE_PASSWORD' && 'Crie uma nova senha de acesso abaixo.'}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200/60 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">E-mail</label>
                <input 
                  type="email" 
                  required
                  placeholder="Seu e-mail"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('FORGOT_PASSWORD'); setError(null); setMessage(null); }}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    Esqueceu?
                  </button>
                </div>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                disabled={loading}
                className="w-full text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg flex justify-center items-center gap-1.5 text-sm hover:-translate-y-0.5"
                style={{ 
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})`,
                  boxShadow: `0 10px 15px -3px ${primaryColor}33`
                }}
              >
                {loading ? 'Entrando...' : 'Acessar Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {view === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">E-mail de Recuperação</label>
                <input 
                  type="email" 
                  required
                  placeholder="Seu e-mail"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg flex justify-center items-center gap-1.5 text-sm hover:-translate-y-0.5"
                style={{ 
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})`,
                  boxShadow: `0 10px 15px -3px ${primaryColor}33`
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
              <button 
                type="button"
                onClick={() => { setView('LOGIN'); setError(null); setMessage(null); }}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-3.5 px-6 rounded-2xl transition-all mt-2 text-xs"
              >
                Voltar ao Login
              </button>
            </form>
          )}

          {view === 'UPDATE_PASSWORD' && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg flex justify-center items-center gap-1.5 text-sm hover:-translate-y-0.5"
                style={{ 
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})`,
                  boxShadow: `0 10px 15px -3px ${primaryColor}33`
                }}
              >
                {loading ? 'Atualizando...' : 'Definir Nova Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex font-sans bg-[#F8FAFC] select-none overflow-hidden">
      {/* 1. Left Side: Visual Slogan & Interactive Mock Dashboard (Inspired by Mockup) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#F5F3FF] relative items-center justify-center p-12 overflow-hidden border-r border-slate-100">
        {/* Dotted Grid Pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Content Container */}
        <div className="max-w-xl space-y-8 z-10 w-full">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/Flowike_icon.png" alt="Flowike" className="w-12 h-12 object-contain" />
              <img src="/Flowike_logo_name_only.png" alt="Flowike Logo Name" className="h-7 object-contain" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight">
              Teaching. <span className="text-indigo-600">Organized.</span> <span className="text-purple-600">Effortless.</span>
            </h1>
            
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-md">
              The AI-powered platform that helps teachers run their business and students achieve real progress.
            </p>
          </div>

          {/* Interactive Floating Widgets (Dashboard Preview from Mockup) */}
          <div className="bg-white border border-slate-200 p-5 rounded-[28px] shadow-2xl shadow-slate-100/60 relative overflow-hidden flex gap-4 w-full">
            {/* Sidebar Mock */}
            <div className="w-14 bg-[#0F172A] rounded-2xl flex flex-col items-center py-5 justify-between shrink-0 shadow-lg">
              <div className="flex flex-col items-center gap-6">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">F</div>
                <div className="flex flex-col gap-4 text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center cursor-pointer">
                    <Activity className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer text-slate-500 hover:text-white transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer text-slate-500 hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer text-slate-500 hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer text-slate-500 hover:text-white transition-colors">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>

            {/* Main Mock Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-4 font-sans text-slate-900">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-800">Good morning, Sarah 👋</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Here's what's happening today.</p>
                </div>
                <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">PRO Plan</span>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col justify-between shadow-sm">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">128</span>
                  <span className="text-[7px] text-emerald-600 font-bold mt-0.5">+12%</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col justify-between shadow-sm">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Classes</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">6</span>
                  <span className="text-[7px] text-indigo-500 font-bold mt-0.5">Schedule</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col justify-between shadow-sm">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                  <span className="text-sm font-black text-slate-800 mt-0.5">$12,450</span>
                  <span className="text-[7px] text-emerald-600 font-bold mt-0.5">+18%</span>
                </div>
              </div>

              {/* Nested split row: Upcoming classes list & Chart */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between gap-2 shadow-sm">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Upcoming Classes</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-1">
                      <div>
                        <p className="text-[9px] font-bold text-slate-700">Business English</p>
                        <p className="text-[7px] text-slate-400 mt-0.5">Emma // 09:30 AM</p>
                      </div>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">Join</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-slate-700">Conversation Practice</p>
                        <p className="text-[7px] text-slate-400 mt-0.5">Marco // 11:30 AM</p>
                      </div>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">Join</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Revenue</span>
                    <span className="text-[7px] text-emerald-600 font-bold">+18%</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">$12,450</span>
                  
                  {/* SVG Chart */}
                  <div className="h-8 w-full mt-1.5 flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M 0 25 Q 25 15, 50 20 T 100 5 L 100 30 L 0 30 Z" fill="url(#chart-area)" />
                      <path d="M 0 25 Q 25 15, 50 20 T 100 5" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                      <circle cx="100" cy="5" r="1.5" fill="#6366f1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6 text-xs font-bold text-slate-500 px-2 justify-center lg:justify-start">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-indigo-500" /> AI Insights</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-indigo-500" /> White-Label Brand</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-indigo-500" /> All-in-One Workspace</span>
          </div>
        </div>
      </div>

      {/* 2. Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        {/* Glow background */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none lg:hidden" />
        
        <div className="w-full max-w-md space-y-8 relative z-10 bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 lg:bg-white/80 lg:border lg:p-10">
          <div className="text-center lg:text-left">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start mb-6">
              <img src="/Flowike_logo_transparent.png" alt="Flowike" className="h-10 object-contain" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-550 font-semibold mt-2 text-sm leading-relaxed">
              {view === 'LOGIN' && (loginMessage || 'Faça login para gerenciar seu portal acadêmico.')}
              {view === 'FORGOT_PASSWORD' && 'Esqueceu a senha? Digite seu e-mail para recuperar.'}
              {view === 'UPDATE_PASSWORD' && 'Crie uma nova senha de acesso abaixo.'}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200/60 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">E-mail</label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@flowike.com"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2 px-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('FORGOT_PASSWORD'); setError(null); setMessage(null); }}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    Esqueceu?
                  </button>
                </div>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-1.5 text-sm"
              >
                {loading ? 'Entrando...' : 'Acessar Flowike'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {view === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">E-mail de Recuperação</label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@flowike.com"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-1.5 text-sm"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
              <button 
                type="button"
                onClick={() => { setView('LOGIN'); setError(null); setMessage(null); }}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-3.5 px-6 rounded-2xl transition-all mt-2 text-xs"
              >
                Voltar ao Login
              </button>
            </form>
          )}

          {view === 'UPDATE_PASSWORD' && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Nova Senha</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4.5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 text-slate-900 font-semibold shadow-sm transition-all text-sm placeholder-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-6 rounded-2xl transition-all mt-6 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 flex justify-center items-center gap-1.5 text-sm"
              >
                {loading ? 'Atualizando...' : 'Definir Nova Senha'}
              </button>
            </form>
          )}

          {view === 'LOGIN' && (
            <p className="mt-8 text-center lg:text-left text-sm font-semibold text-slate-450">
              Ainda não tem conta? <br className="lg:hidden" />
              <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-bold border-b border-indigo-600/20 mt-1.5 inline-block transition-colors pb-0.5 ml-1 lg:ml-0">Solicitar Acesso à Fila</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
