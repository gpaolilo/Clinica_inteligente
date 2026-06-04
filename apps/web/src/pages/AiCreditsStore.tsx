import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { 
  Brain, Info, Loader2, ArrowLeftRight, ChevronRight, ShoppingBag
} from 'lucide-react'

export default function AiCreditsStore() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)
  
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

  const fetchWalletDetails = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      // 1. Fetch AI wallet balance
      const { data: wallet } = await supabase
        .from('ai_wallets')
        .select('balance')
        .eq('teacher_id', session.user.id)
        .maybeSingle()

      if (wallet) {
        setBalance(wallet.balance)
      }

      // 2. Fetch AI usage transactions
      const { data: txs } = await supabase
        .from('ai_transactions')
        .select('*')
        .eq('teacher_id', session.user.id)
        .order('created_at', { ascending: false })
      
      setTransactions(txs || [])

      // 3. Fetch credit packages
      const { data: packsData } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true })
      if (packsData) {
        setCreditPackages(packsData)
      }
    } catch (err) {
      console.error('Error fetching AI Wallet details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletDetails()
  }, [session])

  const handleBuyCredits = async (pack: string) => {
    setPurchasing(pack)
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
          fetchWalletDetails()
        } else if (data.url) {
          window.location.href = data.url
        }
      }
    } catch (err: any) {
      alert('Erro ao processar compra de créditos: ' + err.message)
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-tenant-primary" />
          <span className="text-sm font-semibold text-slate-550">Buscando saldo da carteira IA...</span>
        </div>
      </div>
    )
  }

  const consumptionRules = [
    { name: 'Geração de Lição de Casa (Homework)', cost: '20 créditos' },
    { name: 'Análise de Sessão / Aula', cost: '40 créditos' },
    { name: 'Extração de Vocabulário', cost: '10 créditos' },
    { name: 'Relatório de Progresso', cost: '25 créditos' },
    { name: 'Prática de Cenários (Simulação)', cost: '15 créditos' },
    { name: 'Transcrição de Áudio', cost: '2 créditos / minuto' }
  ]

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 text-slate-800 select-none font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-tenant-primary animate-pulse" /> Carteira de Créditos IA
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Compre e gerencie os créditos utilizados para alimentar os recursos de Inteligência Artificial.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Store & Wallet Info */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Wallet Balance widget */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-tenant-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Saldo Disponível</span>
              <span className="text-4xl font-black text-slate-850 block mt-1">{balance} <span className="text-tenant-primary text-xl font-bold">créditos</span></span>
            </div>
            
            <div className="bg-tenant-primary/10 text-tenant-primary p-4 rounded-2xl">
              <Brain className="w-8 h-8" />
            </div>
          </div>

          {/* Credit Pack purchase store */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <ShoppingBag className="w-4.5 h-4.5 text-tenant-primary" /> Pacotes de Créditos Disponíveis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(creditPackages.length > 0 ? creditPackages : [
                { id: '5000', name: 'Starter Pack', credits: 5000, price: 19.00 },
                { id: '20000', name: 'Growth Pack', credits: 20000, price: 69.00 },
                { id: '50000', name: 'Academy Pack', credits: 50000, price: 149.00 }
              ]).map(pack => {
                const creditsStr = String(pack.credits)
                const pricePerCredit = Number(pack.price) / Number(pack.credits)
                
                return (
                  <div key={pack.id || creditsStr} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">{pack.credits} Créditos</h4>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5 animate-fade-in">
                        {pack.name || 'Pacote IA'} ({formatPrice(pricePerCredit, selectedCurrency)} / crédito)
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-850">{formatPrice(Number(pack.price), selectedCurrency)}</span>
                    </div>

                    <button
                      onClick={() => handleBuyCredits(creditsStr)}
                      disabled={purchasing !== null}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 hover:-translate-y-0.5"
                    >
                      {purchasing === creditsStr ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Adquirir Pacote</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Transactions list */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-slate-450" />
              <h3 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Histórico de Transações IA</h3>
            </div>

            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                Nenhuma transação de IA registrada nesta conta ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto no-scrollbar">
                {transactions.map(tx => {
                  const isPurchase = tx.credits_used < 0
                  const absCredits = Math.abs(tx.credits_used)
                  
                  return (
                    <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="block text-xs font-bold text-slate-800">
                          {tx.action === 'PURCHASE' ? 'Recarga de Créditos' :
                           tx.action === 'HOMEWORK' ? 'Geração de Lição de Casa' :
                           tx.action === 'SESSION' ? 'Processamento de Áudio' :
                           tx.action === 'INSIGHTS' ? 'Geração de Insights IA' : tx.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className={`text-xs font-black ${isPurchase ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {isPurchase ? `+${absCredits}` : `-${absCredits}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Consumption Rates Right Panel */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 self-start">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-tenant-primary" /> Regras de Consumo
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Consulte a tabela abaixo para entender a conversão de créditos em funcionalidades de IA:
          </p>

          <div className="divide-y divide-slate-100 pt-2">
            {consumptionRules.map((rule, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                <span className="text-slate-600 font-medium">{rule.name}</span>
                <span className="font-extrabold text-slate-800">{rule.cost}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
