import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export default function PatientModal({ patient, onClose, onSaved }: any) {
  const { session } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'DATA' | 'NOTES' | 'INSIGHTS' | 'EXERCISES'>('DATA')
  const [name, setName] = useState(patient?.name || '')
  const [email, setEmail] = useState(patient?.email || '')
  const [phone, setPhone] = useState(patient?.phone || '')
  const [status, setStatus] = useState(patient?.status || 'ACTIVE')
  
  // Novos estados do PRD de Alunos
  const [clientType, setClientType] = useState<'PACIENTE'|'ALUNO'>(patient?.client_type || 'PACIENTE')
  const [studentLevel, setStudentLevel] = useState(patient?.student_level || '')
  const [studentGoal, setStudentGoal] = useState(patient?.student_goal || '')

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
           // Fetch Insights
           const { data: iData, error: iErr } = await supabase.from('student_insights')
             .select('*, sessions!inner(scheduled_date)')
             .eq('patient_id', patient.id)
             .order('created_at', { ascending: false })
           if (!iErr) setInsights(iData || [])
           
           // Fetch Exercícios
           const { data: eData, error: eErr } = await supabase.from('student_exercises')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return;
    const psychologist_id = session.user.id;
    
    const payload = { 
      name, 
      email, 
      phone, 
      status, 
      client_type: clientType,
      student_level: clientType === 'ALUNO' ? studentLevel : null,
      student_goal: clientType === 'ALUNO' ? studentGoal : null
    }

    if (patient) {
      await supabase.from('patients').update(payload).eq('id', patient.id)
    } else {
      await supabase.from('patients').insert([{ ...payload, psychologist_id }])
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Header com Abas */}
        <div className="px-8 py-5 flex justify-between items-center bg-white border-b border-slate-100">
          <div className="flex items-center space-x-6">
            <h3 className="text-2xl font-bold text-dark tracking-tight">{patient ? 'Detalhes do Cliente' : 'Novo Cliente'}</h3>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="ACTIVE">Em acompanhamento (Ativo)</option>
                  <option value="INACTIVE">Alta / Inativo</option>
                </select>
              </div>
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
                         <h4 className="text-base font-bold text-slate-800">Prática Pós-Sessão</h4>
                         <span className="text-xs font-semibold text-slate-500">{new Date(exGroup.sessions.scheduled_date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="space-y-6">
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
