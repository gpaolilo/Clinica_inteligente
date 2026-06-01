import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  RefreshCw, Loader2, BarChart3
} from 'lucide-react'


export default function AdminPayments() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'transactions' | 'payouts' | 'credits'>('overview')

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

    } catch (err) {
      console.error('Error fetching admin finance metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminData()
  }, [session])

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

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-rose-500" /> Painel de Pagamentos SaaS Flowike
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Controle de receitas globais do SaaS, split de rev-share, taxas e contas conectadas.</p>
        </div>
        
        <button 
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-2.5 px-4 rounded-xl shadow-sm text-xs transition-all bg-white"
        >
          <RefreshCw className="w-4 h-4" /> Sincronizar
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-6">
        {['overview', 'subscriptions', 'transactions', 'payouts', 'credits'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-bold border-b-2 transition-all uppercase tracking-wider text-[10px] ${
              activeTab === tab 
                ? 'border-rose-500 text-rose-500' 
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            {tab === 'overview' ? 'Visão Geral' :
             tab === 'subscriptions' ? 'Assinaturas SaaS' :
             tab === 'transactions' ? 'Transações & Splits' :
             tab === 'payouts' ? 'Payouts & Bancos' : 'Vendas de IA'}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MRR Plataforma</span>
              <span className="text-xl sm:text-2xl font-black text-rose-600">$ {kpis.mrr.toFixed(2)}</span>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ARR Plataforma</span>
              <span className="text-xl sm:text-2xl font-black text-slate-800">$ {kpis.arr.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Total Flowike</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600">$ {kpis.totalPlatformRevenue.toFixed(2)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Receita Professores</span>
              <span className="text-xl sm:text-2xl font-black text-indigo-600">$ {kpis.totalTeacherRevenue.toFixed(2)}</span>
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

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Taxa de Churn</span>
              <span className="text-xl sm:text-2xl font-black text-rose-500">{kpis.churnRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Quick Platform Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connected Stripe Accounts list */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Contas Express Conectadas</h3>
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
              <h3 className="text-sm font-bold text-slate-800">Assinaturas Ativas por Plano</h3>
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
                      <td className="px-6 py-4 font-bold text-slate-800">${t.gross_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-rose-500 font-bold">${t.platform_fee.toFixed(2)}</td>
                      <td className="px-6 py-4 text-amber-500">${t.stripe_fee.toFixed(2)}</td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">${t.net_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico de Payouts Transferidos</h3>
          </div>

          {payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-semibold">Nenhum payout registrado.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="min-w-full text-left font-medium whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-450 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Professor</th>
                    <th className="px-6 py-4">Valor Transferido</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Chegada Estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payouts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{p.psychologists?.full_name}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">${p.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                          p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'
                        }`}>{p.status === 'PAID' ? 'Concluído' : 'Processando'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-450">
                        {p.estimated_arrival ? new Date(p.estimated_arrival).toLocaleDateString('pt-BR') : 'Imediato'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: AI CREDIT SALES */}
      {activeTab === 'credits' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recargas de Créditos de IA</h3>
          </div>

          {creditSales.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-semibold">Nenhuma recarga de créditos efetuada.</div>
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
                      <td className="px-6 py-4 font-bold text-slate-850">${sale.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Concluído</span>
                      </td>
                      <td className="px-6 py-4 text-slate-450">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
