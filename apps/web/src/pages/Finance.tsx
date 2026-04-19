import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Finance() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvoices = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('invoices')
      .select('*, patient:patients(name)')
      .order('due_date', { ascending: false })
    
    setInvoices(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const markAsPaid = async (id: string) => {
    if(!confirm("Atestar pagamento manual desta fatura?")) return;
    await supabase.from('invoices').update({ status: 'PAID' }).eq('id', id)
    fetchInvoices()
  }

  const generatePixLink = async (invoiceId: string) => {
    alert(`Enviando via Edge Function. Link PIX seria gerado via Stripe/MercadoPago para o Invoice ${invoiceId}`);
    // await supabase.functions.invoke('generate-pix', { body: { invoiceId }})
  }

  const totalEmAberto = invoices.filter(i => i.status === 'OPEN').reduce((acc, curr) => acc + curr.amount, 0)
  const totalRecebido = invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Painel Financeiro</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle sua receita, inadimplências e gere links PIX para pacientes.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors">
          Vender Pacote de Sessões
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Receita Confirmada</h3>
          <p className="text-3xl font-bold text-emerald-600">R$ {totalRecebido.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Valores a Receber (Aberto/Atraso)</h3>
          <p className="text-3xl font-bold text-amber-600">R$ {totalEmAberto.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Buscando movimentações...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
             Nenhuma fatura lançada ainda. Crie um pacote ou encerre uma sessão para visualizar.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 font-medium text-slate-500">
              <tr>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-right">Manejo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {Array.isArray(inv.patient) ? inv.patient[0]?.name : inv.patient?.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    {inv.status === 'PAID' && <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-semibold">Garantido / Pago</span>}
                    {inv.status === 'OPEN' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold">Aberto (Aguardando)</span>}
                    {inv.status === 'OVERDUE' && <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-xs font-semibold">Em Atraso</span>}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">R$ {inv.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {inv.status !== 'PAID' && (
                      <>
                        <button onClick={() => generatePixLink(inv.id)} className="text-secondary-600 font-medium text-sm text-sky-600 hover:underline">
                          Compartilhar PIX
                        </button>
                        <button onClick={() => markAsPaid(inv.id)} className="text-primary-600 font-medium text-sm hover:underline">
                          Constar Pagamento
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
