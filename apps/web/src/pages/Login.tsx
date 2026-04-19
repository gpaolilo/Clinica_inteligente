import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans selection:bg-neon selection:text-dark">
      <div className="bg-surface p-10 rounded-[32px] shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col items-center">
        <div className="text-center mb-8 w-full">
          <div className="bg-neon text-dark w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-lime-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-dark tracking-tight">Clinica.ia</h2>
          <p className="text-slate-500 font-medium mt-1">Inteligência Privada Autônoma</p>
        </div>
        
        {error && <div className="w-full bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-semibold border border-rose-100 text-center">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-5 w-full">
          <div>
            <label className="block text-sm font-bold text-dark mb-1.5 px-1">E-mail</label>
            <input 
              type="email" 
              required
              placeholder="dr@clinica.com"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-neon focus:border-neon outline-none transition-all text-dark font-medium shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
             <label className="block text-sm font-bold text-dark mb-1.5 px-1">Senha</label>
             <input 
              type="password" 
              required
              placeholder="••••••••"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-neon focus:border-neon outline-none transition-all text-dark font-medium shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-dark hover:bg-black text-neon font-bold py-4 px-6 rounded-full transition-all mt-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex justify-center items-center"
          >
            {loading ? 'Autenticando...' : 'Acessar Plataforma'}
          </button>
        </form>
        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Não possui uma clínica digital? <br/>
          <Link to="/register" className="text-dark font-extrabold border-b-2 border-neon hover:text-black mt-2 inline-block transition-colors pb-0.5">Criar Conta</Link>
        </p>
      </div>
    </div>
  )
}
