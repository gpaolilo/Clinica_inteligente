import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { 
  CreditCard, ShieldCheck, Clock, FileText, Loader2, CheckCircle, XCircle
} from 'lucide-react'

export default function ClientBilling() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [classBalance, setClassBalance] = useState(0)

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

      // 3. Fetch patient class balance
      const { data: patient } = await supabase
        .from('patients')
        .select('class_balance')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (patient) {
        setClassBalance(patient.class_balance || 0)
      }

    } catch (err) {
      console.error('Error fetching student billing details:', err)
    } finally {
      setLoading(false)
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

    </div>
  )
}
