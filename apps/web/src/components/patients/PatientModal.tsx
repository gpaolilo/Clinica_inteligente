import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function PatientModal({ patient, onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'DATA' | 'NOTES'>('DATA')
  const [name, setName] = useState(patient?.name || '')
  const [email, setEmail] = useState(patient?.email || '')
  const [phone, setPhone] = useState(patient?.phone || '')
  const [status, setStatus] = useState(patient?.status || 'ACTIVE')

  const [notes, setNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)

  useEffect(() => {
    if (patient) {
      setLoadingNotes(true)
      const fetchNotes = async () => {
         const { data, error } = await supabase.from('clinical_notes')
           .select(`
             id, final_note, ai_evolution, is_signed, created_at,
             sessions!inner(patient_id, scheduled_date)
           `)
           .eq('sessions.patient_id', patient.id)
           .order('created_at', { ascending: false })
         
         if (!error) setNotes(data || [])
         setLoadingNotes(false)
      }
      fetchNotes()
    }
  }, [patient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return;
    const psychologist_id = session.user.id;
    
    if (patient) {
      await supabase.from('patients').update({ name, email, phone, status }).eq('id', patient.id)
    } else {
      await supabase.from('patients').insert([{ name, email, phone, status, psychologist_id }])
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        
        {/* Header com Abas */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-slate-800">{patient ? 'Perfil do Paciente' : 'Cadastrar Paciente'}</h3>
            {patient && (
               <div className="flex p-0.5 bg-slate-200/60 rounded-lg">
                 <button onClick={() => setActiveTab('DATA')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'DATA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Cadastro</button>
                 <button onClick={() => setActiveTab('NOTES')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'NOTES' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Visualizar Prontuários</button>
               </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Corpo Scrollável */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'DATA' && (
            <form id="patient-form" onSubmit={handleSubmit} className="p-6 space-y-5">
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
            </form>
          )}

          {activeTab === 'NOTES' && (
            <div className="p-6 space-y-4">
              {loadingNotes ? (
                <div className="text-center text-slate-500 py-8">Buscando notas da nuvem...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                   Nehnum prontuário assinado ou rascunho de IA gerado para este paciente até o momento.
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center text-sm">
                        <strong className="text-slate-700">Sessão: {new Date(note.sessions.scheduled_date).toLocaleDateString('pt-BR')}</strong>
                        {note.is_signed ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-emerald-100">Assinado Digitalmente</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-amber-100">Rascunho de IA (Em Aberto)</span>
                        )}
                      </div>
                      <div className="p-4 text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                        {note.final_note || note.ai_evolution}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Fixado */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end space-x-3 bg-white">
          <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors">Fechar</button>
          {activeTab === 'DATA' && (
            <button type="submit" form="patient-form" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors">Salvar Alterações</button>
          )}
        </div>
      </div>
    </div>
  )
}
