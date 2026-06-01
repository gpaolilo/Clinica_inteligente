import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  AlertTriangle, ShieldAlert, Check, AlertCircle, Loader2
} from 'lucide-react'

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false })

      setAlerts(data || [])
    } catch (err) {
      console.error('Error fetching admin alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const handleResolveAlert = async (id: string) => {
    setResolvingId(id)
    try {
      const { error } = await supabase
        .from('admin_alerts')
        .update({ status: 'resolved' })
        .eq('id', id)

      if (error) throw error
      alert('Alerta resolvido com sucesso!')
      loadAlerts()
    } catch (err: any) {
      alert('Erro ao resolver alerta: ' + err.message)
    } finally {
      setResolvingId(null)
    }
  }

  // Fallback seed simulation if empty
  const mockAlerts = [
    {
      id: 'mock_1',
      type: 'high_consumption',
      title: 'Uso Crítico de Créditos IA (90%)',
      description: 'O professor Gabriel Paolilo cruzou o limiar de 90% de consumo mensal de créditos. Saldo atual: 720 créditos.',
      status: 'active',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_2',
      type: 'failed_payment',
      title: 'Falha no Cobrança do Assento',
      description: 'Matrícula de aluno Alex Johnson falhou no checkout da Stripe Connect do professor Alex Johnson. Motivo: Cartão recusado.',
      status: 'active',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_3',
      type: 'negative_margin',
      title: 'Margem Negativa Detectada',
      description: 'Inconsistência de custo operacional de inferência vs saldo de créditos no plano STARTER do professor Elena Rostova.',
      status: 'resolved',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const displayAlerts = alerts.length > 0 ? alerts : mockAlerts

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'cost_spike':
      case 'negative_margin':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />
      case 'failed_payment':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-indigo-600" />
    }
  };

  const getAlertBg = (type: string, status: string) => {
    if (status === 'resolved') return 'bg-slate-50 border-slate-100 opacity-60'
    switch (type) {
      case 'cost_spike':
      case 'negative_margin':
        return 'bg-rose-50 border-rose-200 shadow-sm'
      case 'failed_payment':
        return 'bg-amber-50 border-amber-250 shadow-sm'
      default:
        return 'bg-indigo-50 border-indigo-200 shadow-sm'
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col justify-center items-center h-96 text-slate-550 font-sans gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-650" />
        <span className="text-sm font-semibold">Carregando alertas...</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-850 tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-rose-500 animate-bounce" /> Alertas do Sistema
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Monitore discrepâncias críticas de faturamento, consumo de recursos por IA e status de payouts.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider px-1">Log de Alertas</h3>
        
        {displayAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-450 text-xs font-bold rounded-3xl">
            Tudo limpo! Nenhum alerta registrado no sistema.
          </div>
        ) : (
          <div className="space-y-4">
            {displayAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-5 border rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${getAlertBg(alert.type, alert.status)}`}
              >
                <div className="flex gap-4">
                  <div className="p-2.5 rounded-2xl bg-white shadow-sm self-start">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-slate-800">{alert.title}</h4>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${alert.status === 'resolved' ? 'bg-slate-200 text-slate-600' : 'bg-rose-500 text-white animate-pulse'}`}>
                        {alert.status === 'resolved' ? 'Resolvido' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed max-w-2xl">{alert.description}</p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-2">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-extrabold px-4.5 py-2.5 rounded-2xl text-xs transition-colors shrink-0 flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {resolvingId === alert.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Marcar Resolvido</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
