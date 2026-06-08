import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function PatientModal({ patient, onClose, onSaved }: any) {
  const { session, role } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'DATA' | 'NOTES' | 'INSIGHTS' | 'EXERCISES'>('DATA')
  const [name, setName] = useState(patient?.name || '')
  const [email, setEmail] = useState(patient?.email || '')
  const [phone, setPhone] = useState(patient?.phone || '')
  const [status, setStatus] = useState(patient?.status || 'ACTIVE')
  
  // Novos estados do PRD de Alunos
  const [clientType, setClientType] = useState<'PACIENTE'|'ALUNO'>(
    patient?.client_type || (role === 'TEACHER' ? 'ALUNO' : 'PACIENTE')
  )
  const [studentLevel, setStudentLevel] = useState(patient?.student_level || '')
  const [studentGoal, setStudentGoal] = useState(patient?.student_goal || '')
  const [classBalance, setClassBalance] = useState(patient?.class_balance || 0)

  const [notes, setNotes] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (patient) {
      setLoadingData(true)
      const fetchData = async () => {
         if (patient.client_type === 'PACIENTE') {
           const { data, error } = await supabase.from('clinical_notes')
             .select(`
               id, final_note, ai_evolution, is_signed, created_at,
               sessions!inner(patient_id, scheduled_date)
             `)
             .eq('sessions.patient_id', patient.id)
             .order('created_at', { ascending: false })
           if (!error) setNotes(data || [])
         } else {
           // Fetch Insights by grouping learning_events
           const { data: eventsData, error: eventsErr } = await supabase.from('learning_events')
             .select('*, sessions!inner(scheduled_date)')
             .eq('patient_id', patient.id)
             .order('created_at', { ascending: false })
             
           if (!eventsErr && eventsData) {
             const grouped = eventsData.reduce((acc: any, event: any) => {
               if (!acc[event.session_id]) {
                 acc[event.session_id] = {
                   id: event.session_id,
                   sessions: event.sessions,
                   fluency_score: 'BOM',
                   confidence_score: 'MÉDIO',
                   summary: 'Análise extraída dos eventos de aprendizado da sessão.',
                   grammar_errors: [],
                   vocabulary_suggestions: [],
                   next_actions: []
                 }
               }
               if (event.event_type === 'session_metrics') {
                  acc[event.session_id].fluency_score = event.details.fluency_score
                  acc[event.session_id].confidence_score = event.details.confidence_score
                  acc[event.session_id].summary = event.details.summary
               }
               if (event.event_type === 'grammar_error') {
                 acc[event.session_id].grammar_errors.push(event.details)
               }
               if (event.event_type === 'vocabulary_gap') {
                 acc[event.session_id].vocabulary_suggestions.push(event.details.suggested_word || event.details.missing_word)
               }
               if (event.event_type === 'context_need') {
                 acc[event.session_id].next_actions.push(`Focar em: ${event.details.scenario}`)
               }
               return acc
             }, {})
             setInsights(Object.values(grouped))
           }
           
           // Fetch Exercícios
           const { data: eData, error: eErr } = await supabase.from('homework_plans')
             .select('*, sessions!inner(scheduled_date)')
             .eq('patient_id', patient.id)
             .order('created_at', { ascending: false })
           if (!eErr) setExercises(eData || [])
         }
         
         setLoadingData(false)
      }
      fetchData()
    }
  }, [patient])

  const [localPatientId, setLocalPatientId] = useState<string | null>(patient?.id || null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [hasInvited, setHasInvited] = useState(false)

  const ensureSaved = async () => {
    if (!session) return null;
    const psychologist_id = session.user.id;
    
    const payload = { 
      name, 
      email, 
      phone, 
      status, 
      client_type: clientType,
      student_level: clientType === 'ALUNO' ? studentLevel : null,
      student_goal: clientType === 'ALUNO' ? studentGoal : null,
      class_balance: parseFloat(classBalance.toString()) || 0
    }

    if (localPatientId) {
      const { error } = await supabase.from('patients').update(payload).eq('id', localPatientId)
      if (error) {
        alert('Erro ao atualizar ' + (clientType === 'ALUNO' ? 'aluno' : 'paciente') + ': ' + error.message)
        return null
      }
      return localPatientId
    } else {
      const { data, error } = await supabase.from('patients').insert([{ ...payload, psychologist_id }]).select('id').single()
      
      if (error) {
        console.error('Insert error:', error)
        alert('Erro ao criar ' + (clientType === 'ALUNO' ? 'aluno' : 'paciente') + ' no banco de dados: ' + error.message)
        return null
      }
      if (data?.id) {
        setLocalPatientId(data.id)
        return data.id
      }
      return null
    }
  }

  const handleInvite = async (type: 'EMAIL' | 'WHATSAPP' | 'COPY') => {
    if (!email) {
      alert('Por favor, preencha o campo de E-mail para enviar o convite.')
      return
    }
    setInviteLoading(true)
    try {
      const savedId = await ensureSaved()
      if (!savedId) {
        setInviteLoading(false)
        return
      }

      const apiRes = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          email: email,
          name: name,
          role: clientType === 'ALUNO' ? 'STUDENT' : 'PATIENT'
        })
      })

      if (apiRes.ok) {
        const apiData = await apiRes.json()
        if (apiData.user?.id) {
          await supabase.from('patients').update({ user_id: apiData.user.id }).eq('id', savedId)
        }

        setHasInvited(true)

        if (apiData.actionLink) {
          setInviteLink(apiData.actionLink)
        }

        if (type === 'EMAIL') {
          alert('Convite enviado por e-mail com sucesso!')
        } else if (type === 'COPY') {
          if (apiData.actionLink) {
            await navigator.clipboard.writeText(apiData.actionLink)
            alert('Link de convite copiado para a área de transferência!')
          } else {
            alert('Convite enviado, mas não foi possível gerar o link de cópia.')
          }
        } else if (type === 'WHATSAPP') {
          if (!apiData.actionLink) {
            alert('Não foi possível gerar o link de compartilhamento do WhatsApp.')
          }
        }
      } else {
        const errText = await apiRes.text()
        alert('Erro ao processar convite: ' + errText)
      }
    } catch (err: any) {
      alert('Erro ao processar convite: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const savedId = await ensureSaved()
    if (savedId) {
      // Se for um novo cadastro com e-mail, e não gerou link ainda, envia convite automático
      if (!patient && email && !hasInvited) {
        try {
          const apiRes = await fetch('/api/invite-user', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({
              email: email,
              name: name,
              role: clientType === 'ALUNO' ? 'STUDENT' : 'PATIENT'
            })
          })
          if (apiRes.ok) {
            const apiData = await apiRes.json()
            if (apiData.user?.id) {
              await supabase.from('patients').update({ user_id: apiData.user.id }).eq('id', savedId)
            }
            setHasInvited(true)
          }
        } catch (err) {
          console.error('Auto invite error:', err)
        }
      }
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Header com Abas */}
        <div className="px-8 py-5 flex justify-between items-center bg-white border-b border-slate-100">
          <div className="flex items-center space-x-6">
            <h3 className="text-2xl font-bold text-dark tracking-tight">{patient ? (clientType === 'ALUNO' ? 'Detalhes do Aluno' : 'Detalhes do Paciente') : (role === 'TEACHER' ? 'Novo Aluno' : 'Novo Paciente')}</h3>
            {patient && (
               <div className="flex p-1 bg-background rounded-full border border-slate-100 overflow-x-auto max-w-[340px] md:max-w-none">
                 <button onClick={() => setActiveTab('DATA')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors whitespace-nowrap ${activeTab === 'DATA' ? 'bg-neon text-dark shadow-sm' : 'text-slate-500 hover:text-dark'}`}>Cadastro</button>
                 {clientType === 'PACIENTE' && (
                   <button onClick={() => setActiveTab('NOTES')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors whitespace-nowrap ${activeTab === 'NOTES' ? 'bg-neon text-dark shadow-sm' : 'text-slate-500 hover:text-dark'}`}>Prontuários</button>
                 )}
                 {clientType === 'ALUNO' && (
                   <>
                     <button onClick={() => setActiveTab('INSIGHTS')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors whitespace-nowrap ${activeTab === 'INSIGHTS' ? 'bg-neon text-dark shadow-sm' : 'text-slate-500 hover:text-dark'}`}>Insights</button>
                     <button onClick={() => setActiveTab('EXERCISES')} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors whitespace-nowrap ${activeTab === 'EXERCISES' ? 'bg-neon text-dark shadow-sm' : 'text-slate-500 hover:text-dark'}`}>Exercícios</button>
                   </>
                 )}
               </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-dark transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full flex-shrink-0 ml-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Corpo Scrollável */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'DATA' && (
            <form id="patient-form" onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {role !== 'TEACHER' && role !== 'PSYCHOLOGIST' && (
                <div className="mb-6">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Cliente</label>
                   <div className="flex space-x-4">
                     <label className={`flex-1 flex items-center justify-center cursor-pointer border rounded-xl py-3 text-sm font-bold transition-all ${clientType === 'PACIENTE' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                       <input type="radio" value="PACIENTE" checked={clientType === 'PACIENTE'} onChange={() => setClientType('PACIENTE')} className="sr-only" />
                       Paciente (Prontuário Clínico)
                     </label>
                     <label className={`flex-1 flex items-center justify-center cursor-pointer border rounded-xl py-3 text-sm font-bold transition-all ${clientType === 'ALUNO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                       <input type="radio" value="ALUNO" checked={clientType === 'ALUNO'} onChange={() => setClientType('ALUNO')} className="sr-only" />
                       Aluno (Learning Insights)
                     </label>
                   </div>
                </div>
              )}

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
              
              {clientType === 'ALUNO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Nível do Aluno</label>
                    <select required value={studentLevel} onChange={e => setStudentLevel(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700">
                      <option value="" disabled>Selecione um nível</option>
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Objetivo de Aprendizado</label>
                    <input required type="text" value={studentGoal} onChange={e => setStudentGoal(e.target.value)} placeholder="Ex: Viagem, Negócios, Fluência" className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 transition-all" />
                  </div>
                </div>
              )}

              {role === 'TEACHER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Saldo de Aulas (Créditos)</label>
                  <p className="text-xs text-slate-500 mb-2">Quantas aulas o aluno tem disponíveis para agendar?</p>
                  <input type="number" step="0.5" min="0" value={classBalance} onChange={e => setClassBalance(e.target.value)} className="w-full md:w-1/3 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="ACTIVE">{clientType === 'ALUNO' ? 'Ativo' : 'Em acompanhamento (Ativo)'}</option>
                  <option value="INACTIVE">{clientType === 'ALUNO' ? 'Inativo' : 'Alta / Inativo'}</option>
                </select>
              </div>

              {clientType === 'ALUNO' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-bold text-slate-700">Acesso à Plataforma (Área do Aluno)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    Gere o link de convite ou envie por e-mail para o aluno cadastrar a senha e acessar a plataforma.
                  </p>

                  {patient?.user_id ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Conta vinculada ao e-mail: {email}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inviteLink ? (
                        <div className="bg-white p-3 border border-slate-250 rounded-xl space-y-2.5 shadow-sm">
                          <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Link de Convite Gerado:</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              readOnly 
                              value={inviteLink} 
                              className="flex-1 bg-slate-50 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-650 outline-none select-all"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink)
                                alert('Link copiado!')
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0"
                            >
                              Copiar
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            <a
                              href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Olá ${name}! Aqui está o seu link de convite para acessar o Flowike e criar sua senha de acesso: ${inviteLink}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold text-xs py-1.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.435 1.451 5.463 0 9.909-4.444 9.912-9.902.001-2.644-1.025-5.13-2.887-6.996C17.245 1.844 14.76 .818 12.115.818c-5.466 0-9.913 4.444-9.917 9.903-.001 1.994.521 3.94 1.512 5.642l-.991 3.616 3.738-.981zM17.47 15.1c-.266-.134-1.57-.775-1.815-.865-.245-.09-.423-.134-.6.134-.179.266-.692.865-.848 1.044-.156.179-.311.2-.577.067-.266-.134-1.122-.413-2.138-1.321-.79-.705-1.324-1.575-1.48-1.84-.156-.266-.017-.4-.15-.533-.12-.12-.266-.312-.4-.467-.134-.156-.179-.266-.266-.445-.089-.178-.044-.334.022-.467.067-.134.6-1.314.689-1.575.089-.265.044-.49-.022-.622-.067-.134-.6-1.567-.823-2.106-.217-.522-.456-.45-.63-.459-.161-.008-.347-.01-.532-.01s-.488.07-.743.347c-.256.278-1.023 1.002-1.023 2.445 0 1.442 1.05 2.836 1.196 3.037.147.2.2 2.074.45 2.378.1.12.186.225.267.311.134.133.256.255.385.378.363.347.79.752 1.258 1.12.568.448 1.196.793 1.83.993.424.134.805.21 1.082.253.332.052.723.041 1.004-.015.39-.079 1.197-.49 1.365-.964.167-.473.167-.88.118-.964-.05-.084-.18-.134-.446-.268z"/>
                              </svg>
                              Compartilhar no WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => setInviteLink(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-1.5 px-3 rounded-lg transition-colors shrink-0"
                            >
                              Voltar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={inviteLoading || !email}
                            onClick={() => handleInvite('EMAIL')}
                            className="bg-dark hover:bg-black text-neon font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {inviteLoading ? 'Enviando...' : 'Enviar por E-mail'}
                          </button>

                          <button
                            type="button"
                            disabled={inviteLoading || !email}
                            onClick={() => handleInvite('COPY')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copiar Link
                          </button>

                          <button
                            type="button"
                            disabled={inviteLoading || !email}
                            onClick={() => handleInvite('WHATSAPP')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Enviar WhatsApp
                          </button>
                        </div>
                      )}
                      {!email && (
                        <p className="text-[10px] text-rose-500 font-bold">
                          * Preencha o e-mail do aluno para liberar o envio do convite.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>
          )}

              {activeTab === 'NOTES' && (
            <div className="p-6 space-y-4">
              {loadingData ? (
                <div className="text-center text-slate-500 py-8">Carregando dados...</div>
              ) : notes.length === 0 ? (
                <div className="text-center text-slate-400 py-12">Nenhum prontuário encontrado.</div>
              ) : (
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center text-sm">
                        <strong className="text-slate-700">Sessão: {new Date(note.sessions.scheduled_date).toLocaleDateString('pt-BR')}</strong>
                        {note.is_signed ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-emerald-100">Assinado</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded font-semibold text-xs border border-amber-100">Rascunho de IA</span>
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

          {activeTab === 'INSIGHTS' && (
            <div className="p-6 space-y-4 bg-slate-50 min-h-full">
              {loadingData ? (
                <div className="text-center text-slate-500 py-8">Carregando insights...</div>
              ) : insights.length === 0 ? (
                <div className="text-center text-slate-400 py-12">Nenhum insight gerado para este aluno ainda. Realize uma sessão para gerar o primeiro relatório.</div>
              ) : (
                <div className="space-y-6">
                  {insights.map(insight => (
                    <div key={insight.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded mb-2 inline-block">Métricas da Sessão</span>
                            <h4 className="text-lg font-bold text-slate-800">Aula em {new Date(insight.sessions.scheduled_date).toLocaleDateString('pt-BR')}</h4>
                          </div>
                          <div className="flex space-x-3 text-center">
                             <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[70px]">
                               <div className="text-2xl font-black text-emerald-500">{insight.fluency_score}</div>
                               <div className="text-[10px] uppercase font-bold text-slate-400">Fluência</div>
                             </div>
                             <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 min-w-[70px]">
                               <div className="text-2xl font-black text-amber-500">{insight.confidence_score}</div>
                               <div className="text-[10px] uppercase font-bold text-slate-400">Confiança</div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                         <div>
                           <h5 className="text-sm font-bold text-slate-700 mb-1">Resumo da Aula</h5>
                           <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">{insight.summary}</p>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <h5 className="text-sm font-bold text-slate-700 mb-2">Erros Gramaticais</h5>
                             {Array.isArray(insight.grammar_errors) && insight.grammar_errors.map((g:any, i:number) => (
                               <div key={i} className="bg-rose-50 border border-rose-100 rounded-lg p-2 mb-2 text-xs">
                                  <span className="line-through text-rose-500 font-medium block">{g.sentence}</span>
                                  <span className="text-emerald-600 font-bold block my-1">→ {g.correction}</span>
                                  <span className="text-slate-500 italic block">{g.explanation}</span>
                               </div>
                             ))}
                             {(!insight.grammar_errors || insight.grammar_errors.length === 0) && <p className="text-xs text-slate-400">Nenhum erro registrado.</p>}
                           </div>
                           
                           <div>
                             <h5 className="text-sm font-bold text-slate-700 mb-2">Sugestões de Vocabulário</h5>
                             <div className="flex flex-wrap gap-2">
                               {Array.isArray(insight.vocabulary_suggestions) && insight.vocabulary_suggestions.map((v:string, i:number) => (
                                 <span key={i} className="px-2 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 text-xs rounded font-medium">{v}</span>
                               ))}
                             </div>
                             
                             <h5 className="text-sm font-bold text-slate-700 mb-2 mt-4">Próximos Passos (Alvo)</h5>
                             <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                                {Array.isArray(insight.next_actions) && insight.next_actions.map((v:string, i:number) => <li key={i}>{v}</li>)}
                             </ul>
                           </div>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'EXERCISES' && (
            <div className="p-6 space-y-4 bg-slate-50 min-h-full">
              {loadingData ? (
                <div className="text-center text-slate-500 py-8">Carregando exercícios...</div>
              ) : exercises.length === 0 ? (
                <div className="text-center text-slate-400 py-12">Nenhum exercício gerado ainda.</div>
              ) : (
                <div className="space-y-6">
                  {exercises.map(exGroup => (
                    <div key={exGroup.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                      <div className="mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
                         <div>
                           <h4 className="text-base font-bold text-slate-800">Prática Pós-Sessão</h4>
                           <span className="text-xs font-semibold text-slate-500">{new Date(exGroup.sessions.scheduled_date).toLocaleDateString()}</span>
                         </div>
                         <button 
                            onClick={() => window.print()}
                            className="text-xs font-bold bg-dark text-neon hover:bg-black px-4 py-2 rounded-full shadow-sm transition-all"
                         >
                            Exportar PDF
                         </button>
                      </div>
                      
                      <div className="space-y-6 print:space-y-4">
                         {Array.isArray(exGroup.exercises) && exGroup.exercises.map((e:any, idx:number) => (
                           <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${e.type === 'grammar' ? 'bg-indigo-100 text-indigo-700' : e.type === 'vocabulary' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{e.type}</span>
                             </div>
                             <p className="text-sm font-bold text-dark mb-3">{e.question}</p>
                             <details className="text-xs">
                                <summary className="cursor-pointer text-blue-600 font-semibold mb-2 outline-none">Ver Resposta & Explicação</summary>
                                <div className="pl-4 border-l-2 border-blue-200 py-1 space-y-1 mt-2">
                                  <p><span className="font-bold text-emerald-600">Resposta:</span> {e.answer}</p>
                                  <p><span className="font-bold text-slate-600">Explicação:</span> {e.explanation}</p>
                                </div>
                             </details>
                           </div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Fixado */}
        <div className="px-8 py-5 border-t border-slate-100 flex justify-end space-x-3 bg-white z-10 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold rounded-full hover:bg-slate-50 transition-colors">Cancelar</button>
          {activeTab === 'DATA' && (
            <button type="submit" form="patient-form" className="px-8 py-2.5 bg-dark hover:bg-black text-neon font-bold rounded-full shadow-md transition-all flex items-center transform hover:-translate-y-0.5">
               Salvar Ficha
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
