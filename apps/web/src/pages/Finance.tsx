import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { 
  DollarSign, Plus, TrendingUp, Users, Calendar, 
  Settings, CheckCircle, AlertTriangle, LayoutGrid, Award, 
  ArrowRight, ShieldCheck, ChevronRight, Loader2, BarChart2
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

export default function Finance() {
  const { session } = useAuthStore()
  
  // Tab control: 'revenue' | 'products' | 'saas'
  const [activeTab, setActiveTab] = useState<'revenue' | 'products' | 'saas'>('revenue')
  const [loading, setLoading] = useState(true)
  
  // Stripe connection states
  const [stripeStatus, setStripeStatus] = useState<any>({
    status: 'NOT_CONNECTED',
    details_submitted: false,
    charges_enabled: false,
    payouts_enabled: false,
    stripe_account_id: ''
  })
  const [connectingStripe, setConnectingStripe] = useState(false)

  // Wallet stats
  const [stats, setStats] = useState({
    grossRevenue: 0,
    netRevenue: 0,
    platformFees: 0,
    stripeFees: 0,
    pendingPayouts: 0,
    subscribers: 0,
    mrr: 0,
    payoutHistory: [] as any[],
    chartData: [] as any[]
  })

  // Product catalog states
  const [products, setProducts] = useState<any[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    type: 'SINGLE_CLASS',
    price: '',
    classes_included: '1'
  })
  const [savingProduct, setSavingProduct] = useState(false)

  // SaaS subscription settings
  const [teacherPlan, setTeacherPlan] = useState('STARTER')
  const [aiWalletBalance, setAiWalletBalance] = useState(0)
  const [purchasingCredits, setPurchasingCredits] = useState<string | null>(null)
  const [subscribingSaaS, setSubscribingSaaS] = useState<string | null>(null)
  
  const [plans, setPlans] = useState<any[]>([])
  const [creditPackages, setCreditPackages] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({ usd: 1.0, brl: 5.0, eur: 0.9 })
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'brl' | 'eur'>('usd')

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

  const formatPrice = (usdPrice: number, curr: string) => {
    const rate = rates[curr.toLowerCase()] || 1.0
    const converted = usdPrice * rate
    const formatter = new Intl.NumberFormat(curr === 'brl' ? 'pt-BR' : curr === 'eur' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: curr.toUpperCase()
    })
    return formatter.format(converted)
  }

  // Fetch all dashboard & billing info
  const fetchDashboardData = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    
    try {
      // 1. Fetch Stripe connection status
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

      // 2. Fetch dashboard financials if Stripe is connected
      const statsRes = await fetch('/api/payments/dashboard', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      // 3. Fetch products
      const { data: prods } = await supabase
        .from('teacher_products')
        .select('*')
        .eq('teacher_id', session.user.id)
        .order('created_at', { ascending: false })
      
      setProducts(prods || [])

      // 4. Fetch psychologist metadata (plan and AI wallet)
      const { data: psy } = await supabase
        .from('psychologists')
        .select('plan_type')
        .eq('id', session.user.id)
        .single()

      if (psy) {
        setTeacherPlan(psy.plan_type || 'STARTER')
      }

      const { data: wallet } = await supabase
        .from('ai_wallets')
        .select('balance')
        .eq('teacher_id', session.user.id)
        .maybeSingle()

      if (wallet) {
        setAiWalletBalance(wallet.balance)
      }

      // 5. Fetch plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true })
      if (plansData) {
        setPlans(plansData)
      }

      // 6. Fetch credit packages
      const { data: packsData } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true })
      if (packsData) {
        setCreditPackages(packsData)
      }

    } catch (err) {
      console.error('Error fetching billing dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [session])

  // Triggers Stripe Express Onboarding redirect
  const handleConnectStripe = async () => {
    setConnectingStripe(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          if (data.isMock) {
            alert('Simulando Stripe Connect Express Onboarding...')
            const mockAccountId = data.stripe_account_id || 'acct_mock_' + session?.user?.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
            
            // Auto complete onboarding for mock sandbox testing
            await supabase.from('stripe_connected_accounts').upsert({
              teacher_id: session?.user?.id,
              stripe_account_id: mockAccountId,
              status: 'ACTIVE',
              details_submitted: true,
              charges_enabled: true,
              payouts_enabled: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'teacher_id' })
            
            await supabase.from('psychologists').update({
              stripe_account_id: mockAccountId,
              stripe_onboarding_completed: true,
              stripe_charges_enabled: true,
              stripe_payouts_enabled: true
            }).eq('id', session?.user?.id)
            
            fetchDashboardData()
          } else {
            window.location.href = data.url
          }
        }
      }
    } catch (err: any) {
      alert('Erro ao conectar com o Stripe: ' + err.message)
    } finally {
      setConnectingStripe(false)
    }
  }

  // Create products mapping to database
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.price) {
      alert('Preencha os campos obrigatórios.')
      return
    }

    setSavingProduct(true)
    try {
      const { data, error } = await supabase
        .from('teacher_products')
        .insert([{
          teacher_id: session?.user?.id,
          name: newProduct.name,
          description: newProduct.description,
          type: newProduct.type,
          price: parseFloat(newProduct.price),
          classes_included: parseInt(newProduct.classes_included, 10),
          active: true
        }])
        .select('*')
      
      if (error) throw error

      // Create mock Stripe Price mapping for checkout
      if (data && data.length > 0) {
        await supabase
          .from('teacher_product_prices')
          .insert([{
            product_id: data[0].id,
            stripe_price_id: 'price_mock_' + Math.random().toString(36).substring(2, 10),
            price: parseFloat(newProduct.price),
            currency: 'USD'
          }])
      }

      setShowProductModal(false)
      setNewProduct({
        name: '',
        description: '',
        type: 'SINGLE_CLASS',
        price: '',
        classes_included: '1'
      })
      fetchDashboardData()
    } catch (err: any) {
      alert('Erro ao criar produto: ' + err.message)
    } finally {
      setSavingProduct(false)
    }
  }

  // Handle SaaS subscription purchase
  const handleSaaSSubscribe = async (plan: string) => {
    setSubscribingSaaS(plan)
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
          planType: plan,
          currency: selectedCurrency
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.isMock) {
          alert(`Inscrição simulada com sucesso no plano ${plan}! Concedendo benefícios...`)
          // Simulate webhook completed locally
          const finalPrice = data.price !== undefined ? Number(data.price) : (() => {
            const rate = rates[selectedCurrency] || 1.0
            const dbPlan = plans.find(p => p.name === plan.toUpperCase())
            const basePrice = dbPlan ? Number(dbPlan.price) : (plan === 'ACADEMY' ? 399.00 : plan === 'GROWTH' ? 129.00 : 59.00)
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
                    plan_type: plan,
                    price_amount: String(finalPrice)
                  }
                }
              }
            })
          })
          fetchDashboardData()
        } else if (data.url) {
          window.location.href = data.url
        }
      }
    } catch (err: any) {
      alert('Erro ao processar assinatura: ' + err.message)
    } finally {
      setSubscribingSaaS(null)
    }
  }

  // Handle buying credits
  const handleBuyCredits = async (pack: string) => {
    setPurchasingCredits(pack)
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
          action: 'purchase_credits',
          creditPack: pack,
          currency: selectedCurrency
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.isMock) {
          alert(`Simulando compra do pacote de ${pack} créditos de IA...`)
          // Trigger local webhook mock
          const finalPrice = data.price !== undefined ? Number(data.price) : (() => {
            const rate = rates[selectedCurrency] || 1.0
            const dbPack = creditPackages.find(p => String(p.credits) === pack)
            const basePackPrice = dbPack ? Number(dbPack.price) : (pack === '50000' ? 149.00 : pack === '20000' ? 69.00 : 19.00)
            return basePackPrice * rate
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
                    type: 'CREDITS',
                    teacher_id: session?.user?.id,
                    credits_added: pack,
                    price_amount: String(finalPrice)
                  }
                }
              }
            })
          })
          fetchDashboardData()
        } else if (data.url) {
          window.location.href = data.url
        }
      }
    } catch (err: any) {
      alert('Erro ao processar compra de créditos: ' + err.message)
    } finally {
      setPurchasingCredits(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-tenant-primary" />
          <span className="text-sm font-semibold text-slate-550">Buscando informações financeiras...</span>
        </div>
      </div>
    )
  }

  const isStripeActive = stripeStatus.status === 'ACTIVE'

  const renderStripeConnectCTA = (message?: string) => (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="space-y-4 max-w-2xl text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">
          {stripeStatus.status === 'RESTRICTED' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" /> Ações Requeridas (Restrita)
            </>
          ) : (
            <>
              <Settings className="w-3.5 h-3.5" /> Pagamentos Desconectados
            </>
          )}
        </div>
        
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comece a faturar com sua própria marca 🚀</h2>
        <p className="text-slate-500 text-sm leading-relaxed font-semibold">
          {message || 'Conecte sua conta bancária ao Stripe Connect Express para criar produtos de ensino, vender assinaturas mensais recorrentes para seus alunos e receber payouts automáticos sem complicação.'}
        </p>

        <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Segurança Stripe Connect
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            PIX & Cartão automáticos
          </div>
        </div>
      </div>

      <div className="shrink-0 w-full md:w-auto text-center">
        <button
          onClick={handleConnectStripe}
          disabled={connectingStripe}
          className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-4 px-8 rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5"
        >
          {connectingStripe ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Configurando Conta...</span>
            </>
          ) : (
            <>
              <span>Conectar Gateway Stripe</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Configuração Express de 2 minutos</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 select-none font-sans">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-tenant-primary" /> Centro de Receitas Flowike
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Controle suas vendas, planos de alunos, payouts automáticos e créditos de IA.</p>
        </div>
        
        {isStripeActive && (
          <button 
            onClick={() => setShowProductModal(true)}
            className="flex items-center gap-1.5 bg-tenant-primary hover:bg-tenant-primary-hover text-white font-bold py-2.5 px-4 rounded-tenant-btn shadow-sm text-xs hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Criar Produto / Plano
          </button>
        )}
      </div>

      {/* Main Panel Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-6">
        <button 
          onClick={() => setActiveTab('revenue')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'revenue' 
              ? 'border-tenant-primary text-tenant-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Receitas & Payouts
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'products' 
              ? 'border-tenant-primary text-tenant-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Meus Produtos & Aulas
        </button>
        <button 
          onClick={() => setActiveTab('saas')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'saas' 
              ? 'border-tenant-primary text-tenant-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-655'
          }`}
        >
          <Award className="w-4 h-4" /> Assinatura Flowike & IA
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'revenue' && (
        !isStripeActive ? (
          renderStripeConnectCTA('Conecte sua conta do Stripe para visualizar suas métricas financeiras, payouts e comissões.')
        ) : (
          <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faturamento Bruto</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800">$ {stats.grossRevenue.toFixed(2)}</span>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Líquida</span>
              <span className="text-xl sm:text-2xl font-black text-tenant-primary">$ {stats.netRevenue.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comissões Flowike</span>
              <span className="text-xl sm:text-2xl font-black text-rose-500">$ {stats.platformFees.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Taxas Stripe</span>
              <span className="text-xl sm:text-2xl font-black text-amber-500">$ {stats.stripeFees.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subscritores Ativos</span>
                <span className="text-xl sm:text-2xl font-black text-slate-850">{stats.subscribers} alunos</span>
              </div>
              <Users className="w-8 h-8 text-slate-200" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MRR Estimado</span>
                <span className="text-xl sm:text-2xl font-black text-slate-850">$ {stats.mrr.toFixed(2)}/mês</span>
              </div>
              <BarChart2 className="w-8 h-8 text-slate-200" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Disponível para Payout</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600">$ {stats.pendingPayouts.toFixed(2)}</span>
              </div>
              <ShieldCheck className="w-8 h-8 text-slate-200" />
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ciclo Payouts</span>
                <span className="text-xl sm:text-2xl font-black text-slate-750">Automático</span>
              </div>
              <Calendar className="w-8 h-8 text-slate-200" />
            </div>
          </div>

          {/* Revenue Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-tenant-primary" /> Histórico de Receita Diária (7 dias)
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--tenant-primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--tenant-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                    <Area type="monotone" dataKey="Receita" stroke="var(--tenant-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorGross)" />
                    <Area type="monotone" dataKey="Líquido" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payout History Area */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Payouts Recentes</h3>
              <div className="flex-1 overflow-y-auto max-h-60 space-y-3.5 pr-1">
                {stats.payoutHistory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs font-semibold py-12">
                    Nenhum payout efetuado na conta bancária ainda.
                  </div>
                ) : (
                  stats.payoutHistory.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Transferência Bancária</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-black text-emerald-600">+ ${p.amount.toFixed(2)}</span>
                        <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'
                        }`}>{p.status === 'PAID' ? 'Pago' : 'Pendente'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        )
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        !isStripeActive ? (
          renderStripeConnectCTA('Conecte sua conta do Stripe para gerenciar seu catálogo de aulas e criar planos para seus alunos.')
        ) : (
          <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Catálogo de Produtos & Planos de Ensino</h3>
            </div>
            
            {products.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-sm">
                Nenhum produto cadastrado. Clique no botão de criação acima para ofertar aulas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {products.map(prod => (
                  <div key={prod.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm sm:text-base">{prod.name}</h4>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          prod.type === 'MONTHLY_SUBSCRIPTION' ? 'bg-indigo-50 text-indigo-700' :
                          prod.type === 'PACKAGE' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-650'
                        }`}>
                          {prod.type === 'MONTHLY_SUBSCRIPTION' ? 'Mensal Recorrente' :
                           prod.type === 'PACKAGE' ? 'Pacote' : 'Aula Individual'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-450 font-medium mt-1">{prod.description || 'Nenhuma descrição fornecida.'}</p>
                      <span className="block text-[10px] text-slate-400 font-bold mt-2">
                        Créditos de Aula incluídos: <span className="text-slate-800 font-extrabold">{prod.classes_included} aulas</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block font-black text-slate-800 text-lg">${prod.price.toFixed(2)}</span>
                      <span className={`text-[10px] font-bold ${prod.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {prod.active ? 'Ativo' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )
      )}

      {/* SAAS PLATFORM PLANS TAB */}
      {activeTab === 'saas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Credit store wallet */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carteira IA</span>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{aiWalletBalance} Créditos</h3>
              <p className="text-xs text-slate-450 font-medium mt-2 leading-relaxed">
                Seus créditos de IA são consumidos de acordo com o uso das ferramentas de lição de casa automatizada, relatórios de evolução e análises de áudio.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comprar mais créditos</span>
              
              <div className="grid grid-cols-1 gap-2.5">
                {(creditPackages.length > 0 ? creditPackages : [
                  { id: '5000', name: 'Starter Pack', credits: 5000, price: 19.00 },
                  { id: '20000', name: 'Growth Pack', credits: 20000, price: 69.00 },
                  { id: '50000', name: 'Academy Pack', credits: 50000, price: 149.00 }
                ]).map(pack => {
                  const creditsStr = String(pack.credits)
                  return (
                    <button
                      key={pack.id || creditsStr}
                      onClick={() => handleBuyCredits(creditsStr)}
                      disabled={purchasingCredits !== null}
                      className="flex justify-between items-center p-3 border border-slate-200 hover:border-tenant-primary rounded-xl text-left bg-slate-50/50 hover:bg-white transition-all group"
                    >
                      <div>
                        <span className="block text-xs font-bold text-slate-800">{pack.credits} Créditos</span>
                        <span className="text-[10px] text-slate-400 font-bold">{pack.name || 'Pacote IA'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800">{formatPrice(Number(pack.price), selectedCurrency)}</span>
                        {purchasingCredits === creditsStr ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-tenant-primary" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
 
          {/* SaaS Membership and pricing */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Sua Assinatura Flowike</h3>
                <p className="text-xs text-slate-450 mt-1 font-medium">Assine planos premium para habilitar marcas exclusivas, menor rev-share e maior limite de IA.</p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0 self-start sm:self-center">
                {(['usd', 'brl', 'eur'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                      selectedCurrency === curr
                        ? 'bg-white text-slate-850 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {(plans.length > 0 ? plans : [
                { name: 'STARTER', price: 59.00 },
                { name: 'GROWTH', price: 129.00 },
                { name: 'ACADEMY', price: 399.00 }
              ]).map(plan => {
                const isCurrent = teacherPlan === plan.name
                const isDark = plan.name === 'ACADEMY'
                const isGrowth = plan.name === 'GROWTH'
                
                let planColorClass = 'border-slate-200 bg-white shadow-sm'
                if (isGrowth) planColorClass = 'border-tenant-primary ring-2 ring-tenant-primary/10'
                if (isDark) planColorClass = 'border-slate-800 bg-slate-900 text-white'

                const sharePercent = plan.name === 'STARTER' ? '15%' : plan.name === 'GROWTH' ? '10%' : '5%'
                const creditsAlloc = plan.name === 'STARTER' ? '50' : plan.name === 'GROWTH' ? '500' : '2000'
                
                return (
                  <div key={plan.name} className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[220px] ${planColorClass}`}>
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{plan.name}</span>
                        {isCurrent && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-white text-slate-900' : 'bg-tenant-primary/10 text-tenant-primary'
                          }`}>Ativo</span>
                        )}
                      </div>
 
                      <div className="mt-3">
                        <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{formatPrice(Number(plan.price), selectedCurrency)}</span>
                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/mês</span>
                      </div>
 
                      <ul className="mt-4 space-y-2 text-[10px] font-bold">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-tenant-primary shrink-0" />
                          {sharePercent} Taxa de Rev-share
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-tenant-primary shrink-0" />
                          {creditsAlloc} Créditos IA inclusos
                        </li>
                      </ul>
                    </div>
 
                    {!isCurrent && (
                      <button
                        onClick={() => handleSaaSSubscribe(plan.name)}
                        disabled={subscribingSaaS !== null}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all mt-4 border flex items-center justify-center gap-1.5 ${
                          isDark 
                            ? 'bg-white text-slate-900 hover:bg-slate-100 border-white' 
                            : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900'
                        }`}
                      >
                        {subscribingSaaS === plan.name ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <span>Assinar Plano</span>
                            <ChevronRight className="w-3 h-3" />
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

      {/* CREATE PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Criar Novo Produto / Plano</h3>
            
            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Nome do Produto</label>
                <input 
                  type="text" 
                  placeholder="ex: Aula Particular de Inglês de Negócios"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-tenant-primary transition-all"
                  value={newProduct.name}
                  onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Descrição</label>
                <textarea 
                  placeholder="Detalhes sobre o pacote, material didático incluso..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-tenant-primary transition-all h-16 resize-none"
                  value={newProduct.description}
                  onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Tipo de Cobrança</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-tenant-primary transition-all"
                    value={newProduct.type}
                    onChange={e => setNewProduct(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="SINGLE_CLASS">Aula Individual</option>
                    <option value="PACKAGE">Pacote de Aulas</option>
                    <option value="MONTHLY_SUBSCRIPTION">Mensal Recorrente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Preço ($ USD)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 45"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-tenant-primary transition-all"
                    value={newProduct.price}
                    onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Aulas incluídas no Saldo</label>
                <input 
                  type="number" 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-tenant-primary transition-all"
                  value={newProduct.classes_included}
                  onChange={e => setNewProduct(prev => ({ ...prev, classes_included: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 py-2.5 bg-tenant-primary hover:bg-tenant-primary-hover text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {savingProduct ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Salvar Produto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
