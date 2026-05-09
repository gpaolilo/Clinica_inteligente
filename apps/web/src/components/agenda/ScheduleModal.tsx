import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useGoogleStore } from '../../stores/googleStore'
import { useGoogleLogin } from '@react-oauth/google'

export default function ScheduleModal({ onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const { accessToken, setAccessToken } = useGoogleStore()
  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [price, setPrice] = useState('150.00')
  const [patients, setPatients] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTokenExpired, setIsTokenExpired] = useState(false)

  useEffect(() => {
    // Carregar a lista de pacientes ativos do profissional
    const fetchSelectablePatients = async () => {
      const { data } = await supabase.from('patients').select('id, name').eq('status', 'ACTIVE').order('name')
      setPatients(data || [])
      if (data && data.length > 0) setPatientId(data[0].id)
    }
    fetchSelectablePatients()
  }, [])

  const createEventAndSave = async (token: string | null) => {
    try {
      if (!session || !patientId) return;
      const psychologist_id = session.user.id;
      
      const startDateTime = new Date(`${date}T${time}`)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // +1 hora
      
      const scheduled_date = startDateTime.toISOString()
      const patient = patients.find(p => p.id === patientId)
      
      let google_event_id = null
      
      // 1. Criar no Google Calendar SE tiver token
      if (token) {
        const gcalResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `Sessão com ${patient?.name || 'Paciente'}`,
            description: 'Sessão agendada via Clinica.ia',
            start: { dateTime: scheduled_date },
            end: { dateTime: endDateTime.toISOString() }
          })
        })
        
        if (gcalResponse.ok) {
          const event = await gcalResponse.json()
          google_event_id = event.id
        } else if (gcalResponse.status === 401 || gcalResponse.status === 403) {
          // Token expirado ou sem permissão
          setAccessToken(null)
          setIsTokenExpired(true)
          setIsSubmitting(false)
          return // Pausa o fluxo para o usuário escolher o que fazer
        }
      }
      
      // 2. Salvar no Supabase
      await supabase.from('sessions').insert([{ 
        psychologist_id, 
        patient_id: patientId, 
        scheduled_date, 
        price: parseFloat(price),
        status: 'SCHEDULED',
        google_event_id
      }])
      
      onSaved()
    } catch (err) {
      console.error(err)
      alert('Erro ao criar sessão')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginAndRetry = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      setIsTokenExpired(false)
      setIsSubmitting(true)
      createEventAndSave(tokenResponse.access_token)
    },
    onError: () => {
      alert('Falha ao reconectar com o Google Calendar')
      setIsSubmitting(false)
    },
    scope: 'https://www.googleapis.com/auth/calendar.events'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Tenta criar (vai enviar pro Google apenas se tiver token)
    createEventAndSave(accessToken)
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
            
            {isTokenExpired ? (
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsTokenExpired(false)
                    setIsSubmitting(true)
                    createEventAndSave(null)
                  }} 
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm transition-colors"
                >
                  Salvar sem Google
                </button>
                <button 
                  type="button" 
                  onClick={() => loginAndRetry()} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg>
                  Reconectar Google
                </button>
              </>
            ) : (
              <button type="submit" disabled={!patientId || !date || !time || isSubmitting} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors">
                {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
