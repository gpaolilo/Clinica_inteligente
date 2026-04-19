import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useAuthStore } from '../stores/authStore'

export default function ActiveSession() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuthStore()
  const { isRecording, duration, audioBlob, startRecording, stopRecording } = useAudioRecorder()
  
  const [sessionData, setSessionData] = useState<any>(null)
  const [processingState, setProcessingState] = useState<'IDLE' | 'UPLOADING' | 'AI_PROCESSING' | 'DONE'>('IDLE')
  const [clinicalNote, setClinicalNote] = useState<string>("")
  const [isSigned, setIsSigned] = useState(false)

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
      const { data: sessData } = await supabase.from('sessions').select('*, patient:patients(name)').eq('id', id).single()
      if (sessData) setSessionData(sessData)

      // Verifica se o prontuário já foi gerado anteriormente
      const { data: noteData } = await supabase.from('clinical_notes').select('ai_evolution').eq('session_id', id).maybeSingle()
      if (noteData) {
         setClinicalNote(noteData.ai_evolution)
         setProcessingState('DONE')
      }
    }
    fetchSessionAndNote()
  }, [id])

  // Escutar eventos Supabase Realtime para captar quando a IA terminou
  useEffect(() => {
    if (!id || processingState !== 'AI_PROCESSING') return;

    const channel = supabase.channel(`note_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clinical_notes', filter: `session_id=eq.${id}` }, (payload) => {
         setClinicalNote(payload.new.ai_evolution)
         setProcessingState('DONE')
      })
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [id, processingState])

  const handleProcessAudio = async () => {
    if (!audioBlob || !session || !id) return
    setProcessingState('UPLOADING')

    try {
      // O path de upload original real seria:
      // const filename = `${session.user.id}/${id}_${Date.now()}.webm`
      // await supabase.storage.from('clinical_audios').upload(filename, audioBlob)
      
      setProcessingState('AI_PROCESSING')

      const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

      if (!OPENAI_KEY || OPENAI_KEY === '' || OPENAI_KEY.startsWith('sk-') === false) {
        alert("Para usar a IA Real, vá no arquivo apps/web/.env, crie a variável VITE_OPENAI_API_KEY=sk-... e coloque sua chave!")
        // Reverte o estado pra não travar
        setProcessingState('IDLE')
        return;
      }

      // 1. Transcrever usando OpenAI Whisper
      setProcessingState('UPLOADING')
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'pt')

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
        body: formData
      })

      if (!whisperRes.ok) throw new Error("Whisper falhou: " + await whisperRes.text())
      const { text: transcricaoBruta } = await whisperRes.json()

      // 2. Estruturar usando OpenAI Chat Completions (GPT)
      setProcessingState('AI_PROCESSING')
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.7,
          messages: [
            { 
               role: 'system', 
               content: 'Você é um arquiteto clínico. Receberá uma transcrição (bruta/verbal) de uma sessão psicológica. Sua missão: expurgar nomes próprios completos (Substituir por PII Mascarado), resumir as emoções cruciais e montar a entrega rigorosamente sob este molde de texto: \nEvolução Clínica (Modelo Psicanalítico)\n\nRelatório da Sessão:\n[Seu resumo]\n\nConduta Analítica:\n[Sua recomendação e encaminhamento clínico]'
            },
            { role: 'user', content: transcricaoBruta }
          ]
        })
      })

      if (!gptRes.ok) throw new Error("GPT falhou: " + await gptRes.text())
      
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
      // O Supabase Realtime (WebSocket) irá detectar isso no useEffect acima 
      // e transmutar o state para "DONE" exibindo a edição do texto!

    } catch (e: any) {
      alert("Erro ao processar: " + e.message)
      setProcessingState('IDLE')
    }
  }

  const signNote = async () => {
    // Registra carimbo juridico e atualiza
    await supabase.from('clinical_notes').update({ 
      final_note: clinicalNote, 
      is_signed: true, 
      signed_at: new Date().toISOString(),
      status: 'SIGNED'
    }).eq('session_id', id)

    await supabase.from('sessions').update({ status: 'COMPLETED' }).eq('id', id)
    setIsSigned(true)
    alert("Prontuário salvo e assinado digitalmente com sucesso!")
    navigate('/dashboard/agenda')
  }

  if (!sessionData) return <div className="p-8 text-center text-slate-500">Localizando informações da consulta...</div>

  const patientName = Array.isArray(sessionData.patient) ? sessionData.patient[0]?.name : sessionData.patient?.name

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <span className="text-primary-600 font-bold text-xs uppercase tracking-wider mb-1 block">Sessão em Andamento</span>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{patientName}</h2>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-slate-400 block">Horário Agendado</span>
          <strong className="text-slate-800">{new Date(sessionData.scheduled_date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel Lateral - Gravador */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-md transition-all ${isRecording ? 'bg-rose-100 shadow-rose-200 animate-pulse' : 'bg-slate-100'}`}>
            <svg className={`w-12 h-12 ${isRecording ? 'text-rose-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          </div>
          
          <div className="text-4xl font-mono text-slate-700 tracking-widest mb-8">
            {formatTime(duration)}
          </div>

          <div className="w-full space-y-3">
             {processingState !== 'IDLE' ? (
                <div className="bg-sky-50 border border-sky-200 text-sky-700 p-4 rounded-xl text-center text-sm font-medium">
                  {processingState === 'UPLOADING' && 'Enviando áudio criptografado...'}
                  {processingState === 'AI_PROCESSING' && 'A IA Whisper está escrutinando o áudio e redigindo sua evolução. Aguarde na sala...'}
                  {processingState === 'DONE' && 'Processamento finalizado com sucesso!'}
                </div>
             ) : (
                <>
                  {!isRecording ? (
                    <button onClick={startRecording} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                      ● Gravar Consulta
                    </button>
                  ) : (
                    <button onClick={stopRecording} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                      ■ Parar Gravação
                    </button>
                  )}

                  {audioBlob && !isRecording && (
                    <button onClick={handleProcessAudio} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors shadow-md shadow-emerald-500/20 mt-4 flex items-center justify-center">
                       <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                       Gerar Evolução com IA
                    </button>
                  )}
                </>
             )}
          </div>
        </div>

        {/* Painel Principal - Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="border-b border-slate-100 p-4 bg-slate-50 rounded-t-2xl flex justify-between items-center">
            <span className="font-semibold text-slate-700">Editor do Prontuário</span>
            <span className="text-xs font-medium bg-white border px-2 py-1 rounded text-slate-500">Modelo: Psicanálise</span>
          </div>
          
          <div className="p-6 flex-1 min-h-[400px]">
             {processingState === 'AI_PROCESSING' ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <svg className="w-10 h-10 mb-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p>Acelerando sua rotina em minutos...</p>
                </div>
             ) : clinicalNote ? (
                <textarea 
                  className="w-full h-full p-0 border-0 outline-none resize-none text-slate-700 leading-relaxed bg-transparent"
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  placeholder="Edite a evolução gerada..."
                />
             ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-center px-8">
                  Grave o áudio passivamente durante a sessão ou submeta anotações em aúdio para a IA estruturar o preenchimento legal.
                </div>
             )}
          </div>

          <div className="border-t border-slate-100 p-4 flex justify-end space-x-3 bg-slate-50 rounded-b-2xl">
             <button className="px-5 py-2 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors">
               Salvar Rascunho
             </button>
             <button 
               onClick={signNote}
               disabled={!clinicalNote || processingState !== 'DONE' || isSigned}
               className="px-5 py-2 bg-primary-600 disabled:opacity-50 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center"
             >
               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
               Assinar Prontuário
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
