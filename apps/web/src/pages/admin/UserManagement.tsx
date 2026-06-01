import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore, UserRole } from '../../stores/authStore'

interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
  email?: string | null
}

interface Patient {
  id: string
  name: string
  email: string | null
  client_type: string
  psychologist_id: string
  user_id?: string | null
}

export default function UserManagement() {
  const { session } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'ROLES' | 'LINKS'>('ROLES')
  const [users, setUsers] = useState<Profile[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [roleSearchQuery, setRoleSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [linkSearchQuery, setLinkSearchQuery] = useState('')
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('ALL')
  const [professionalFilter, setProfessionalFilter] = useState<string>('ALL')

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(roleSearchQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      (patient.name || '').toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
      (patient.email || '').toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(linkSearchQuery.toLowerCase())
    const matchesType = clientTypeFilter === 'ALL' || patient.client_type === clientTypeFilter
    const matchesProfessional = professionalFilter === 'ALL' || patient.psychologist_id === professionalFilter
    return matchesSearch && matchesType && matchesProfessional
  })

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      setUsers(data as Profile[])
      // Filtra apenas professores e psicólogos para a listagem de profissionais
      setProfessionals(data.filter(u => u.role === 'TEACHER' || u.role === 'PSYCHOLOGIST') as Profile[])
    }
    setLoading(false)
  }

  const fetchPatients = async () => {
    setLoading(true)
    // Traz todos os pacientes. Isso só vai funcionar se a migration 20260423000001_admin_rls.sql for rodada.
    const { data } = await supabase.from('patients').select('id, name, email, client_type, psychologist_id, user_id').order('name')
    if (data) setPatients(data)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'ROLES') {
      fetchUsers()
    } else {
      fetchPatients()
      // Se não tiver os profissionais carregados ainda, carrega-os
      if (professionals.length === 0) fetchUsers()
    }
  }, [activeTab])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('Erro ao atualizar papel: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e pode remover dados associados a ele.')) return

    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        alert('Usuário excluído com sucesso.')
      } else {
        const err = await res.json()
        console.error('Erro na API de deleção:', err)
        if (window.location.hostname === 'localhost') {
           alert('Aviso: A deleção falhou. A API local requer o Vercel CLI (npx vercel dev) para funcionar.')
        } else {
           alert('Erro ao excluir usuário: ' + (err.error || 'Erro desconhecido'))
        }
      }
    } catch (error) {
      console.error('Erro ao excluir usuário', error)
      if (window.location.hostname === 'localhost') {
         alert('Aviso: A deleção falhou (ambiente local sem Vercel CLI).')
      } else {
         alert('Erro ao excluir usuário.')
      }
    }
  }

  const handlePsychologistChange = async (patientId: string, newPsychologistId: string) => {
    const { error } = await supabase
      .from('patients')
      .update({ psychologist_id: newPsychologistId })
      .eq('id', patientId)

    if (error) {
      alert('Erro ao alterar o vínculo: ' + error.message)
    } else {
      setPatients(patients.map(p => p.id === patientId ? { ...p, psychologist_id: newPsychologistId } : p))
      alert('Vínculo alterado com sucesso!')
    }
  }

  const handleDeleteStudent = async (patient: Patient) => {
    if (!window.confirm(`Tem certeza que deseja excluir o aluno "${patient.name}"? Esta ação não pode ser desfeita e removerá todo o histórico de aulas, notas, progresso e conta de acesso.`)) {
      return
    }

    setLoading(true)
    try {
      // 1. Delete from patients table
      const { error: deletePatientError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id)

      if (deletePatientError) {
        throw new Error('Erro ao excluir registro do aluno: ' + deletePatientError.message)
      }

      // 2. If there is a user_id, delete their auth user as well
      if (patient.user_id) {
        const res = await fetch('/api/delete-user', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ userId: patient.user_id })
        })

        if (!res.ok) {
          const err = await res.json()
          console.error('Erro ao excluir conta de acesso do aluno:', err)
          alert('O aluno foi removido, mas houve um erro ao excluir sua conta de acesso: ' + (err.error || 'Erro desconhecido'))
        }
      }

      alert('Aluno excluído com sucesso!')
      setPatients(patients.filter(p => p.id !== patient.id))
    } catch (error: any) {
      console.error('Erro ao excluir aluno:', error)
      alert(error.message || 'Erro ao excluir o aluno.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gerenciamento Administrativo</h2>
        <p className="text-slate-500 mt-1 text-sm">Visualize permissões e vínculos entre pacientes e profissionais.</p>
      </div>

      <div className="flex space-x-4 mb-6">
        <button 
          onClick={() => setActiveTab('ROLES')}
          className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors ${activeTab === 'ROLES' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          Contas e Papéis
        </button>
        <button 
          onClick={() => setActiveTab('LINKS')}
          className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors ${activeTab === 'LINKS' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
        >
          Vínculos de Pacientes/Alunos
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Advanced Filters */}
        <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          {activeTab === 'ROLES' ? (
            <>
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Buscar usuário por nome, e-mail ou ID..."
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 transition-all text-slate-800"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors w-full md:w-48"
                >
                  <option value="ALL">Todos os Papéis</option>
                  <option value="ADMIN">ADMINISTRADOR</option>
                  <option value="TEACHER">PROFESSOR</option>
                  <option value="PSYCHOLOGIST">PSICÓLOGO</option>
                  <option value="STUDENT">ALUNO</option>
                  <option value="PATIENT">PACIENTE</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Buscar aluno/paciente por nome, e-mail..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 transition-all text-slate-800"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <select
                  value={clientTypeFilter}
                  onChange={(e) => setClientTypeFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-40"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="ALUNO">ALUNO</option>
                  <option value="PACIENTE">PACIENTE</option>
                </select>

                <select
                  value={professionalFilter}
                  onChange={(e) => setProfessionalFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-56"
                >
                  <option value="ALL">Todos os Profissionais</option>
                  {professionals.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.full_name} ({prof.role === 'TEACHER' ? 'Prof.' : 'Psi.'})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {activeTab === 'ROLES' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">ID do Usuário</th>
                  <th className="p-4">Papel (Role)</th>
                  <th className="p-4">Data de Criação</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">Carregando usuários...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-semibold">Nenhum usuário encontrado.</td></tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{user.full_name || 'Usuário Sem Nome'}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{user.email || '—'}</td>
                      <td className="p-4 text-xs font-mono text-slate-400">{user.id}</td>
                      <td className="p-4">
                        <select 
                          value={user.role} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className={`text-sm font-bold rounded-lg px-3 py-1.5 border outline-none cursor-pointer transition-colors ${
                            user.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            user.role === 'TEACHER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            user.role === 'PSYCHOLOGIST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="ADMIN">ADMINISTRADOR</option>
                          <option value="TEACHER">PROFESSOR</option>
                          <option value="PSYCHOLOGIST">PSICÓLOGO</option>
                          <option value="STUDENT">ALUNO</option>
                          <option value="PATIENT">PACIENTE</option>
                        </select>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-rose-600 hover:text-rose-800 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Nome do Paciente/Aluno</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Profissional Responsável (Dono)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">Carregando pacientes...</td></tr>
                ) : filteredPatients.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-semibold">Nenhum paciente ou aluno encontrado.</td></tr>
                ) : (
                  filteredPatients.map(patient => {
                    const prof = professionals.find(p => p.id === patient.psychologist_id)
                    const canDelete = patient.client_type === 'ALUNO' && prof?.role === 'TEACHER'

                    return (
                      <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-800">{patient.name}</td>
                        <td className="p-4 text-sm text-slate-650">{patient.email || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${patient.client_type === 'ALUNO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {patient.client_type}
                          </span>
                        </td>
                        <td className="p-4">
                          <select 
                            value={patient.psychologist_id} 
                            onChange={(e) => handlePsychologistChange(patient.id, e.target.value)}
                            className="text-sm font-bold rounded-lg px-3 py-1.5 border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer hover:border-slate-350 w-full max-w-xs transition-colors"
                          >
                            <option value="" disabled>Selecione o profissional...</option>
                            {professionals.map(prof => (
                              <option key={prof.id} value={prof.id}>
                                {prof.full_name} ({prof.role})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          {canDelete ? (
                            <button 
                              onClick={() => handleDeleteStudent(patient)}
                              className="text-rose-600 hover:text-rose-800 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
                            >
                              Excluir
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic select-none">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  }))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
