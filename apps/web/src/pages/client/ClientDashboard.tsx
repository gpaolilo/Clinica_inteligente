import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import RequestSessionModal from '../../components/client/RequestSessionModal'

export default function ClientDashboard() {
  const { session, role } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [upcomingSession, setUpcomingSession] = useState<any>(null)
  const [contentList, setContentList] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    if (!session) return
    setLoading(true)
    
    // 1. Encontrar o registro do paciente vinculado a este usuário
    const { data: patientRecord } = await supabase
      .from('patients')
      .select('id, psychologist_id, name')
      .eq('user_id', session.user.id)
      .single()

    if (!patientRecord) {
      setLoading(false)
      return // Usuário não está vinculado a uma ficha
    }

    // 2. Buscar próxima sessão
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patientRecord.id)
      .in('status', ['SCHEDULED', 'PENDING'])
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(1)

    if (sessionsData && sessionsData.length > 0) {
      setUpcomingSession(sessionsData[0])
    }

    // 3. Buscar conteúdo (Exercícios ou Prontuários Compartilhados)
    if (role === 'STUDENT') {
      const { data: exercises } = await supabase
        .from('homework_plans')
        .select('*, sessions!inner(scheduled_date)')
        .eq('patient_id', patientRecord.id)
        .order('created_at', { ascending: false })
      setContentList(exercises || [])
    } else {
      const { data: notes } = await supabase
        .from('clinical_notes')
        .select('*, sessions!inner(scheduled_date)')
        .eq('sessions.patient_id', patientRecord.id)
        .eq('is_signed', true) // Simplificação: mostrar todas as assinadas. O ideal seria ter uma flag is_shared_with_patient
        .order('created_at', { ascending: false })
      setContentList(notes || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [session, role])

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando seus dados...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="bg-primary-600 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Olá, {session?.user?.user_metadata?.full_name?.split(' ')[0]}!</h2>
          <p className="text-primary-100 font-medium max-w-md">Bem-vindo(a) ao seu portal exclusivo. Aqui você acompanha seus agendamentos e materiais.</p>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 bg-white text-primary-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            {role === 'STUDENT' ? 'Solicitar Nova Aula' : 'Solicitar Nova Sessão'}
          </button>
        </div>
      </div>

      {/* Próximo Agendamento */}
      {upcomingSession && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
             <div className="bg-amber-50 text-amber-600 w-16 h-16 rounded-xl flex flex-col items-center justify-center font-bold">
               <span className="text-sm uppercase leading-tight">{new Date(upcomingSession.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
               <span className="text-2xl leading-tight">{new Date(upcomingSession.scheduled_date).getDate()}</span>
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-800">Próximo Encontro</h3>
               <p className="text-slate-500 font-medium flex items-center mt-1">
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 {new Date(upcomingSession.scheduled_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
               </p>
             </div>
          </div>
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-600">
             Status: <span className={upcomingSession.status === 'PENDING' ? 'text-amber-500' : 'text-emerald-500'}>{upcomingSession.status === 'PENDING' ? 'Aguardando Aprovação' : 'Confirmado'}</span>
          </div>
        </div>
      )}

      {/* Conteúdo (Exercícios ou Prontuários) */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">{role === 'STUDENT' ? 'Meus Exercícios' : 'Minhas Anotações'}</h3>
        {contentList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
            Nenhum material disponível no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {contentList.map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-slate-800">
                     Sessão de {new Date(item.sessions?.scheduled_date).toLocaleDateString('pt-BR')}
                  </h4>
                </div>
                {role === 'STUDENT' ? (
                  <div className="space-y-4">
                    {item.exercises?.map((e: any, i: number) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-800 mb-2">{e.question}</p>
                        <p className="text-sm text-slate-600"><span className="font-bold text-emerald-600">Resposta:</span> {e.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.final_note || item.ai_evolution}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && <RequestSessionModal onClose={() => setIsModalOpen(false)} onSaved={fetchData} />}
    </div>
  )
}
