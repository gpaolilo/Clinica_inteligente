import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  RefreshCw, Loader2, BarChart3, Plus, Settings, ShieldAlert, Award, Coins, Check, X, ArrowLeftRight, TrendingUp, Users, Brain
} from 'lucide-react'

export default function AdminPayments() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'subscriptions' | 'revenue_rules' | 'transactions' | 'disputes' | 'payouts' | 'credits'>('overview')

  // Platform KPIs
  const [kpis, setKpis] = useState({
    mrr: 0,
    arr: 0,
    revShareRevenue: 0,
    aiRevenue: 0,
    saasRevenue: 0,
    totalPlatformRevenue: 0,
    totalTeacherRevenue: 0,
    activeSubscribers: 0,
    churnRate: 0
  })

  // Data lists
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([])
  const [creditSales, setCreditSales] = useState<any[]>([])

  // New Admin lists
  const [psychologists, setPsychologists] = useState<any[]>([])
  const [revenueRules, setRevenueRules] = useState<any[]>([])
  const [aiTransactions, setAiTransactions] = useState<any[]>([])
  const [allPayments, setAllPayments] = useState<any[]>([])

  // Interactive Admin state variables
  const [refillCreditsInput, setRefillCreditsInput] = useState<{ [key: string]: string }>({})
  const [newPlanType, setNewPlanType] = useState('')
  const [newPlanPercentage, setNewPlanPercentage] = useState('')
  const [newPlanCredits, setNewPlanCredits] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingPercentage, setEditingPercentage] = useState('')
  const [editingCredits, setEditingCredits] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [payoutAmountInput, setPayoutAmountInput] = useState('')
  const [creditsLogTab, setCreditsLogTab] = useState<'sales' | 'usage'>('sales')

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      // 1. Fetch dashboard metrics
      const kpiRes = await fetch('/api/payments/dashboard', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (kpiRes.ok) {
        const metrics = await kpiRes.json()
        setKpis(metrics)
      }

      // 2. Fetch platform subscriptions
      const { data: subData } = await supabase
        .from('platform_subscriptions')
        .select('*, psychologists(full_name, email)')
        .order('created_at', { ascending: false })
      setSubscriptions(subData || [])

      // 3. Fetch payment transactions
      const { data: transData } = await supabase
        .from('payment_transactions')
        .select('*, payments(*, payer:profiles(full_name), payee:profiles(full_name))')
        .order('created_at', { ascending: false })
      setTransactions(transData || [])

      // 4. Fetch payouts
      const { data: payoutData } = await supabase
        .from('payouts')
        .select('*, psychologists(full_name)')
        .order('created_at', { ascending: false })
      setPayouts(payoutData || [])

      // 5. Fetch connected Stripe accounts
      const { data: connData } = await supabase
        .from('stripe_connected_accounts')
        .select('*, psychologists(full_name, email)')
      setConnectedAccounts(connData || [])

      // 6. Fetch AI credit purchases
      const { data: aiSales } = await supabase
        .from('payments')
        .select('*, payer:profiles(full_name)')
        .eq('type', 'CREDITS')
        .eq('status', 'SUCCEEDED')
        .order('created_at', { ascending: false })
      setCreditSales(aiSales || [])

      // 7. Fetch psychologists and their AI wallets
      const { data: psyData } = await supabase
        .from('psychologists')
        .select('*, ai_wallets(balance)')
        .order('full_name')
      setPsychologists(psyData || [])

      // 8. Fetch revenue rules
      const { data: rulesData } = await supabase
        .from('revenue_share_rules')
        .select('*')
        .order('plan_type')
      setRevenueRules(rulesData || [])

      // 9. Fetch AI transactions
      const { data: aiTxData } = await supabase
        .from('ai_transactions')
        .select('*, psychologists(full_name, email)')
        .order('created_at', { ascending: false })
      setAiTransactions(aiTxData || [])

      // 10. Fetch all payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*, payer:profiles(full_name), payee:profiles(full_name)')
        .order('created_at', { ascending: false })
      setAllPayments(payData || [])

    } catch (err) {
      console.error('Error fetching admin finance metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [session])

  // PLAN MANAGEMENT: Switch a teacher's plan type
  const handleUpdatePlan = async (teacherId: string, plan: string) => {
    try {
      // 1. Update plan type in psychologists table
      const { error: psyErr } = await supabase
        .from('psychologists')
        .update({ plan_type: plan })
        .eq('id', teacherId)
      if (psyErr) throw psyErr

      // 2. Fetch the plan details to get credits_included
      const { data: rule } = await supabase
        .from('revenue_share_rules')
        .select('credits_included')
        .eq('plan_type', plan.toUpperCase())
        .maybeSingle()

      // Default fallback if not configured
      let planCredits = 50
      if (rule) {
        planCredits = rule.credits_included
      } else {
        if (plan.toUpperCase() === 'PRO') planCredits = 500
        else if (plan.toUpperCase() === 'ACADEMY') planCredits = 2000
      }

      // 3. Update their ai_wallets balance to that plan's credits
      const { data: wallet } = await supabase
        .from('ai_wallets')
        .select('id')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      if (wallet) {
        await supabase
          .from('ai_wallets')
          .update({ balance: planCredits })
          .eq('teacher_id', teacherId)
      } else {
        await supabase
          .from('ai_wallets')
          .insert([{ teacher_id: teacherId, balance: planCredits }])
      }

      // 4. Log in ai_transactions
      await supabase
        .from('ai_transactions')
        .insert([{
          teacher_id: teacherId,
          action: 'PURCHASE',
          credits_used: -planCredits // Negative represents refill/grant
        }])

      // 5. Check platform_subscriptions and update or insert active sub
      const { data: existingSub } = await supabase
        .from('platform_subscriptions')
        .select('id')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      if (existingSub) {
        await supabase
          .from('platform_subscriptions')
          .update({ plan_type: plan, status: 'ACTIVE' })
          .eq('id', existingSub.id)
      } else {
        await supabase
          .from('platform_subscriptions')
          .insert([{
            teacher_id: teacherId,
            plan_type: plan,
            status: 'ACTIVE',
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }])
      }

      alert(`Plano do professor atualizado com sucesso! Carteira IA sincronizada com ${planCredits} créditos.`)
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao atualizar plano: ' + err.message)
    }
  }


  // REFILL CREDITS: Add AI credits manually to teacher
  const handleRefillCredits = async (teacherId: string) => {
    const amountStr = refillCreditsInput[teacherId]
    const amount = Number(amountStr)
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, informe um valor de créditos válido.')
      return
    }

    try {
      const { data: wallet } = await supabase
        .from('ai_wallets')
        .select('balance')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      const currentBalance = wallet ? wallet.balance : 0
      const newBalance = currentBalance + amount

      if (wallet) {
        await supabase
          .from('ai_wallets')
          .update({ balance: newBalance })
          .eq('teacher_id', teacherId)
      } else {
        await supabase
          .from('ai_wallets')
          .insert([{ teacher_id: teacherId, balance: newBalance }])
      }

      // Log in ai_transactions
      await supabase
        .from('ai_transactions')
        .insert([{
          teacher_id: teacherId,
          action: 'PURCHASE',
          credits_used: -amount // negative represents refill/credit addition
        }])

      setRefillCreditsInput(prev => ({ ...prev, [teacherId]: '' }))
      alert(`Concedido ${amount} créditos de IA com sucesso!`)
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao conceder créditos: ' + err.message)
    }
  }

  // REVENUE SHARE: Update rule percentage & credits
  const handleUpdateRevenueRule = async (id: string) => {
    const pct = Number(editingPercentage)
    const creds = Number(editingCredits)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert('Por favor, informe uma porcentagem válida (0 a 100).')
      return
    }
    if (isNaN(creds) || creds < 0) {
      alert('Por favor, informe uma quantidade de créditos de IA válida.')
      return
    }

    try {
      await supabase
        .from('revenue_share_rules')
        .update({ 
          percentage: pct,
          credits_included: creds
        })
        .eq('id', id)

      setEditingRuleId(null)
      alert('Regra de comissão e créditos atualizada com sucesso!')
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao atualizar comissão: ' + err.message)
    }
  }


  // REVENUE SHARE: Create a new custom plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlanType || !newPlanPercentage || !newPlanCredits) {
      alert('Por favor, preencha todos os campos do plano.')
      return
    }

    const pct = Number(newPlanPercentage)
    const creds = Number(newPlanCredits)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert('A porcentagem de comissão deve ser entre 0 e 100.')
      return
    }
    if (isNaN(creds) || creds < 0) {
      alert('Os créditos incluídos devem ser maiores ou iguais a 0.')
      return
    }

    try {
      const planNameUpper = newPlanType.toUpperCase().replace(/\s+/g, '_')
      await supabase
        .from('revenue_share_rules')
        .insert([{
          plan_type: planNameUpper,
          percentage: pct,
          credits_included: creds
        }])

      setNewPlanType('')
      setNewPlanPercentage('')
      setNewPlanCredits('')
      alert(`Novo plano ${planNameUpper} criado com sucesso!`)
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao criar plano: ' + err.message)
    }
  }

  // DISPUTES: Simulate dispute initiation on successful payments
  const handleSimulateDispute = async (paymentId: string) => {
    try {
      await supabase
        .from('payments')
        .update({ status: 'DISPUTED' })
        .eq('id', paymentId)

      alert('Disputa de cobrança simulada com sucesso!')
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao simular disputa: ' + err.message)
    }
  }

  // DISPUTES: Resolve disputes WON or LOST (Refunded)
  const handleResolveDispute = async (paymentId: string, resolution: 'WON' | 'LOST') => {
    try {
      const newStatus = resolution === 'WON' ? 'SUCCEEDED' : 'REFUNDED'
      await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId)

      alert(`Disputa resolvida com sucesso! Status da cobrança: ${resolution === 'WON' ? 'Ganha (Mantida)' : 'Perdida (Estornada)'}`)
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao resolver disputa: ' + err.message)
    }
  }

  // PAYOUTS: Mark pending payout as completed
  const handleConfirmPayout = async (payoutId: string) => {
    try {
      await supabase
        .from('payouts')
        .update({ status: 'PAID' })
        .eq('id', payoutId)

      alert('Payout confirmado como pago com sucesso!')
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao confirmar payout: ' + err.message)
    }
  }

  // PAYOUTS: Trigger/create manual payout for teacher
  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(payoutAmountInput)
    if (!selectedTeacherId || isNaN(amount) || amount <= 0) {
      alert('Por favor, selecione o professor e insira um valor de repasse válido.')
      return
    }

    try {
      await supabase
        .from('payouts')
        .insert([{
          teacher_id: selectedTeacherId,
          amount: amount,
          currency: 'USD',
          status: 'PENDING',
          stripe_payout_id: 'po_manual_' + Math.random().toString(36).substring(2, 10),
          estimated_arrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }])

      setSelectedTeacherId('')
      setPayoutAmountInput('')
      alert('Solicitação de Payout criada como PENDENTE com sucesso!')
      fetchAdminData()
    } catch (err: any) {
      alert('Erro ao criar payout: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
          <span className="text-sm font-semibold text-slate-550">Buscando métricas da plataforma...</span>
        </div>
      </div>
    )
  }

  // Filter disputed payments
  const disputedPayments = allPayments.filter(p => p.status === 'DISPUTED')
  const successfulPayments = allPayments.filter(p => p.status === 'SUCCEEDED')

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-rose-500" /> Painel de Pagamentos SaaS Flowike
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Controle de receitas globais do SaaS, split de rev-share, taxas, repasses e disputas.</p>
        </div>
        
        <button 
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl shadow-sm text-xs transition-all bg-white"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { id: 'teachers', label: 'Professores & Planos', icon: Users },
          { id: 'subscriptions', label: 'Assinaturas SaaS', icon: Award },
          { id: 'revenue_rules', label: 'Regras de Comissão', icon: Settings },
          { id: 'transactions', label: 'Transações & Splits', icon: ArrowLeftRight },
          { id: 'disputes', label: 'Disputas', icon: ShieldAlert },
          { id: 'payouts', label: 'Repasses & Bancos', icon: Coins },
          { id: 'credits', label: 'Créditos IA', icon: Brain }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 uppercase tracking-wider whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-rose-500 text-rose-500' 
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MRR Plataforma</span>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black text-rose-600">$ {kpis.mrr.toFixed(2)}</span>
                <TrendingUp className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ARR Plataforma</span>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black text-slate-800">$ {kpis.arr.toFixed(2)}</span>
                <TrendingUp className="w-5 h-5 text-slate-450" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Total Flowike</span>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black text-emerald-600">$ {kpis.totalPlatformRevenue.toFixed(2)}</span>
                <Coins className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Professores</span>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black text-indigo-600">$ {kpis.totalTeacherRevenue.toFixed(2)}</span>
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faturamento SaaS</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800">$ {kpis.saasRevenue.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comissões (Rev-share)</span>
              <span className="text-xl sm:text-2xl font-black text-slate-850">$ {kpis.revShareRevenue.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vendas de Créditos IA</span>
              <span className="text-xl sm:text-2xl font-black text-slate-850">$ {kpis.aiRevenue.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Disputas Ativas</span>
              <div className="flex justify-between items-center">
                <span className="text-xl sm:text-2xl font-black text-rose-500">{disputedPayments.length} abertas</span>
                <ShieldAlert className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </div>

          {/* Quick Platform Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connected Stripe Accounts list */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Coins className="w-4 h-4 text-rose-500" /> Contas Express Conectadas</h3>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto no-scrollbar">
                {connectedAccounts.length === 0 ? (
                  <div className="text-slate-450 font-semibold text-xs py-8 text-center">Nenhum professor com Stripe conectado.</div>
                ) : (
                  connectedAccounts.map(conn => (
                    <div key={conn.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="block font-bold text-slate-800">{conn.psychologists?.full_name}</span>
                        <span className="text-[10px] text-slate-400 block">{conn.psychologists?.email}</span>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        conn.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{conn.status === 'ACTIVE' ? 'Ativa' : 'Pendente'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Platform Subscriptions stats */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Award className="w-4 h-4 text-rose-500" /> Assinaturas Ativas por Plano</h3>
              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Starter Tiers ($19/mês)</span>
                  <span className="text-slate-800 font-extrabold">{subscriptions.filter(s => s.status === 'ACTIVE' && s.plan_type === 'STARTER').length} assinaturas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pro Tiers ($49/mês)</span>
                  <span className="text-slate-800 font-extrabold">{subscriptions.filter(s => s.status === 'ACTIVE' && s.plan_type === 'PRO').length} assinaturas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Academy Tiers ($99/mês)</span>
                  <span className="text-slate-800 font-extrabold">{subscriptions.filter(s => s.status === 'ACTIVE' && s.plan_type === 'ACADEMY').length} assinaturas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEACHERS (Professores e Planos) */}
      {activeTab === 'teachers' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Gerenciamento de Professores e Carteiras</h3>
          </div>

          {psychologists.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-semibold">Nenhum professor cadastrado.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full text-left font-medium whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Nome / Email</th>
                    <th className="px-6 py-4">Status Stripe</th>
                    <th className="px-6 py-4">Plano Atual</th>
                    <th className="px-6 py-4">Saldo Carteira IA</th>
                    <th className="px-6 py-4 text-center">Ações de Crédito IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {psychologists.map(teacher => {
                    const walletBal = Array.isArray(teacher.ai_wallets)
                      ? (teacher.ai_wallets[0]?.balance ?? 0)
                      : (teacher.ai_wallets?.balance ?? 0)
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="block font-bold text-slate-800">{teacher.full_name}</span>
                          <span className="text-[10px] text-slate-400 block">{teacher.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                            teacher.stripe_onboarding_completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>{teacher.stripe_onboarding_completed ? 'Conectado' : 'Pendente'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={(teacher.plan_type || 'STARTER').toUpperCase()}
                            onChange={(e) => handleUpdatePlan(teacher.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold outline-none"
                          >
                            <option value="STARTER">STARTER ($19/mo)</option>
                            <option value="PRO">PRO ($49/mo)</option>
                            <option value="ACADEMY">ACADEMY ($99/mo)</option>
                            {revenueRules.filter(r => !['STARTER', 'PRO', 'ACADEMY'].includes(r.plan_type)).map(customRule => (
                              <option key={customRule.id} value={customRule.plan_type}>{customRule.plan_type} ({customRule.percentage}%)</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-850">
                          {walletBal} créditos
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              placeholder="Add Qtd"
                              value={refillCreditsInput[teacher.id] || ''}
                              onChange={(e) => setRefillCreditsInput(prev => ({ ...prev, [teacher.id]: e.target.value }))}
                              className="border border-slate-200 rounded-lg px-2 py-1 w-20 text-center font-bold text-slate-800 focus:outline-none"
                            />
                            <button
                              onClick={() => handleRefillCredits(teacher.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-0.5 shadow-sm transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" /> Conceder
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assinaturas SaaS Ativas</h3>
          </div>
          
          {subscriptions.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-semibold">Nenhuma assinatura ativa encontrada.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full text-left font-medium whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Professor</th>
                    <th className="px-6 py-4">Plano</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="block font-bold text-slate-800">{sub.psychologists?.full_name}</span>
                        <span className="text-[10px] text-slate-400 block">{sub.psychologists?.email}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{sub.plan_type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'
                        }`}>{sub.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-550">{new Date(sub.current_period_end).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: REVENUE SHARE RULES */}
      {activeTab === 'revenue_rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Regras de Comissão e Créditos Incluídos</h3>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full text-left font-medium whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Plano / Categoria</th>
                    <th className="px-6 py-4">Comissão da Plataforma (Revenue Share)</th>
                    <th className="px-6 py-4">Créditos de IA Iniciais</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {revenueRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{rule.plan_type}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-700">
                        {editingRuleId === rule.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingPercentage}
                              onChange={(e) => setEditingPercentage(e.target.value)}
                              className="border border-slate-300 rounded px-2 py-0.5 w-16 text-center focus:outline-none"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <span>{rule.percentage}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-700">
                        {editingRuleId === rule.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingCredits}
                              onChange={(e) => setEditingCredits(e.target.value)}
                              className="border border-slate-300 rounded px-2 py-0.5 w-24 text-center focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span>{rule.credits_included || 0} créditos</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          {editingRuleId === rule.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateRevenueRule(rule.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1 rounded-lg transition-all"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingRuleId(null)}
                                className="bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold p-1 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRuleId(rule.id)
                                setEditingPercentage(rule.percentage.toString())
                                setEditingCredits((rule.credits_included || 0).toString())
                              }}
                              className="border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold py-1 px-3 rounded-lg text-[10px] transition-all bg-white shadow-sm"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Plan form */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm self-start space-y-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-rose-500" /> Criar Novo Plano / Comissão
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Crie categorias personalizadas para classificar comissões de splits de psicólogos/professores e sua franquia inicial de créditos IA.
            </p>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 pt-2 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">Identificador do Plano (Ex: VIP)</label>
                <input
                  type="text"
                  placeholder="VIP_PLAN"
                  value={newPlanType}
                  onChange={(e) => setNewPlanType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">Comissão da Plataforma (%)</label>
                <input
                  type="number"
                  placeholder="8"
                  value={newPlanPercentage}
                  onChange={(e) => setNewPlanPercentage(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">Créditos de IA Inclusos</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={newPlanCredits}
                  onChange={(e) => setNewPlanCredits(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none font-bold text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all"
              >
                Criar Plano
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: TRANSACTIONS & SPLITS */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico de Transações e Divisão de Comissões</h3>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-semibold">Nenhuma transação registrada na plataforma.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full text-left font-medium whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Payer / Aluno</th>
                    <th className="px-6 py-4">Payee / Professor</th>
                    <th className="px-6 py-4">Bruto (Gross)</th>
                    <th className="px-6 py-4">Comissão Flowike</th>
                    <th className="px-6 py-4">Taxa Stripe</th>
                    <th className="px-6 py-4">Líquido Professor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{t.payments?.payer?.full_name || 'Estudante'}</td>
                      <td className="px-6 py-4 text-slate-600">{t.payments?.payee?.full_name || 'Professor'}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">${Number(t.gross_amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-rose-500 font-bold">${Number(t.platform_fee).toFixed(2)}</td>
                      <td className="px-6 py-4 text-amber-500">${Number(t.stripe_fee).toFixed(2)}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">${Number(t.net_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: DISPUTES */}
      {activeTab === 'disputes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active disputes list */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-4">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Disputas de Chargeback Ativas</h3>
            </div>

            {disputedPayments.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-xs">Não existem disputas ativas de chargeback pendentes.</div>
            ) : (
              <div className="divide-y divide-slate-150">
                {disputedPayments.map(p => (
                  <div key={p.id} className="p-5 flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-bold text-slate-850">Disputa sob Cobrança: {p.stripe_payment_intent_id || p.id}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">Aluno: {p.payer?.full_name} | Destino: {p.payee?.full_name}</span>
                      <span className="text-rose-500 font-bold text-[10px] block mt-1">Status: EM REVISÃO (Disputado)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-slate-800 text-sm">${Number(p.amount).toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResolveDispute(p.id, 'WON')}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-0.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Ganhar
                        </button>
                        <button
                          onClick={() => handleResolveDispute(p.id, 'LOST')}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-0.5"
                        >
                          <X className="w-3.5 h-3.5" /> Reembolsar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulate dispute widget */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm self-start space-y-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500" /> Simular Dispute de Cobrança
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Marque qualquer transação concluída como DISPUTADA para simular um fluxo de chargeback de gateway.
            </p>

            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto no-scrollbar pt-2">
              {successfulPayments.length === 0 ? (
                <div className="text-slate-400 font-semibold text-xs py-4 text-center">Nenhum pagamento bem sucedido para simular.</div>
              ) : (
                successfulPayments.map(p => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-bold text-slate-800">{p.payer?.full_name || 'Estudante'}</span>
                      <span className="text-[10px] text-slate-450 font-bold block">${Number(p.amount).toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleSimulateDispute(p.id)}
                      className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-1 px-2.5 rounded-lg text-[9px] transition-all bg-white"
                    >
                      Disputar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Payout History logs */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Histórico de repasses efetuados (Payouts)</h3>
            </div>

            {payouts.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-xs">Nenhum repasse registrado.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="min-w-full text-left font-medium whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Professor</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Liberação Estimada</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payouts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{p.psychologists?.full_name}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">${Number(p.amount).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>{p.status === 'PAID' ? 'Pago' : 'Pendente'}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {p.estimated_arrival ? new Date(p.estimated_arrival).toLocaleDateString('pt-BR') : 'Imediato'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => handleConfirmPayout(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-1 px-3 rounded-lg text-[9px] shadow-sm transition-all"
                            >
                              Marcar Pago
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trigger Repasse Form */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm self-start space-y-4">
            <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-rose-500" /> Solicitar Repasse Manual (Payout)
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Crie uma ordem de payout pendente para transferência posterior de saldo ao professor.
            </p>

            <form onSubmit={handleCreatePayout} className="space-y-3.5 pt-2 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">Professor Destinatário</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl p-2.5 focus:outline-none font-bold text-slate-800"
                >
                  <option value="">Selecione um Professor...</option>
                  {psychologists.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">Valor do repasse (USD)</label>
                <input
                  type="number"
                  placeholder="100.00"
                  value={payoutAmountInput}
                  onChange={(e) => setPayoutAmountInput(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none font-bold text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all"
              >
                Gerar Ordem
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: IA CREDITS (Vendas e Logs de Uso de IA) */}
      {activeTab === 'credits' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header & toggle */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Histórico de Uso e Venda de Créditos IA</h3>
            </div>
            
            <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 text-[10px] font-bold uppercase tracking-wider">
              <button
                onClick={() => setCreditsLogTab('sales')}
                className={`py-1.5 px-3.5 transition-colors ${
                  creditsLogTab === 'sales' ? 'bg-slate-950 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Recargas de Créditos
              </button>
              <button
                onClick={() => setCreditsLogTab('usage')}
                className={`py-1.5 px-3.5 transition-colors ${
                  creditsLogTab === 'usage' ? 'bg-slate-950 text-white font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Logs de Consumo
              </button>
            </div>
          </div>

          {/* Render Sales tab */}
          {creditsLogTab === 'sales' && (
            creditSales.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-xs">Nenhuma recarga de créditos efetuada.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="min-w-full text-left font-medium whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Professor</th>
                      <th className="px-6 py-4">Valor Pago</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {creditSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{sale.payer?.full_name || 'Professor'}</td>
                        <td className="px-6 py-4 font-bold text-slate-850">${Number(sale.amount).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Concluído</span>
                        </td>
                        <td className="px-6 py-4 text-slate-450">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Render Usage audit logs tab */}
          {creditsLogTab === 'usage' && (
            aiTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-xs">Nenhum log de consumo de IA registrado.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="min-w-full text-left font-medium whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Professor</th>
                      <th className="px-6 py-4">Recurso Utilizado</th>
                      <th className="px-6 py-4 text-center">Créditos Consumidos</th>
                      <th className="px-6 py-4 text-slate-450">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {aiTransactions.map(tx => {
                      const isPurchase = tx.credits_used < 0
                      const absCredits = Math.abs(tx.credits_used)
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {tx.psychologists?.full_name || 'Professor'}
                            <span className="text-[10px] text-slate-400 block font-normal">{tx.psychologists?.email}</span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-650">
                            {tx.action === 'PURCHASE' ? 'Recarga/Concessão de Créditos' :
                             tx.action === 'HOMEWORK' ? 'Geração de Lição de Casa' :
                             tx.action === 'SESSION' ? 'Processamento de Áudio/Transcrição' :
                             tx.action === 'INSIGHTS' ? 'Análise e Insights da Sessão' :
                             tx.action === 'SCENARIO' ? 'Simulador de Cenários' : tx.action}
                          </td>
                          <td className={`px-6 py-4 text-center font-extrabold ${isPurchase ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {isPurchase ? `+${absCredits}` : `-${absCredits}`}
                          </td>
                          <td className="px-6 py-4 text-slate-450">
                            {new Date(tx.created_at).toLocaleDateString('pt-BR')} às {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

    </div>
  )
}
