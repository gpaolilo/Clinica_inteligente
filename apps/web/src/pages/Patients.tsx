import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  user_id?: string
}

export default function Patients() {
  const { session, role } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
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

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openModal = (patient?: Patient) => {
    setEditingPatient(patient || null)
    setIsModalOpen(true)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    fetchPatients()
  }

  const handleResetPassword = async (email: string | null) => {
    if (!email) return alert((role === 'TEACHER' ? 'Aluno' : 'Paciente') + ' não possui e-mail cadastrado.')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    setLoading(false)
    if (error) {
      alert('Erro ao enviar e-mail de reset: ' + error.message)
    } else {
      alert('E-mail de redefinição de senha enviado com sucesso para ' + email)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o ${role === 'TEACHER' ? 'aluno' : 'paciente'} ${name}?`)) {
      setLoading(true)
      const { error } = await supabase.from('patients').delete().eq('id', id)
      if (error) {
        alert('Erro ao excluir ' + (role === 'TEACHER' ? 'aluno' : 'paciente') + '. Pode haver dados atrelados a ele. (' + error.message + ')')
        setLoading(false)
      } else {
        fetchPatients()
      }
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Meus {role === 'TEACHER' ? 'Alunos' : 'Pacientes'}</h2>
          <p className="text-slate-500 mt-1 text-sm">Gerencie a listagem e o termo de consentimento dos seus {role === 'TEACHER' ? 'alunos' : 'pacientes'}.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Novo {role === 'TEACHER' ? 'Aluno' : 'Paciente'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando {role === 'TEACHER' ? 'alunos' : 'pacientes'}...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-600 font-medium">Nenhum {role === 'TEACHER' ? 'aluno' : 'paciente'} cadastrado</p>
            <p className="text-slate-500 text-sm mt-1">Sua lista de {role === 'TEACHER' ? 'alunos está vazia' : 'acompanhamentos está vazia'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 font-medium text-slate-500">
                <tr>
                  <th className="px-6 py-4">Nome completo</th>
                  <th className="px-6 py-4">Contato Telefônico</th>
                  <th className="px-6 py-4">Ativação da Conta</th>
                  <th className="px-6 py-4">{role === 'TEACHER' ? 'Status do Aluno' : 'Status do Acompanhamento'}</th>
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
                      {p.user_id ? (
                        <span className="inline-flex items-center text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span> Conta Vinculada
                        </span>
                      ) : p.email ? (
                        <span className="inline-flex items-center text-amber-700 text-xs font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> Aguardando Convite
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-500 text-xs font-semibold bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                          <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span> Sem E-mail
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`/dashboard/agenda?new=true&patient_id=${p.id}`}
                        className="mr-4 text-emerald-600 hover:text-emerald-800 font-medium text-sm transition-colors"
                      >
                        Agendar
                      </a>
                      <button 
                        onClick={() => handleResetPassword(p.email)} 
                        disabled={!p.email}
                        className="mr-4 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        Reset Senha
                      </button>
                      <button onClick={() => openModal(p)} className="mr-4 text-primary-600 hover:text-primary-800 font-medium text-sm transition-colors">
                        Detalhes
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="text-rose-600 hover:text-rose-800 font-medium text-sm transition-colors">
                        Excluir
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
