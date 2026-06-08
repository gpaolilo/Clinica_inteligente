import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useGoogleStore } from '../stores/googleStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { syncPendingSessions, pullGoogleEvents } from '../lib/googleSync'
import { useNavigate } from 'react-router-dom'
import { usePlanFeatures } from '../hooks/usePlanFeatures'
import { Loader2, ChevronRight, CheckCircle, AlertTriangle, CreditCard, Clock } from 'lucide-react'

export default function Settings() {
  const { setAccessToken } = useGoogleStore()
  const { session } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  const { plan: activePlan, loading: loadingPlan } = usePlanFeatures()
  const [plans, setPlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [switchingPlanName, setSwitchingPlanName] = useState<string | null>(null)
  const [wallet, setWallet] = useState<any>(null)
  
  const [rates, setRates] = useState<Record<string, number>>({ usd: 1.0, brl: 5.0, eur: 0.9 })
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'brl' | 'eur'>('usd')

  const [stripeStatus, setStripeStatus] = useState<any>({
    status: 'NOT_CONNECTED',
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
    stripe_account_id: ''
  })
  const [loadingStripe, setLoadingStripe] = useState(true)

  useEffect(() => {
    const fetchStripeStatus = async () => {
      if (!session?.user?.id) return
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        const statusRes = await fetch('/api/payments/connect', {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setStripeStatus(statusData)
        }
      } catch (err) {
        console.error('Error fetching Stripe status in Settings:', err)
      } finally {
        setLoadingStripe(false)
      }
    }
    fetchStripeStatus()
  }, [session])

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/payments/rates')
        if (res.ok) {
          const data = await res.json()
          setRates(data)
        }
      } catch (err) {
        console.error('Error fetching rates:', err)
      }
    }
    fetchRates()
  }, [])

  useEffect(() => {
    const loadPlansAndWallet = async () => {
      if (!session?.user?.id) return
      try {
        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true })
        if (plansData) setPlans(plansData)

        const { data: walletData } = await supabase
          .from('teacher_wallets')
          .select('*')
          .eq('teacher_id', session.user.id)
          .maybeSingle()
        setWallet(walletData)
      } catch (err) {
        console.error('Error loading plans/wallet:', err)
      } finally {
        setLoadingPlans(false)
      }
    }
    loadPlansAndWallet()
  }, [session])

  const formatPrice = (usdPrice: number, curr: string) => {
    const rate = rates[curr.toLowerCase()] || 1.0
    const converted = usdPrice * rate
    const formatter = new Intl.NumberFormat(curr === 'brl' ? 'pt-BR' : curr === 'eur' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: curr.toUpperCase()
    })
    return formatter.format(converted)
  }

  useEffect(() => {
    const handleBillingCallback = async () => {
      const queryParams = new URLSearchParams(window.location.search)
      const billingParam = queryParams.get('billing')
      
      if (billingParam === 'success' || billingParam === 'success_mock') {
        if (billingParam === 'success_mock') {
          const planTypeParam = queryParams.get('plan_type') || 'STARTER'
          const sessionIdParam = queryParams.get('session_id') || ('saas_sess_' + Math.random().toString(36).substring(2, 10))
          const priceParam = queryParams.get('price')
          
          let finalPrice = 0
          if (priceParam) {
            finalPrice = parseFloat(priceParam)
          } else {
            const dbPlan = plans.find(p => p.name === planTypeParam.toUpperCase())
            const basePrice = dbPlan ? Number(dbPlan.price) : (planTypeParam === 'ACADEMY' ? 399.00 : planTypeParam === 'GROWTH' ? 129.00 : 59.00)
            const currencyParam = (queryParams.get('currency') || 'usd').toLowerCase()
            const rate = rates[currencyParam] || 1.0
            finalPrice = basePrice * rate
          }
          
          await fetch('/api/payments/webhook', {
            method: 'POST',
            body: JSON.stringify({
              type: 'checkout.session.completed',
              data: {
                object: {
                  id: sessionIdParam,
                  payment_intent: 'pi_mock_' + Math.random().toString(36).substring(2, 8),
                  metadata: {
                    type: 'SAAS',
                    teacher_id: session?.user?.id,
                    plan_type: planTypeParam,
                    price_amount: String(finalPrice)
                  }
                }
              }
            })
          })
        }
        
        alert('Seu plano foi atualizado com sucesso!')
        window.history.replaceState({}, document.title, window.location.pathname)
        window.location.reload()
      }
    }
    if (session?.user?.id) {
      handleBillingCallback()
    }
  }, [session, rates])

  const handleSwitchPlan = async (planName: string) => {
    setSwitchingPlanName(planName)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('/api/payments/saas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'saas_subscribe',
          planType: planName,
          source: 'settings',
          currency: selectedCurrency
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.isMock) {
          alert(`Inscrição simulada com sucesso no plano ${planName}! Concedendo benefícios...`)
          const finalPrice = data.price !== undefined ? Number(data.price) : (() => {
            const rate = rates[selectedCurrency] || 1.0
            const dbPlan = plans.find(p => p.name === planName.toUpperCase())
            const basePrice = dbPlan ? Number(dbPlan.price) : (planName === 'ACADEMY' ? 399.00 : planName === 'GROWTH' ? 129.05 : 59.00)
            return basePrice * rate
          })()

          await fetch('/api/payments/webhook', {
            method: 'POST',
            body: JSON.stringify({
              type: 'checkout.session.completed',
              data: {
                object: {
                  id: data.session_id,
                  payment_intent: 'pi_mock_' + Math.random().toString(36).substring(2, 8),
                  metadata: {
                    type: 'SAAS',
                    teacher_id: session?.user?.id,
                    plan_type: planName,
                    price_amount: String(finalPrice)
                  }
                }
              }
            })
          })
          window.location.reload()
        } else if (data.url) {
          window.location.href = data.url
        }
      } else {
        const err = await res.json()
        alert('Erro ao mudar de plano: ' + (err.error || 'Erro desconhecido'))
      }
    } catch (err: any) {
      console.error(err)
      alert('Erro ao processar alteração de plano: ' + err.message)
    } finally {
      setSwitchingPlanName(null)
    }
  }

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
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Configurações e Integrações</h2>
        <p className="text-slate-500 mt-1 text-sm">Gerencie sua assinatura, integrações externas e automações do consultório.</p>
      </div>

      <div className="space-y-6">
        {/* Assinatura */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Assinatura Atual</h3>
          {loadingPlan || loadingPlans ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold text-slate-450">Buscando assinatura...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="mb-2 sm:mb-0 text-slate-800">
                   <p className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1 rounded inline-block mb-2 text-xs">
                     Plano {activePlan?.name || 'STARTER'} (Ativo)
                   </p>
                   <p className="text-sm text-slate-500">
                     Você já consumiu <span className="font-semibold text-slate-700">{wallet?.credits_consumed || 0}</span> de <span className="font-semibold text-slate-700">{wallet?.monthly_allocation || activePlan?.included_credits || 8000}</span> créditos de IA este mês.
                   </p>
                   <p className="text-xs text-slate-400 mt-1 font-semibold">
                     Limite de alunos ativos: {activePlan?.student_limit || 10} assentos.
                   </p>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/finance')}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm justify-center flex items-center text-sm"
                >
                  Ver no Centro Financeiro
                </button>
              </div>

              {/* Mudar Plano */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alterar Plano de Assinatura</h4>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['usd', 'brl', 'eur'] as const).map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setSelectedCurrency(curr)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                          selectedCurrency === curr
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const isCurrent = activePlan?.name === p.name
                    return (
                      <div key={p.name} className={`p-4 rounded-xl border flex flex-col justify-between min-h-[180px] text-slate-800 ${
                        isCurrent ? 'border-indigo-500 bg-indigo-50/15' : 'border-slate-200'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-800">{p.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Ativo</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <span className="text-xl font-black text-slate-900">{formatPrice(Number(p.price), selectedCurrency)}</span>
                            <span className="text-[10px] font-bold text-slate-500">/mês</span>
                          </div>
                          <ul className="mt-3 space-y-1 text-[10px] text-slate-500 font-semibold">
                            <li>• Limite de {p.student_limit} alunos</li>
                            <li>• {p.included_credits.toLocaleString()} créditos de IA</li>
                          </ul>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => handleSwitchPlan(p.name)}
                            disabled={switchingPlanName !== null}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 mt-4"
                          >
                            {switchingPlanName === p.name ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <span>Mudar para {p.name}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Notificações WhatsApp */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              Assistente de WhatsApp Remoto
              <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">ON</span>
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Envia lembretes automáticos 24h antes da sessão com opção de confirmação do paciente. Avisa automaticamente sobre boletos, links de pagamento PIX e gerencia inadimplências.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </section>

        {/* Google Calendar */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
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
              className="w-full sm:w-auto border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center bg-white shadow-sm shrink-0"
            >
              Desconectar
            </button>
          ) : (
            <button 
              onClick={() => login()}
              className="w-full sm:w-auto border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center bg-white shadow-sm shrink-0"
            >
              <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg>
              Conectar Conta Google
            </button>
          )}
        </section>

        {/* Gateway de Pagamentos (Stripe) */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0 space-y-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              Gateway de Pagamentos (Stripe)
              {loadingStripe ? (
                <span className="text-xs text-slate-400 font-semibold">Verificando...</span>
              ) : (
                <>
                  {stripeStatus.status === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      <CheckCircle className="w-3 h-3 text-emerald-600 animate-pulse" /> Conectado
                    </span>
                  )}
                  {stripeStatus.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Em Análise
                    </span>
                  )}
                  {stripeStatus.status === 'RESTRICTED' && (
                    <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Ação Requerida
                    </span>
                  )}
                  {stripeStatus.status === 'NOT_CONNECTED' && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      Desconectado
                    </span>
                  )}
                </>
              )}
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Integração com o Stripe Express. Crie planos e pacotes de aulas para faturamento automático de seus alunos via Cartão ou PIX.
            </p>
            {!loadingStripe && stripeStatus.status !== 'NOT_CONNECTED' && (
              <div className="pt-1 text-xs font-bold text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>Conta Stripe Vinculada:</span>
                <code className="bg-slate-100 text-slate-800 font-mono px-1.5 py-0.5 rounded text-[11px] font-black">{stripeStatus.stripe_account_id}</code>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/dashboard/finance')}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center shadow-sm shrink-0 gap-1.5 text-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span>Gerenciar no Financeiro</span>
          </button>
        </section>

        {/* Personalização de Marca (White-Label) */}
        <section className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
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
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center shadow-sm shrink-0"
          >
            Acessar Estúdio
          </button>
        </section>
      </div>
    </div>
  )
}
