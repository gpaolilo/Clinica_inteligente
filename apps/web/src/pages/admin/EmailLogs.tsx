import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Mail, Calendar, Clock, ChevronRight, X, RefreshCw } from 'lucide-react'

interface EmailLog {
  id: string
  recipient: string
  subject: string
  body: string
  sent_at: string
  status: string
}

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('system_email_logs')
      .select('*')
      .order('sent_at', { ascending: false })

    if (error) {
      console.error('Error fetching email logs:', error)
    } else if (data) {
      setLogs(data as EmailLog[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.body.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'ALL' || log.status.toUpperCase() === statusFilter.toUpperCase()

    let matchesDate = true
    if (dateFilter !== 'ALL') {
      const logDate = new Date(log.sent_at)
      const now = new Date()
      if (dateFilter === 'TODAY') {
        matchesDate = logDate.toDateString() === now.toDateString()
      } else if (dateFilter === 'WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= sevenDaysAgo
      } else if (dateFilter === 'MONTH') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= thirtyDaysAgo
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <div className="p-8 relative min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Registro de Comunicações</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Rastreie todos os e-mails disparados pelo sistema para professores, alunos e psicólogos.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm mb-6">
        <div className="relative flex-1 w-full flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Filtrar por destinatário, assunto ou conteúdo..."
            className="w-full bg-transparent outline-none text-slate-700 text-xs placeholder-slate-450 font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-44"
          >
            <option value="ALL">Todos os Status</option>
            <option value="SUCCESS">Sucesso (SUCCESS)</option>
            <option value="FAILED">Falha (FAILED)</option>
            <option value="SENT">Enviado (SENT)</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors w-full sm:w-48"
          >
            <option value="ALL">Todo o Período</option>
            <option value="TODAY">Hoje</option>
            <option value="WEEK">Últimos 7 dias</option>
            <option value="MONTH">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Tabela de logs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Destinatário</th>
                <th className="p-4">Assunto</th>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    Carregando registros...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-450 font-medium">
                    Nenhum registro de e-mail encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 text-sm">{log.recipient}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-700 truncate max-w-xs">{log.subject}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-450 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.sent_at).toLocaleDateString('pt-BR')}
                        <Clock className="w-3.5 h-3.5 ml-1" />
                        {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center text-emerald-700 text-xs font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1"
                      >
                        Ver Detalhes
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes do E-mail */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-800">Visualização de E-mail</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-450 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full border border-slate-250 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl text-sm">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Para</span>
                  <span className="font-bold text-slate-800">{selectedLog.recipient}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Data de Envio</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedLog.sent_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Assunto</span>
                  <span className="font-extrabold text-slate-800">{selectedLog.subject}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">Conteúdo da Mensagem</span>
                <div className="bg-slate-900 text-slate-200 font-mono text-xs p-6 rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedLog.body.trim()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-full text-sm shadow-sm transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
