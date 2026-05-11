import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function RequestSessionModal({ onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return
    setLoading(true)

    // Precisamos do ID do paciente e do psicólogo
    const { data: patient } = await supabase
      .from('patients')
      .select('id, psychologist_id')
      .eq('user_id', session.user.id)
      .single()

    if (!patient) {
      alert('Erro: Sua conta não está vinculada a nenhuma clínica.')
      setLoading(false)
      return
    }

    const scheduledDate = new Date(`${date}T${time}:00`).toISOString()

    const { error } = await supabase
      .from('sessions')
      .insert([{
        patient_id: patient.id,
        psychologist_id: patient.psychologist_id,
        scheduled_date: scheduledDate,
        status: 'PENDING', // Fica pendente para o profissional aprovar
        price: 0 // Profissional define depois
      }])

    if (error) {
      alert('Erro ao solicitar agendamento: ' + error.message)
    } else {
      alert('Solicitação enviada! Aguarde a confirmação do seu profissional.')
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Solicitar Agendamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-slate-500 font-medium">Escolha a data e o horário desejado. Seu profissional receberá a solicitação e confirmará o agendamento.</p>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
            <input 
              type="date" 
              required
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-slate-700" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
            <input 
              type="time" 
              required
              value={time} 
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-slate-700" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm mt-4"
          >
            {loading ? 'Enviando...' : 'Confirmar Solicitação'}
          </button>
        </form>
      </div>
    </div>
  )
}
