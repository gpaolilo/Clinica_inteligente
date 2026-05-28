import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Search, CheckCircle, XCircle, X, Loader2, Plus, Users, UserCheck } from 'lucide-react'

interface StudentRequest {
  id: string
  student_name: string
  student_email: string
  student_phone: string
  teacher_id: string
  student_level: string | null
  student_goal: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  teacher?: {
    id: string
    full_name: string
  }
}

interface Teacher {
  id: string
  full_name: string
}

export default function EnrollmentRequests() {
  const { session } = useAuthStore()
  
  const [requests, setRequests] = useState<StudentRequest[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null)
  
  // Action state
  const [rejectionMessage, setRejectionMessage] = useState('')
  const [showRejectReasonInput, setShowRejectReasonInput] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  
  // New Request Form modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [newStudentPhone, setNewStudentPhone] = useState('')
  const [newTeacherId, setNewTeacherId] = useState('')
  const [newStudentLevel, setNewStudentLevel] = useState('')
  const [newStudentGoal, setNewStudentGoal] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    // Fetch student requests with linked psychologist details
    let query = supabase
      .from('student_enrollment_requests')
      .select('*, teacher:psychologists(id, full_name)')
      .order('created_at', { ascending: false })
      
    if (filterStatus !== 'ALL') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar solicitações de alunos:', error)
    } else if (data) {
      setRequests(data as StudentRequest[])
    }
    setLoading(false)
  }

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('psychologists')
      .select('id, full_name')
      .order('full_name')
      
    if (error) {
      console.error('Erro ao buscar professores:', error)
    } else if (data) {
      setTeachers(data as Teacher[])
    }
  }

  useEffect(() => {
    fetchRequests()
    fetchTeachers()
  }, [filterStatus])

  const handleSelectRequest = (req: StudentRequest) => {
    setSelectedRequest(req)
    setRejectionMessage('')
    setShowRejectReasonInput(false)
  }

  const handleProcessRequest = async (action: 'approve_student' | 'reject_student') => {
    if (!selectedRequest || !session) return
    
    setActionLoading(true)
    try {
      const response = await fetch('/api/teacher-approval', { // Using same consolidated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          studentRequestId: selectedRequest.id,
          action,
          rejectionMessage: action === 'reject_student' ? rejectionMessage : undefined
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar matrícula')
      }

      setSuccessToast(`Matrícula do aluno ${action === 'approve_student' ? 'aprovada' : 'rejeitada'} com sucesso!`)
      setSelectedRequest(null)
      fetchRequests()
      
      setTimeout(() => {
        setSuccessToast(null)
      }, 4000)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    if (!newStudentName || !newStudentEmail || !newStudentPhone || !newTeacherId) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    setCreateLoading(true)
    try {
      const response = await fetch('/api/teacher-approval', { // Using same consolidated endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'create_student_request',
          studentName: newStudentName,
          studentEmail: newStudentEmail,
          studentPhone: newStudentPhone,
          teacherId: newTeacherId,
          studentLevel: newStudentLevel || undefined,
          studentGoal: newStudentGoal || undefined
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar solicitação de matrícula')
      }

      setSuccessToast('Solicitação de matrícula criada com sucesso!')
      setShowCreateModal(false)
      
      // Reset form states
      setNewStudentName('')
      setNewStudentEmail('')
      setNewStudentPhone('')
      setNewTeacherId('')
      setNewStudentLevel('')
      setNewStudentGoal('')
      
      fetchRequests()
      
      setTimeout(() => {
        setSuccessToast(null)
      }, 4000)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  // Filter requests locally
  const filteredRequests = requests.filter(r => 
    r.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.teacher?.full_name && r.teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-8 relative min-h-screen">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 border border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in"
          >
            <CheckCircle className="w-5 h-5 text-emerald-100" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Matrículas de Alunos</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Acompanhe, aprove e confirme solicitações de matrículas de alunos em academias de professores.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-3 rounded-full text-sm shadow-md transition-all shrink-0 transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Nova Matrícula
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do aluno, e-mail ou professor..."
            className="w-full bg-transparent outline-none text-slate-700 text-sm placeholder-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 gap-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => {
            const labels: any = { ALL: 'Todos', PENDING: 'Pendentes', APPROVED: 'Confirmados', REJECTED: 'Rejeitados' }
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === st 
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {labels[st]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabela de Solicitações */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Aluno</th>
                <th className="p-4">Professor / Academia</th>
                <th className="p-4">Nível / Objetivo</th>
                <th className="p-4">Data da Solicitação</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-450 font-semibold">Carregando solicitações...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-450 font-semibold">Nenhuma solicitação encontrada.</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm">{req.student_name}</div>
                      <div className="text-xs text-slate-450 font-medium">{req.student_email}</div>
                      <div className="text-xs text-slate-400 font-semibold">{req.student_phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700 text-sm">{req.teacher?.full_name || 'Prof. Não Encontrado'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-1.5 border border-indigo-100">
                          {req.student_level || 'N/A'}
                        </span>
                        <span className="text-slate-500 font-medium">{req.student_goal || 'Geral'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-450">
                      {new Date(req.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                        req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {req.status === 'APPROVED' ? 'Confirmado' : req.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSelectRequest(req)}
                        className="text-indigo-600 hover:text-indigo-850 font-extrabold text-sm transition-colors hover:underline"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhe e Revisão da Solicitação */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-800">Revisar Solicitação de Matrícula</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-450 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full border border-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-3 bg-slate-50 border border-slate-150 p-5 rounded-2xl">
                <div>
                  <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Aluno</span>
                  <p className="font-extrabold text-slate-800">{selectedRequest.student_name}</p>
                  <p className="text-xs text-slate-500 font-semibold">{selectedRequest.student_email}</p>
                  <p className="text-xs text-slate-400 font-semibold">{selectedRequest.student_phone}</p>
                </div>
                <hr className="border-slate-200 my-2" />
                <div>
                  <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Professor</span>
                  <p className="font-bold text-slate-800">{selectedRequest.teacher?.full_name}</p>
                </div>
                <hr className="border-slate-200 my-2" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Nível</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded">
                      {selectedRequest.student_level || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Objetivo</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{selectedRequest.student_goal || 'Geral'}</p>
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-4">
                  {showRejectReasonInput ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Motivo da Rejeição (Enviado por e-mail)</label>
                      <textarea
                        value={rejectionMessage}
                        onChange={(e) => setRejectionMessage(e.target.value)}
                        placeholder="Ex: Turmas cheias, dados incorretos, etc."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 transition-all placeholder-slate-400"
                        rows={3}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
              {selectedRequest.status === 'PENDING' ? (
                <>
                  {!showRejectReasonInput ? (
                    <>
                      <button
                        onClick={() => setShowRejectReasonInput(true)}
                        className="px-5 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-extrabold rounded-full text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar Matrícula
                      </button>
                      
                      <button
                        onClick={() => handleProcessRequest('approve_student')}
                        disabled={actionLoading}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full text-xs shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-indigo-100" />
                        )}
                        Confirmar Matrícula
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRejectReasonInput(false)}
                        className="px-5 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => handleProcessRequest('reject_student')}
                        disabled={actionLoading || !rejectionMessage}
                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full text-xs shadow-md shadow-rose-600/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Confirmar Rejeição
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-full text-xs shadow-sm transition-all"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Matrícula (Criar na conta do aluno/professor) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-800">Nova Solicitação de Matrícula</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-450 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full border border-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Aluno *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João Silva"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail do Aluno *</label>
                  <input
                    required
                    type="email"
                    placeholder="joao@email.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp do Aluno *</label>
                  <input
                    required
                    type="text"
                    placeholder="+55 11 99999-9999"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecione o Professor / Academia *</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 text-slate-700"
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                >
                  <option value="">Selecione o professor...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-indigo-850 uppercase mb-1">Nível do Aluno</label>
                  <select
                    className="w-full bg-white border border-indigo-150 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 text-slate-750"
                    value={newStudentLevel}
                    onChange={(e) => setNewStudentLevel(e.target.value)}
                  >
                    <option value="">Nível do aluno...</option>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-850 uppercase mb-1">Objetivo de Aprendizado</label>
                  <input
                    type="text"
                    placeholder="Ex: Fluência para negócios"
                    className="w-full bg-white border border-indigo-150 rounded-xl p-3 text-sm font-semibold outline-none focus:border-indigo-500 transition-all text-slate-800"
                    value={newStudentGoal}
                    onChange={(e) => setNewStudentGoal(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold rounded-full hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full text-sm shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirmar e Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
