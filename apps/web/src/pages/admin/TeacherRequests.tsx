import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Search, CheckCircle, XCircle, FileText, ChevronRight, X, Loader2 } from 'lucide-react'

interface TeacherRequest {
  id: string
  full_name: string
  email: string
  academy_name: string
  country: string
  teaching_area: string
  student_count: number
  website: string | null
  challenge: string
  current_tools: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  admin_notes: string | null
  created_at: string
}

export default function TeacherRequests() {
  const { session } = useAuthStore()
  
  const [requests, setRequests] = useState<TeacherRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedRequest, setSelectedRequest] = useState<TeacherRequest | null>(null)
  
  // Modal Action State
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionMessage, setRejectionMessage] = useState('')
  const [showRejectReasonInput, setShowRejectReasonInput] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const fetchRequests = async () => {
    setLoading(true)
    let query = supabase.from('teacher_signup_requests').select('*').order('created_at', { ascending: false })
    
    if (filterStatus !== 'ALL') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar solicitações:', error)
    } else if (data) {
      setRequests(data as TeacherRequest[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [filterStatus])

  const handleSelectRequest = (req: TeacherRequest) => {
    setSelectedRequest(req)
    setAdminNotes(req.admin_notes || '')
    setRejectionMessage('')
    setShowRejectReasonInput(false)
  }

  const handleProcessRequest = async (action: 'approve' | 'reject') => {
    if (!selectedRequest || !session) return
    
    setActionLoading(true)
    try {
      const response = await fetch('/api/teacher-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action,
          adminNotes,
          rejectionMessage: action === 'reject' ? rejectionMessage : undefined
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar solicitação')
      }

      setSuccessToast(`Solicitação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!`)
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

  // Filter requests locally by search query
  const filteredRequests = requests.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.academy_name.toLowerCase().includes(searchQuery.toLowerCase())
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
            className="fixed bottom-6 right-6 z-50 bg-emerald-600 border border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold"
          >
            <CheckCircle className="w-5 h-5 text-emerald-100" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Solicitações de Cadastro</h2>
        <p className="text-slate-500 mt-1 text-sm font-medium">Gerencie e aprove o acesso de novos professores na plataforma Flowike.</p>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou academia..."
            className="w-full bg-transparent outline-none text-slate-700 text-sm placeholder-slate-400 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 gap-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => {
            const labels: any = { ALL: 'Todos', PENDING: 'Pendentes', APPROVED: 'Aprovados', REJECTED: 'Rejeitados' }
            const isActive = filterStatus === st
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  isActive 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {labels[st]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tabela de Solicitações */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Professor / Academia</th>
                  <th className="p-4">País / Área</th>
                  <th className="p-4">Data Cadastro</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                        <span className="text-sm font-semibold text-slate-500">Buscando solicitações...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-medium text-sm">
                      Nenhuma solicitação encontrada nesta visualização.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    const isSelected = selectedRequest?.id === req.id
                    return (
                      <tr 
                        key={req.id} 
                        onClick={() => handleSelectRequest(req)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50 border-l-4 border-slate-800' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{req.full_name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{req.email}</div>
                          <div className="text-xs text-slate-500 font-semibold mt-1 bg-slate-100 px-2 py-0.5 rounded w-max">{req.academy_name}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-semibold text-slate-700">{req.country}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{req.teaching_area}</div>
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-medium">
                          {new Date(req.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-full border ${
                            req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {req.status === 'APPROVED' ? 'Aprovado' :
                             req.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhes da Solicitação */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                key={selectedRequest.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
              >
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Detalhes da Inscrição</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Analise as respostas para aprovação.</p>
                  </div>
                  <button 
                    onClick={() => setSelectedRequest(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Como gerencia os alunos atualmente?</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-700 text-xs">
                      {selectedRequest.current_tools}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Maior desafio enfrentado</span>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-700 text-xs">
                      {selectedRequest.challenge}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume de Alunos</span>
                      <div className="font-bold text-slate-800">{selectedRequest.student_count} alunos</div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Website / Social</span>
                      {selectedRequest.website ? (
                        <a 
                          href={`https://${selectedRequest.website.replace(/(^\w+:|^)\/\//, '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-bold text-blue-600 hover:underline break-all block"
                        >
                          {selectedRequest.website}
                        </a>
                      ) : (
                        <div className="text-slate-400 font-medium italic">Não informado</div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notas Internas da Revisão</label>
                    <textarea
                      placeholder="Adicione observações visíveis apenas para a equipe interna..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-slate-800 focus:bg-white h-20 resize-none transition-colors"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  {showRejectReasonInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-rose-100 pt-4"
                    >
                      <label className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">Motivo da Rejeição (Enviado por E-mail)</label>
                      <textarea
                        placeholder="Ex: No momento sua área de atuação não está disponível em nossa fila..."
                        className="w-full bg-rose-50/20 border border-rose-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-rose-400 focus:bg-white h-20 resize-none transition-colors text-rose-900"
                        value={rejectionMessage}
                        onChange={(e) => setRejectionMessage(e.target.value)}
                      />
                    </motion.div>
                  )}

                  {/* Actions */}
                  {selectedRequest.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                      {!showRejectReasonInput ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRejectReasonInput(true)}
                            disabled={actionLoading}
                            className="flex-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Rejeitar
                          </button>
                          
                          <button
                            onClick={() => handleProcessRequest('approve')}
                            disabled={actionLoading}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Aprovar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowRejectReasonInput(false)}
                            disabled={actionLoading}
                            className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-xs transition-all"
                          >
                            Cancelar
                          </button>
                          
                          <button
                            onClick={() => handleProcessRequest('reject')}
                            disabled={actionLoading}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Confirmar Rejeição
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRequest.status !== 'PENDING' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mt-4">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cadastro revisado em</div>
                      <div className="text-sm font-black text-slate-700 mt-1">
                        {selectedRequest.status === 'APPROVED' ? 'Aprovado ✓' : 'Rejeitado ✗'}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center text-slate-400 h-[300px]">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Selecione uma solicitação da lista para ver o detalhamento completo e tomar ações de aprovação.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
