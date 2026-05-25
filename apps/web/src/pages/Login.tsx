import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../hooks/useTenantBranding'

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
    appName, 
    logoUrl, 
    loginBackgroundUrl, 
    loginMessage
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
    
    // Fallback: Checa a URL se por acaso o evento não disparar a tempo
    if (window.location.hash.includes('type=recovery')) {
      setView('UPDATE_PASSWORD')
    }

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

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

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-tenant-background px-4 font-sans selection:bg-tenant-accent selection:text-dark relative overflow-hidden"
      style={loginBackgroundUrl ? { backgroundImage: `url(${loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {/* Fallback overlay para fundos escuros/claros se houver imagem para melhorar contraste */}
      {loginBackgroundUrl && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0" />}

      <div className="bg-tenant-surface p-10 rounded-tenant-card shadow-2xl w-full max-w-sm border border-tenant-border flex flex-col items-center z-10">
        <div className="text-center mb-8 w-full">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="max-h-20 max-w-[200px] object-contain mx-auto mb-6" />
          ) : (
            <div className="bg-tenant-accent text-dark w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-lime-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-tenant-text tracking-tight">{appName}</h2>
          <p className="text-slate-500 font-medium mt-1.5 text-sm">
            {view === 'LOGIN' && (loginMessage || 'Inteligência Privada Autônoma')}
            {view === 'FORGOT_PASSWORD' && 'Recuperação de Senha'}
            {view === 'UPDATE_PASSWORD' && 'Criar Nova Senha'}
          </p>
        </div>
        
        {error && <div className="w-full bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-semibold border border-rose-100 text-center">{error}</div>}
        {message && <div className="w-full bg-emerald-50 text-emerald-600 p-3 rounded-xl mb-4 text-sm font-semibold border border-emerald-100 text-center">{message}</div>}
        
        {view === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-5 w-full">
            <div>
              <label className="block text-sm font-bold text-tenant-text mb-1.5 px-1">E-mail</label>
              <input 
                type="email" 
                required
                placeholder="dr@clinica.com"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
               <div className="flex justify-between items-center mb-1.5 px-1">
                 <label className="block text-sm font-bold text-tenant-text">Senha</label>
                 <button 
                   type="button" 
                   onClick={() => { setView('FORGOT_PASSWORD'); setError(null); setMessage(null); }}
                   className="text-xs font-bold text-slate-500 hover:text-tenant-primary transition-colors"
                 >
                   Esqueceu a senha?
                 </button>
               </div>
               <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-4 px-6 rounded-tenant-btn transition-all mt-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex justify-center items-center"
            >
              {loading ? 'Autenticando...' : 'Acessar Plataforma'}
            </button>
          </form>
        )}

        {view === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotPassword} className="space-y-5 w-full">
            <div>
              <label className="block text-sm font-bold text-tenant-text mb-1.5 px-1">E-mail para recuperação</label>
              <input 
                type="email" 
                required
                placeholder="dr@clinica.com"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-4 px-6 rounded-tenant-btn transition-all mt-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex justify-center items-center"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
            <button 
              type="button"
              onClick={() => { setView('LOGIN'); setError(null); setMessage(null); }}
              className="w-full bg-tenant-surface hover:bg-slate-50 text-tenant-text border border-tenant-border font-bold py-4 px-6 rounded-tenant-btn transition-all mt-2"
            >
              Voltar ao Login
            </button>
          </form>
        )}

        {view === 'UPDATE_PASSWORD' && (
          <form onSubmit={handleUpdatePassword} className="space-y-5 w-full">
            <div>
              <label className="block text-sm font-bold text-tenant-text mb-1.5 px-1">Nova Senha</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-4 px-6 rounded-tenant-btn transition-all mt-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex justify-center items-center"
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        )}

        {view === 'LOGIN' && (
          <p className="mt-8 text-center text-sm font-medium text-slate-500">
            Não possui uma clínica digital? <br/>
            <Link to="/register" className="text-tenant-primary font-extrabold border-b-2 border-tenant-accent hover:text-tenant-primary-hover mt-2 inline-block transition-colors pb-0.5">Criar Conta</Link>
          </p>
        )}
      </div>
    </div>
  )
}
