import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useGoogleStore } from '../stores/googleStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { syncPendingSessions, pullGoogleEvents } from '../lib/googleSync'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { setAccessToken } = useGoogleStore()
  const { session } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkGoogleConnection = async () => {
      if (!session?.user?.id) return
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        const res = await fetch(`/api/dashboard/google?action=token&psychologist_id=${session.user.id}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
        if (res.ok) {
          const data = await res.json()
          setAccessToken(data.access_token)
          setIsConnected(true)
        } else {
          setAccessToken(null)
          setIsConnected(false)
        }
      } catch (err) {
        console.error('Erro ao verificar conexão Google:', err)
        setAccessToken(null)
        setIsConnected(false)
      } finally {
        setChecking(false)
      }
    }
    checkGoogleConnection()
  }, [session])

  const login = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        if (!session?.user?.id) return
        setChecking(true)
        
        const res = await fetch('/api/dashboard/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: codeResponse.code,
            user_id: session.user.id
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          setAccessToken(data.access_token)
          setIsConnected(true)
          alert('Google Calendar conectado com sucesso! Iniciando sincronização das próximas sessões...')
          await syncPendingSessions(data.access_token, session.user.id)
          await pullGoogleEvents(data.access_token, session.user.id)
        } else {
          const errData = await res.json()
          alert('Falha ao autenticar com o servidor Google: ' + (errData.error || 'Erro desconhecido'))
        }
      } catch (err: any) {
        console.error(err)
        alert('Erro ao conectar ao Google Calendar: ' + err.message)
      } finally {
        setChecking(false)
      }
    },
    onError: () => {
      alert('Falha ao conectar com o Google Calendar')
    },
    scope: 'https://www.googleapis.com/auth/calendar.events'
  })

  const handleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do Google Calendar?')) {
      setChecking(true)
      if (session?.user?.id) {
        const { error } = await supabase
          .from('psychologists')
          .update({
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null
          })
          .eq('id', session.user.id)
          
        if (error) {
          console.error('Erro ao desconectar no banco:', error)
        }
      }
      setAccessToken(null)
      setIsConnected(false)
      setChecking(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Configurações e Integrações</h2>
        <p className="text-slate-500 mt-1 text-sm">Gerencie sua assinatura, integrações externas e automações do consultório.</p>
      </div>

      <div className="space-y-6">
        {/* Assinatura */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Assinatura Atual</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="mb-4 sm:mb-0">
               <p className="text-primary-700 font-bold bg-primary-50 border border-primary-100 px-3 py-1 rounded inline-block mb-2">Plano Premium (Ativo)</p>
               <p className="text-sm text-slate-500">Você já consumiu <span className="font-semibold text-slate-700">400</span> de 1000 minutos de processamento de AI este mês.</p>
            </div>
            <button className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm">
              Gerenciar no Stripe
            </button>
          </div>
        </section>

        {/* Notificações WhatsApp */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              Assistente de WhatsApp Remoto
              <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">ON</span>
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Envia lembretes automáticos 24h antes da sessão com opção de confirmação do paciente. Avisa automaticamente sobre boletos, links de pagamento PIX e gerencia inadimplências.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </section>

        {/* Google Calendar */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              Google Calendar
              {isConnected && <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">CONECTADO</span>}
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Sincronização com o Google Calendar. Crie e apague eventos da sua agenda diretamente do aplicativo.
            </p>
          </div>
          {checking ? (
            <span className="text-sm font-semibold text-slate-400">Verificando...</span>
          ) : isConnected ? (
            <button 
              onClick={handleDisconnect}
              className="border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center bg-white shadow-sm"
            >
              Desconectar
            </button>
          ) : (
            <button 
              onClick={() => login()}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center bg-white shadow-sm"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg>
              Conectar Conta Google
            </button>
          )}
        </section>

        {/* Personalização de Marca (White-Label) */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              Personalização da Academia (White-Label)
              <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">ESTÚDIO</span>
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Personalize o nome da plataforma, logo, favicon, cores, presets e mensagens para dar a sua própria identidade visual aos seus alunos.
            </p>
          </div>
          <button 
            onClick={() => navigate('/dashboard/brand-studio')}
            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center shadow-sm shrink-0"
          >
            Acessar Estúdio
          </button>
        </section>
      </div>
    </div>
  )
}
