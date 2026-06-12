import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  CreditCard, ShieldCheck, Clock, FileText, Loader2, CheckCircle, XCircle, ArrowRight
} from 'lucide-react'

export default function ClientBilling() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [classBalance, setClassBalance] = useState(0)
  const [aiCreditsBalance, setAiCreditsBalance] = useState(0)

  // Products and checkout states
  const [products, setProducts] = useState<any[]>([])
  const [teacher, setTeacher] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  const fetchBillingInfo = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      // 1. Fetch payments made by this student
      const { data: payList } = await supabase
        .from('payments')
        .select('*')
        .eq('payer_id', session.user.id)
        .order('created_at', { ascending: false })
      
      setPayments(payList || [])

      // 2. Fetch student subscriptions
      const { data: subList } = await supabase
        .from('student_subscriptions')
        .select('*')
        .eq('student_id', session.user.id)
      
      setSubscriptions(subList || [])

      // 3. Fetch patient class balance and parent teacher details
      const { data: patient } = await supabase
        .from('patients')
        .select('*, psychologists(id, full_name, email, stripe_account_id, stripe_charges_enabled)')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (patient) {
        setClassBalance(patient.class_balance || 0)
        setAiCreditsBalance(patient.ai_credits_balance || 0)
        setTeacher(patient.psychologists)

        if (patient.psychologists?.stripe_charges_enabled) {
          // 4. Fetch teacher's active products
          const { data: prods } = await supabase
            .from('teacher_products')
            .select('*')
            .eq('teacher_id', patient.psychologists.id)
            .eq('active', true)
          setProducts(prods || [])
        }
      }

    } catch (err) {
      console.error('Error fetching student billing details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (productId: string) => {
    if (paymentMethod === 'pix' && !cpfCnpj) {
      alert('CPF ou CNPJ é obrigatório para pagamentos via PIX.')
      return
    }
    setCheckingOut(productId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          productId,
          paymentMethod,
          cpfCnpj
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.isMock) {
          alert('Simulando checkout do aluno no sandbox...')
          // Simulate complete payment webhook locally
          await fetch('/api/payments/webhook', {
            method: 'POST',
            body: JSON.stringify({
              type: 'checkout.session.completed',
              data: {
                object: {
                  id: data.session_id,
                  payment_intent: 'pi_mock_' + Math.random().toString(36).substring(2, 8),
                  metadata: {
                    type: 'PRODUCT',
                    payer_id: session?.user?.id,
                    payee_id: teacher.id,
                    product_id: productId,
                    classes_included: String(products.find(p => p.id === productId)?.classes_included || '1'),
                    price_amount: String(products.find(p => p.id === productId)?.price || '0')
                  }
                }
              }
            })
          })
          alert('Pagamento simulado com sucesso! Saldo atualizado.')
          fetchBillingInfo()
        } else if (data.url) {
          window.location.href = data.url
        }
      } else {
        const err = await res.json()
        alert('Erro ao criar sessão de checkout: ' + (err.error || 'Erro desconhecido'))
      }
    } catch (err: any) {
      alert('Erro de checkout: ' + err.message)
    } finally {
      setCheckingOut(null)
    }
  }

  useEffect(() => {
    fetchBillingInfo()
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-tenant-primary" />
          <span className="text-sm font-semibold text-slate-550">Buscando faturamento...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 text-slate-800 select-none font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-tenant-primary" /> Faturamento e Assinaturas
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Gerencie seus métodos de pagamento, planos ativos e histórico de recibos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Credit Balance & Active Subscriptions */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Class Credits Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tenant-primary/5 rounded-full blur-2xl pointer-events-none" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo de Aulas</span>
            <span className="text-3xl font-black text-slate-850 block mt-1">{classBalance} <span className="text-tenant-primary text-sm font-bold">aulas</span></span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">Consumido automaticamente ao realizar agendamentos.</p>
          </div>

          {/* AI Credits Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-tenant-primary/5 rounded-full blur-2xl pointer-events-none" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo de Créditos de IA</span>
            <span className="text-3xl font-black text-slate-850 block mt-1">{aiCreditsBalance} <span className="text-tenant-primary text-sm font-bold">créditos</span></span>
            <p className="text-[10px] text-slate-400 mt-2 font-semibold">Consumido ao realizar práticas de conversação e homework com IA.</p>
          </div>

          {/* Active Subscriptions widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Planos Ativos</h3>
            
            {subscriptions.length === 0 ? (
              <div className="text-slate-450 text-xs font-semibold py-4 text-center">
                Você não possui assinaturas recorrentes ativas.
              </div>
            ) : (
              subscriptions.map(sub => (
                <div key={sub.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Mensalidade</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">Ativo</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold space-y-1">
                    <p className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Renova em: {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Safe Checkout Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Pagamento 100% Seguro</h4>
              <p className="text-[10px] text-slate-450 font-medium leading-relaxed mt-0.5">
                Suas transações são processadas com criptografia de ponta a ponta pelo gateway Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Invoices & Receipts History */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-slate-450" />
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Histórico de Compras & Recibos</h3>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-450 font-semibold text-sm">
                Nenhum pagamento efetuado ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map(pay => (
                  <div key={pay.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="block text-xs font-bold text-slate-850">
                        {pay.type === 'PRODUCT' ? 'Adquiriu Plano/Créditos de Aulas' : 'Assinatura Plataforma'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                        {new Date(pay.created_at).toLocaleDateString('pt-BR')} às {new Date(pay.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="block font-black text-slate-800 text-sm sm:text-base">${pay.amount.toFixed(2)}</span>
                        <div className="flex items-center gap-1 justify-end">
                          {pay.status === 'SUCCEEDED' ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[9px] font-extrabold text-emerald-600">Concluído</span>
                            </>
                          ) : pay.status === 'PENDING' ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[9px] font-extrabold text-amber-500">Pendente</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-[9px] font-extrabold text-rose-500">Falhou</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Plan and Package Catalog */}
      {products.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">Planos e Pacotes de Aulas Disponíveis</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Adquira pacotes de aulas individuais ou assine um plano mensal do seu professor {teacher?.full_name}.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</span>
              <div className="flex gap-2.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                    paymentMethod === 'card' 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-605 hover:bg-slate-50'
                  }`}
                >
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                    paymentMethod === 'pix' 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-605 hover:bg-slate-50'
                  }`}
                >
                  PIX (Brasil)
                </button>
              </div>
            </div>

            {paymentMethod === 'pix' && (
              <div className="w-full sm:w-60">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CPF ou CNPJ (PIX)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-slate-800 transition-all"
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map(prod => (
              <div key={prod.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 hover:border-tenant-primary hover:shadow-md transition-all">
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                      prod.type === 'MONTHLY_SUBSCRIPTION' ? 'bg-indigo-50 text-indigo-700' :
                      prod.type === 'PACKAGE' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-650'
                    }`}>
                      {prod.type === 'MONTHLY_SUBSCRIPTION' ? 'Mensal Recorrente' :
                       prod.type === 'PACKAGE' ? 'Pacote' : 'Aula Individual'}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base mt-2">{prod.name}</h4>
                  <p className="text-xs text-slate-450 font-medium mt-1 leading-relaxed">{prod.description || `${prod.classes_included} aulas inclusas.`}</p>
                  {prod.ai_credits_included > 0 && (
                    <span className="inline-block bg-tenant-primary/10 text-tenant-primary font-bold px-2 py-0.5 rounded text-[10px] mt-2">
                      + {prod.ai_credits_included} Créditos de IA inclusos
                    </span>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-850">${prod.price}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{prod.currency}</span>
                  </div>

                  <button
                    onClick={() => handleCheckout(prod.id)}
                    disabled={checkingOut !== null}
                    className="w-full bg-tenant-primary hover:bg-tenant-primary-hover text-white font-extrabold py-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-tenant-primary/10 hover:-translate-y-0.5 disabled:bg-slate-400"
                  >
                    {checkingOut === prod.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Adquirir</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
