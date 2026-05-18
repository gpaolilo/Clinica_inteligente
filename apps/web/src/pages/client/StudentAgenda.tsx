import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Calendar, Clock, X, RefreshCw, MessageSquare, CheckCircle } from 'lucide-react'

type Tab = 'UPCOMING' | 'PAST' | 'CANCELLED'

export default function StudentAgenda() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('UPCOMING')
  const [sessions, setSessions] = useState<any[]>([])
  
  // Modal de Cancelamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [canceling, setCanceling] = useState(false)

  const fetchAgenda = async () => {
    if (!session) return
    setLoading(true)

    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!patient) return

    const { data } = await supabase
      .from('sessions')
      .select('*, psychologists(full_name)')
      .eq('patient_id', patient.id)
      .order('scheduled_date', { ascending: activeTab === 'UPCOMING' })

    if (data) {
      setSessions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAgenda()
  }, [session, activeTab]) // Refetch on tab change to re-sort

  const handleCancelSession = async () => {
    if (!selectedSession) return
    setCanceling(true)
    
    try {
      const { error } = await supabase.rpc('cancel_session', {
        p_session_id: selectedSession.id,
        p_reason: cancelReason || 'Cancelado pelo aluno'
      })
      
      if (error) throw error
      
      setCancelModalOpen(false)
      setSelectedSession(null)
      setCancelReason('')
      fetchAgenda()
      alert('Aula cancelada com sucesso. O saldo foi estornado para sua conta.')
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err.message}`)
    } finally {
      setCanceling(false)
    }
  }

  const filteredSessions = sessions.filter(s => {
    const isFuture = new Date(s.scheduled_date) > new Date()
    if (activeTab === 'UPCOMING') return (s.status === 'SCHEDULED' || s.status === 'PENDING') && isFuture
    if (activeTab === 'PAST') return s.status === 'COMPLETED' || (!isFuture && s.status !== 'CANCELLED')
    if (activeTab === 'CANCELLED') return s.status === 'CANCELLED'
    return false
  })

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-primary-500" /> Minha Agenda
          </h1>
          <p className="text-slate-500 mt-1">Gerencie suas aulas e histórico de agendamentos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit">
        {(['UPCOMING', 'PAST', 'CANCELLED'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'UPCOMING' ? 'Próximas Aulas' : tab === 'PAST' ? 'Histórico' : 'Canceladas'}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-12 text-center border border-slate-200/60">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Nenhuma aula encontrada</h2>
          <p className="text-slate-500 mt-2">Você não tem nenhuma aula nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSessions.map((session) => {
              const date = new Date(session.scheduled_date)
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary-50 p-3 rounded-2xl text-center min-w-[70px]">
                      <p className="text-primary-600 text-xs font-black uppercase">
                        {date.toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                      <p className="text-primary-700 text-xl font-black">
                        {date.getDate()}
                      </p>
                    </div>
                    {activeTab === 'UPCOMING' && (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Confirmado
                      </span>
                    )}
                    {activeTab === 'CANCELLED' && (
                      <span className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1 rounded-full">
                        Cancelada
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-6 flex-1">
                    <h3 className="font-bold text-lg text-slate-800">Aula com {session.psychologists?.full_name?.split(' ')[0]}</h3>
                    <p className="text-slate-500 flex items-center gap-1 mt-2 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({session.duration} min)
                    </p>
                  </div>

                  {activeTab === 'UPCOMING' && (
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button 
                        className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-sm"
                      >
                        Entrar na Aula
                      </button>
                      <button 
                        onClick={() => { setSelectedSession(session); setCancelModalOpen(true); }}
                        className="p-2.5 text-slate-400 border border-slate-200 rounded-xl hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                        title="Cancelar Aula"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {activeTab === 'PAST' && (
                    <button className="w-full bg-primary-50 text-primary-600 font-bold py-2.5 rounded-xl hover:bg-primary-100 transition-colors text-sm flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Ver Resumo (Insights)
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCancelModalOpen(false)} />
            
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-[32px] p-8 max-w-md w-full relative z-10 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-800 mb-2">Cancelar Aula?</h3>
              <p className="text-slate-500 mb-6">Ao cancelar, o saldo referente a esta aula ({(selectedSession?.duration / 50).toFixed(1)} crédito) será retornado imediatamente para a sua conta.</p>
              
              <textarea 
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)"
                className="w-full border border-slate-200 rounded-xl p-4 mb-6 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                rows={3}
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCancelModalOpen(false)}
                  className="flex-1 font-bold py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleCancelSession}
                  disabled={canceling}
                  className="flex-1 font-bold py-3 text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-lg shadow-rose-500/30 disabled:opacity-50"
                >
                  {canceling ? 'Cancelando...' : 'Sim, Cancelar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
