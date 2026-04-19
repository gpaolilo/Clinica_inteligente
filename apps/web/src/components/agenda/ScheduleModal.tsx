import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function ScheduleModal({ onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [price, setPrice] = useState('150.00')
  const [patients, setPatients] = useState<any[]>([])

  useEffect(() => {
    // Carregar a lista de pacientes ativos do profissional
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
    
    const psychologist_id = session.user.id;
    // Formatando Data do tipo 'YYYY-MM-DDTHH:MM' 
    const scheduled_date = new Date(`${date}T${time}`).toISOString()
    
    await supabase.from('sessions').insert([{ 
      psychologist_id, 
      patient_id: patientId, 
      scheduled_date, 
      price: parseFloat(price),
      status: 'SCHEDULED'
    }])
    
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Agendar Consulta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
              <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Sessão (R$)</label>
            <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={!patientId || !date || !time} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors">Confirmar Agendamento</button>
          </div>
        </form>
      </div>
    </div>
  )
}
