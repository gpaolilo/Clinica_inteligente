import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import ScheduleModal from '../components/agenda/ScheduleModal'

interface SessionData {
  id: string
  scheduled_date: string
  status: string
  price: number
  patient: { id: string, name: string }
}

export default function Agenda() {
  const { session } = useAuthStore()
  const navigate = useNavigate()
  const [sessionsList, setSessionsList] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | '7' | '15' | '30' | 'custom'>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchAgenda = async () => {
    setLoading(true)
    // Buscando as sessões em join explícito com o nome do paciente
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, 
        scheduled_date, 
        status, 
        price, 
        patient:patients (id, name)
      `)
      .order('scheduled_date', { ascending: true })
    
    // Note: Supondo o cast já que o Postgres garante 1:1 nesse request de foreign key
    setSessionsList(data as any || [])
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchAgenda()
  }, [session])

  const openModal = () => setIsModalOpen(true)
  const handleSaved = () => {
    setIsModalOpen(false)
    fetchAgenda()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta sessão?')) {
      setLoading(true)
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) {
        alert('Erro ao excluir sessão. (' + error.message + ')')
        setLoading(false)
      } else {
        fetchAgenda()
      }
    }
  }

  const upcomingSessions = sessionsList.filter(s => s.status === 'SCHEDULED')
  
  const pastSessions = sessionsList.filter(s => {
    if (s.status === 'SCHEDULED') return false
    if (historyFilter === 'all') return true
    
    const sessionDate = new Date(s.scheduled_date)
    const now = new Date()
    
    if (historyFilter === 'custom') {
      if (!customStart && !customEnd) return true
      const sDate = customStart ? new Date(customStart + 'T00:00:00') : new Date(0)
      const eDate = customEnd ? new Date(customEnd + 'T23:59:59') : new Date(8640000000000000)
      return sessionDate >= sDate && sessionDate <= eDate
    }
    
    const days = parseInt(historyFilter)
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return sessionDate >= cutoffDate && sessionDate <= now
  })

  const renderSessionList = (list: SessionData[], emptyMessage: string) => {
    if (loading) return <div className="p-8 text-center text-slate-500">Carregando horários...</div>
    if (list.length === 0) return (
      <div className="p-12 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-slate-600 font-medium">{emptyMessage}</p>
      </div>
    )

    return (
      <div className="divide-y divide-slate-100">
        {list.map(s => {
          const dt = new Date(s.scheduled_date)
          const patientName = Array.isArray(s.patient) ? s.patient[0]?.name : s.patient?.name || 'Paciente deletado'
          
          return (
            <div key={s.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-6">
                <div className="flex flex-col items-center justify-center p-3 bg-primary-50 rounded-lg w-20 border border-primary-100 text-primary-700">
                  <span className="text-sm font-bold uppercase">{dt.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  <span className="text-2xl font-black">{dt.getDate()}</span>
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="text-lg font-bold text-slate-800">{patientName}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      s.status === 'SCHEDULED' ? 'bg-sky-100 text-sky-700' : 
                      s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.status === 'SCHEDULED' ? 'Agendado' : s.status === 'COMPLETED' ? 'Concluída' : s.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center space-x-4">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      R$ {s.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="text-rose-500 hover:text-rose-700 font-medium text-sm transition-colors"
                >
                  Excluir
                </button>
                {s.status === 'SCHEDULED' && (
                  <button 
                    onClick={() => navigate(`/dashboard/session/${s.id}`)}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
                  >
                    Iniciar Sessão
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Agenda Semanal</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle de horários e inicialização das consultas.</p>
        </div>
        <button 
          onClick={openModal}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Agendar Consulta
        </button>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Próximas Sessões
          </h3>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            {renderSessionList(upcomingSessions, "Nenhuma sessão agendada para os próximos dias.")}
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 space-y-3 sm:space-y-0">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <svg className="w-6 h-6 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Histórico de Sessões
            </h3>
            
            <div className="flex items-center space-x-3">
              {historyFilter === 'custom' && (
                <div className="flex items-center space-x-2 mr-2">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500" />
                  <span className="text-slate-400 text-sm">até</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500" />
                </div>
              )}
              <select 
                value={historyFilter} 
                onChange={e => setHistoryFilter(e.target.value as any)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-primary-500 shadow-sm"
              >
                <option value="all">Todo o Histórico</option>
                <option value="7">Últimos 7 dias</option>
                <option value="15">Últimos 15 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="custom">Período Específico</option>
              </select>
            </div>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            {renderSessionList(pastSessions, "Nenhuma sessão no histórico.")}
          </div>
        </div>
      </div>

      {isModalOpen && <ScheduleModal onClose={() => setIsModalOpen(false)} onSaved={handleSaved} />}
    </div>
  )
}
