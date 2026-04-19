import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function PackageModal({ onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [patientId, setPatientId] = useState('')
  const [name, setName] = useState('Pacote Mensal - 4 Sessões')
  const [price, setPrice] = useState('600.00')
  const [sessionsCount, setSessionsCount] = useState('4')
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSelectablePatients = async () => {
      const { data } = await supabase.from('patients').select('id, name').eq('status', 'ACTIVE').order('name')
      setPatients(data || [])
      if (data && data.length > 0) setPatientId(data[0].id)
    }
    fetchSelectablePatients()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !patientId) return;
    setLoading(true)

    // Acionando a Stored Procedure (RPC) no PostgreSQL
    const { error } = await supabase.rpc('create_monthly_package', {
      p_psychologist_id: session.user.id,
      p_patient_id: patientId,
      p_name: name,
      p_total_price: parseFloat(price),
      p_number_of_sessions: parseInt(sessionsCount)
    })

    setLoading(false)

    if (error) {
      alert("Erro ao criar pacote: " + error.message)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Vender Pacote de Sessões</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-sky-50 text-sky-700 text-sm p-3 rounded-lg border border-sky-100">
             Vender um pacote gera automaticamente X faturas fracionadas na sua tela financeira para cobrança isolada.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
            <select 
              required 
              value={patientId} 
              onChange={e => setPatientId(e.target.value)} 
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {patients.length === 0 && <option value="">Nenhum paciente ativo...</option>}
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Pacote (Contrato)</label>
             <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Sessões</label>
              <input required type="number" min="1" value={sessionsCount} onChange={e => setSessionsCount(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
              <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={!patientId || loading} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors">
              {loading ? 'Gerando...' : 'Assinar Pacote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
