import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useAuthStore } from '../stores/authStore'
import { StudentEngine } from '../lib/student-engine-client'
import { StudentInsightsDashboard } from '../components/student/StudentInsightsDashboard'
import { HomeworkManager } from '../components/student/HomeworkManager'
export default function ActiveSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { isRecording, duration, audioBlob, startRecording, stopRecording } = useAudioRecorder()
  
  const [sessionData, setSessionData] = useState<any>(null)
  const [processingState, setProcessingState] = useState<'IDLE' | 'UPLOADING' | 'AI_PROCESSING' | 'DONE'>('IDLE')
  const [clinicalNote, setClinicalNote] = useState<string>("")
  const [isSigned, setIsSigned] = useState(false)
  const [aiReportReady, setAiReportReady] = useState(false)
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)

  // Formatador de tempo (00:00)
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Busca dados da sessão no load
  useEffect(() => {
    const fetchSessionAndNote = async () => {
      if (!id) return;
      // Busca a sessão base
      const { data: sessData } = await supabase.from('sessions').select('*, patient:patients(id, name, client_type, student_level, student_goal)').eq('id', id).single()
      if (sessData) setSessionData(sessData)

      if (sessData?.patient?.client_type === 'ALUNO') {
        const { data: insightData } = await supabase.from('student_insights').select('summary').eq('session_id', id).maybeSingle()
        if (insightData) {
           setClinicalNote("Relatório de Insights e Exercícios já foram extraídos pelas IAs.")
           setAiReportReady(true)
           setProcessingState('DONE')
        }
      } else {
        // Verifica se o prontuário já foi gerado anteriormente
        const { data: noteData } = await supabase.from('clinical_notes').select('ai_evolution').eq('session_id', id).maybeSingle()
        if (noteData) {
           setClinicalNote(noteData.ai_evolution)
           setProcessingState('DONE')
        }
      }
    }
    fetchSessionAndNote()
  }, [id])

  // Escutar eventos Supabase Realtime para captar quando a IA terminou
  useEffect(() => {
    if (!id || processingState !== 'AI_PROCESSING' || sessionData?.patient?.client_type === 'ALUNO') return;

    const channel = supabase.channel(`note_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clinical_notes', filter: `session_id=eq.${id}` }, (payload) => {
         setClinicalNote(payload.new.ai_evolution)
         setProcessingState('DONE')
      })
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [id, processingState, sessionData])

  const handleProcessAudio = async () => {
    const audioToProcess = audioBlob || uploadedAudio
    if (!audioToProcess || !session || !id || !sessionData) return
    setProcessingState('UPLOADING')

    try {
      setProcessingState('AI_PROCESSING')

      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
      const ASSEMBLY_KEY = import.meta.env.VITE_ASSEMBLYAI_API_KEY

      if (!GROQ_KEY || !ASSEMBLY_KEY) {
        alert("Variáveis faltando nas configs! Certifique-se de configurar VITE_GROQ_API_KEY e VITE_ASSEMBLYAI_API_KEY no .env.")
        setProcessingState('IDLE')
        return;
      }

      // 1. Upload do Áudio para AssemblyAI
      setProcessingState('UPLOADING')
      const assemHeaders = { 'Authorization': ASSEMBLY_KEY }
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: assemHeaders,
        body: audioToProcess
      })
      if (!uploadRes.ok) throw new Error("AssemblyAI Upload falhou.")
      const { upload_url } = await uploadRes.json()

      // 2. Iniciar Transcrição AssemblyAI
      setProcessingState('AI_PROCESSING')
      const transcriptReq = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { ...assemHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio_url: upload_url, 
          language_code: sessionData.patient.client_type === 'ALUNO' ? 'en' : 'pt',
          speech_models: ['universal-2'],
          speaker_labels: true
        })
      })
      if (!transcriptReq.ok) throw new Error("Transcrevendo áudio falhou.")
      const { id: transcriptId } = await transcriptReq.json()

      // 3. Polling
      let transcricaoBruta = ""
      while (true) {
        await new Promise(r => setTimeout(r, 2000))
        const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: assemHeaders })
        const pollData = await pollRes.json()
        
        if (pollData.status === 'completed') {
          if (pollData.utterances && pollData.utterances.length > 0) {
            transcricaoBruta = pollData.utterances.map((u:any) => `Speaker ${u.speaker}: ${u.text}`).join('\n')
          } else {
            transcricaoBruta = pollData.text
          }
          break
        } else if (pollData.status === 'error') {
          throw new Error("Erro na transcrição.")
        }
      }

      if (sessionData.patient.client_type === 'ALUNO') {
        setProcessingState('UPLOADING')
        const assemHeaders = { 'Authorization': ASSEMBLY_KEY }
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: assemHeaders,
          body: audioToProcess
        })
        if (!uploadRes.ok) throw new Error("AssemblyAI Upload falhou.")
        const { upload_url } = await uploadRes.json()

        setProcessingState('AI_PROCESSING')
        
        // 1. Transcribe via Edge Function
        await StudentEngine.transcribe(upload_url, id, sessionData.patient.id, session.user.id)
        
        // 2. Analyze via Edge Function
        await StudentEngine.analyze(id, sessionData.patient.id, session.user.id)

        setAiReportReady(true)
        setProcessingState('DONE')

      } else {
        // Fluxo de PACIENTES (Mantém o Original Psicanalítico)
        const gptRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            messages: [
              { 
                 role: 'system', 
                 content: 'Você é um arquiteto clínico. Receberá uma transcrição (bruta/verbal) de uma sessão psicológica. Sua missão: expurgar nomes próprios completos (Substituir por PII Mascarado), resumir as emoções cruciais e montar a entrega rigorosamente sob este molde de texto: \nEvolução Clínica (Modelo Psicanalítico)\n\nTemas Tratados:\n[Bullet points com os principais assuntos abordados na consulta]\n\nRelatório da Sessão:\n[Seu resumo detalhado da dinâmica abordada]\n\nConduta Analítica:\n[Sua recomendação e diretrizes para a próxima sessão]'
              },
              { role: 'user', content: transcricaoBruta }
            ]
          })
        })

        if (!gptRes.ok) throw new Error("A Inteligência falhou.")
        
        const gptData = await gptRes.json()
        const aiEvolutionText = gptData.choices[0].message.content

        const { error } = await supabase.from('clinical_notes').upsert({
          session_id: id,
          psychologist_id: session.user.id,
          template_type: 'PSICANALISE',
          ai_evolution: aiEvolutionText,
          status: 'AWAITING_REVIEW'
        }, { onConflict: 'session_id' })

        if (error) throw error
        setClinicalNote(aiEvolutionText)
      }

      setProcessingState('DONE')

    } catch (e: any) {
      alert("Erro ao processar: " + e.message)
      setProcessingState('IDLE')
    }
  }

  const completeSession = async () => {
    if (sessionData?.patient?.client_type === 'PACIENTE') {
      await supabase.from('clinical_notes').update({ 
        final_note: clinicalNote, 
        is_signed: true, 
        signed_at: new Date().toISOString(),
        status: 'SIGNED'
      }).eq('session_id', id)
      alert("Prontuário salvo e assinado digitalmente com sucesso!")
    } else {
      alert("Sessão finalizada! Os relatórios do Aluno estarão na aba do Cliente.")
    }

    await supabase.from('sessions').update({ status: 'COMPLETED' }).eq('id', id)
    setIsSigned(true)
    navigate('/dashboard/agenda')
  }

  if (!sessionData) return <div className="p-8 text-center text-slate-500">Localizando informações...</div>

  const isAluno = sessionData?.patient?.client_type === 'ALUNO'
  const clientName = Array.isArray(sessionData.patient) ? sessionData.patient[0]?.name : sessionData.patient?.name

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className={`text-xs font-bold tracking-wider uppercase mb-1 px-2 py-0.5 inline-block rounded ${isAluno ? 'bg-blue-100 text-blue-700' : 'bg-neon text-dark'}`}>
             Sessão em Andamento ({isAluno ? 'Aluno' : 'Paciente'})
          </h2>
          <h1 className="text-3xl font-extrabold text-dark tracking-tight">{clientName}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500">Horário Agendado</p>
          <p className="text-xl font-bold text-dark">{new Date(sessionData.scheduled_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo - Gravador */}
        <div className="lg:col-span-1 bg-surface rounded-[24px] shadow-sm p-8 flex flex-col items-center justify-center relative border border-slate-100">
          
          {processingState === 'DONE' ? (
             <div className="text-center w-full">
               <div className="w-16 h-16 mx-auto bg-neon text-dark rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
               </div>
               <h3 className="text-lg font-bold text-dark mb-1">Processamento Finalizado</h3>
               <p className="text-slate-500 text-sm font-medium">A IA extraiu o áudio com sucesso.</p>
             </div>
          ) : (
            <div className="w-full flex flex-col items-center">
             <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-sm transition-all duration-300 ${isRecording ? 'bg-rose-100 motion-safe:animate-pulse scale-110' : 'bg-background border border-slate-100'}`}>
                <svg className={`w-12 h-12 ${isRecording ? 'text-rose-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
             </div>
             
             <div className="text-4xl font-mono text-dark mb-8 font-extrabold tracking-widest">
               {formatTime(duration)}
             </div>

             {processingState !== 'IDLE' ? (
                <div className="bg-background border border-slate-200 rounded-2xl p-4 text-center shadow-inner w-full">
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    A IA Whisper está escrutinando o áudio e redigindo sua evolução.
                    <br/><br/><span className="text-neon block font-bold py-1 px-3 bg-dark rounded-lg inline-block">Aguarde na sala...</span>
                  </p>
                </div>
             ) : (
                <div className="w-full space-y-3">
                  {isRecording ? (
                    <button onClick={stopRecording} className="w-full py-3 bg-dark hover:bg-black text-white font-bold rounded-full transition-all shadow-md">
                      Pausar Gravação
                    </button>
                  ) : (
                    <>
                      <button onClick={startRecording} className={`w-full py-3 text-dark font-bold rounded-full transition-all shadow-sm ${isAluno ? 'bg-blue-300 hover:bg-blue-400' : 'bg-neon hover:bg-[#c4f83b]'}`}>
                        {audioBlob ? 'Regravar Áudio' : 'Gravar Sessão'}
                      </button>
                      
                      {!audioBlob && (
                        <label className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-500 font-bold rounded-full transition-all flex items-center justify-center cursor-pointer">
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadedAudio(e.target.files[0])
                              }
                            }}
                          />
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                          Upload de Áudio
                        </label>
                      )}

                      {uploadedAudio && !audioBlob && (
                         <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <span className="text-sm text-slate-600 truncate mr-2">{uploadedAudio.name}</span>
                           <button onClick={() => setUploadedAudio(null)} className="text-red-500 hover:text-red-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                           </button>
                         </div>
                      )}
                    </>
                  )}

                  {(audioBlob || uploadedAudio) && !isRecording && (
                    <button onClick={handleProcessAudio} className="w-full py-3 bg-dark hover:bg-black text-white font-bold rounded-full transition-all shadow-md mt-4 flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      {isAluno ? 'Gerar Insights (Engine)' : 'Gerar Evolução (IA)'}
                    </button>
                  )}
                </div>
             )}
            </div>
          )}
        </div>

        {/* Painel Direito - Tela de Edição/Informações */}
        <div className="lg:col-span-2 bg-surface rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="font-bold text-dark text-lg">{isAluno ? "Relatório Final (Geração Estática)" : "Editor do Prontuário"}</h3>
            <span className="text-xs font-bold text-slate-500 bg-background px-3 py-1.5 rounded-full">LLaMA 3 (Groq API)</span>
          </div>
          
          <div className="flex-1 p-6 relative bg-background overflow-y-auto">
             {(processingState === 'UPLOADING' || processingState === 'AI_PROCESSING') && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center">
                   <div className="w-12 h-12 border-4 border-slate-200 border-t-neon rounded-full animate-spin mb-4"></div>
                   <p className="text-dark font-bold text-lg">Acelerando sua rotina em minutos...</p>
                </div>
             )}
             
             {isAluno ? (
               processingState === 'DONE' ? (
                 <div className="space-y-6">
                   <StudentInsightsDashboard patientId={sessionData.patient.id} />
                   <HomeworkManager sessionId={id} patientId={sessionData.patient.id} psychologistId={session?.user?.id} />
                 </div>
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
                   Aguardando transcrição e Learning Insights Engine...
                 </div>
               )
             ) : (
               <textarea 
                  value={clinicalNote}
                  onChange={e => setClinicalNote(e.target.value)}
                  placeholder={processingState === 'IDLE' ? 'Aguardando transcrição e inteligência artificial...' : ''}
                  className="w-full h-full p-6 bg-white border border-slate-200 rounded-2xl outline-none resize-none text-slate-700 leading-relaxed font-sans shadow-sm focus:ring-2 focus:ring-neon"
               />
             )}
          </div>
          
          <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-white">
             {isAluno ? (
               <button 
                 onClick={completeSession}
                 disabled={!aiReportReady || isSigned}
                 className="px-6 py-2.5 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white font-extrabold rounded-full shadow-md transition-all flex items-center"
               >
                 Avançar e Concluir Aula
               </button>
             ) : (
               <>
                 <button disabled={!clinicalNote} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-background rounded-full transition-colors disabled:opacity-50">
                   Salvar Rascunho
                 </button>
                 <button 
                   onClick={completeSession}
                   disabled={!clinicalNote || processingState !== 'DONE' || isSigned}
                   className="px-6 py-2.5 bg-dark disabled:opacity-50 hover:bg-black text-neon font-extrabold rounded-full shadow-md transition-all flex items-center"
                 >
                   <svg className="w-5 h-5 mr-2 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                   Assinar Prontuário
                 </button>
               </>
             )}
          </div>
        </div>

      </div>
    </div>
  )
}
