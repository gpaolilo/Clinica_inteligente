import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useTenantBranding } from '../hooks/useTenantBranding'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  
  const { 
    appName, 
    logoUrl, 
    loginBackgroundUrl,
    loading: brandingLoading
  } = useTenantBranding()

  if (brandingLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: authError } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { full_name: name }
      }
    })
    
    if (authError) {
      setError(authError.message)
    } else {
      if (data.session) {
        navigate('/')
      } else {
        alert("Conta criada! Verifique seu email para confirmar o login.")
        navigate('/login')
      }
    }
    setLoading(false)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-tenant-background px-4 font-sans selection:bg-tenant-accent selection:text-dark relative overflow-hidden"
      style={loginBackgroundUrl ? { backgroundImage: `url(${loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {/* Fallback overlay para melhorar contraste quando houver imagem de fundo */}
      {loginBackgroundUrl && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0" />}

      <div className="bg-tenant-surface p-10 rounded-tenant-card shadow-2xl w-full max-w-md border border-tenant-border flex flex-col items-center z-10">
        <div className="text-center mb-8 w-full">
          {logoUrl ? (
            <img src={logoUrl} alt={appName} className="max-h-20 max-w-[200px] object-contain mx-auto mb-6" />
          ) : (
            <div className="bg-tenant-accent text-dark w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-tenant-border">
              <svg className="w-8 h-8 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m-3-3v3m3-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-tenant-text tracking-tight">Criar Conta</h2>
          <p className="text-slate-500 font-medium mt-1.5 text-sm">Configure sua conta no {appName}</p>
        </div>
        
        {error && <div className="w-full bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-semibold border border-rose-100 text-center">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-5 w-full">
          <div>
            <label className="block text-sm font-bold text-tenant-text mb-1.5 px-1">Nome Completo (Psicólogo/Professor)</label>
            <input 
              type="text" 
              required
              placeholder="Dr. João Silva"
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
             <label className="block text-sm font-bold text-tenant-text mb-1.5 px-1">Crie uma Senha</label>
             <input 
              type="password" 
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-tenant-border rounded-tenant-btn focus:bg-tenant-surface focus:ring-2 focus:ring-tenant-primary focus:border-tenant-primary outline-none transition-all text-tenant-text font-medium shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-4 px-6 rounded-tenant-btn transition-all mt-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex justify-center items-center"
          >
            {loading ? 'Criando Estrutura...' : 'Abrir Minha Academia'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Já tem conta? <br/>
          <Link to="/login" className="text-tenant-primary font-extrabold border-b-2 border-tenant-accent hover:text-tenant-primary-hover mt-2 inline-block transition-colors pb-0.5">Faça Login</Link>
        </p>
      </div>
    </div>
  )
}
