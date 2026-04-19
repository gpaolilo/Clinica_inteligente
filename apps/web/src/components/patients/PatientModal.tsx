import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function PatientModal({ patient, onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [name, setName] = useState(patient?.name || '')
  const [email, setEmail] = useState(patient?.email || '')
  const [phone, setPhone] = useState(patient?.phone || '')
  const [status, setStatus] = useState(patient?.status || 'ACTIVE')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return;
    const psychologist_id = session.user.id;
    
    // RLS makes sure we can only insert if it matches our psychologist_id
    if (patient) {
      await supabase.from('patients').update({ name, email, phone, status }).eq('id', patient.id)
    } else {
      await supabase.from('patients').insert([{ name, email, phone, status, psychologist_id }])
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl shadow-slate-900/10 overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{patient ? 'Detalhes do Paciente' : 'Cadastrar Paciente'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maria da Silva" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@email.com" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
              <input required type="text" placeholder="+55 11 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status do Tratamento</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="ACTIVE">Em acompanhamento (Ativo)</option>
              <option value="INACTIVE">Alta / Fim do tratamento</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  )
}
