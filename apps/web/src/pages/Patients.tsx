import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PatientModal from '../components/patients/PatientModal'
import { useAuthStore } from '../stores/authStore'

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string
  status: string
  lgpd_consent: boolean
  client_type: 'PACIENTE' | 'ALUNO'
}

export default function Patients() {
  const { session } = useAuthStore()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  
  const fetchPatients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('patients')
      .select('*')
      .order('name')
    setPatients(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchPatients()
  }, [session])

  const openModal = (patient?: Patient) => {
    setEditingPatient(patient || null)
    setIsModalOpen(true)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    fetchPatients()
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Meus Clientes</h2>
          <p className="text-slate-500 mt-1 text-sm">Gerencie a listagem e o termo de consentimento dos seus pacientes e alunos.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Novo Cliente
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando pacientes...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-600 font-medium">Nenhum paciente cadastrado</p>
            <p className="text-slate-500 text-sm mt-1">Sua lista de acompanhamentos está vazia.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nome completo</th>
                  <th className="px-6 py-4">Contato Telefônico</th>
                  <th className="px-6 py-4">Consentimento LGPD</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="mt-1">
                        {p.client_type === 'ALUNO' ? (
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">Aluno</span>
                        ) : (
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Paciente</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        {p.phone}
                      </div>
                      <span className="text-xs text-slate-400 ml-6">{p.email || 'Sem e-mail'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {p.lgpd_consent ? (
                        <span className="inline-flex items-center text-primary-700 text-xs font-semibold bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
                          <span className="w-2 h-2 rounded-full bg-primary-500 mr-1.5"></span> Aceito
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-700 text-xs font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Enviar LGPD via Edge Function mock */}
                      {!p.lgpd_consent && (
                        <button 
                          onClick={() => alert(`Webhook LGPD Disparado p/ ${p.name}! (Simboliza a Edge Function)`)}
                          className="mr-4 text-amber-600 hover:text-amber-800 font-medium text-sm transition-colors"
                        >
                          Solicitar LGPD
                        </button>
                      )}
                      <button onClick={() => openModal(p)} className="text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors">
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <PatientModal 
          patient={editingPatient} 
          onClose={() => setIsModalOpen(false)} 
          onSaved={handleSaved} 
        />
      )}
    </div>
  )
}
