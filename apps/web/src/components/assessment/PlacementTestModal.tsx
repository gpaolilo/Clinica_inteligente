import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Mic, Square, Play, Pause, RotateCcw, ArrowRight, ArrowLeft, 
  CheckCircle2, Sparkles, Brain, Loader2, AlertCircle 
} from 'lucide-react'
import { StudentEngine } from '../../lib/student-engine-client'
import LevelRevealModal from './LevelRevealModal'

interface PlacementTestModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName?: string
  teacherId?: string
  existingAssessment?: any
  onCompleted?: (result: any) => void
}

type Step = 'INTRO' | 'READING_ALOUD' | 'GRAMMAR' | 'COMPREHENSION' | 'EVALUATING' | 'REVEAL'

export default function PlacementTestModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  teacherId,
  existingAssessment,
  onCompleted
}: PlacementTestModalProps) {
  // Test state
  const [currentStep, setCurrentStep] = useState<Step>('INTRO')
  const [loadingTest, setLoadingTest] = useState(false)
  const [testContent, setTestContent] = useState<any>(null)
  const [assessmentId, setAssessmentId] = useState<string>('')
  const [evaluationResult, setEvaluationResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  // Step 1: Audio Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [isPlayingRecordedAudio, setIsPlayingRecordedAudio] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // Step 2: Grammar state
  const [grammarIndex, setGrammarIndex] = useState(0)
  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, string>>({})

  // Step 3: Comprehension state
  const [comprehensionIndex, setComprehensionIndex] = useState(0)
  const [comprehensionAnswers, setComprehensionAnswers] = useState<Record<string, string>>({})

  // Initialize or fetch test
  useEffect(() => {
    if (!isOpen) return

    if (existingAssessment && existingAssessment.test_content?.grammar_section) {
      setAssessmentId(existingAssessment.id)
      setTestContent(existingAssessment.test_content)
      setCurrentStep('INTRO')
    } else {
      loadOrGenerateTest()
    }
  }, [isOpen, existingAssessment])

  const loadOrGenerateTest = async () => {
    setLoadingTest(true)
    setErrorMsg('')
    try {
      const res = await StudentEngine.generateAssessment(studentId, teacherId, 'INITIAL_PLACEMENT')
      if (res.assessment) {
        setAssessmentId(res.assessment.id)
        setTestContent(res.assessment.test_content)
      } else {
        throw new Error('Falha ao gerar conteúdo do teste')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao carregar teste.')
    } finally {
      setLoadingTest(false)
    }
  }

  // --- AUDIO RECORDING HANDLERS ---
  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordingDuration(0)

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } catch (err: any) {
      console.error('Microphone error:', err)
      setErrorMsg('Não foi possível acessar o microfone. Verifique as permissões do seu navegador.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const resetRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
      setIsPlayingRecordedAudio(false)
    }
    setAudioBlob(null)
    setAudioUrl('')
    setRecordingDuration(0)
  }

  const togglePlayback = () => {
    if (!audioUrl) return
    if (isPlayingRecordedAudio) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
      }
      setIsPlayingRecordedAudio(false)
    } else {
      if (!audioPlayerRef.current || audioPlayerRef.current.src !== audioUrl) {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlayingRecordedAudio(false)
        audio.onerror = () => setIsPlayingRecordedAudio(false)
        audioPlayerRef.current = audio
      }
      audioPlayerRef.current.play().catch(e => console.warn(e))
      setIsPlayingRecordedAudio(true)
    }
  }

  // Helper to convert Blob to Base64 data URL
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // Submit test for AI evaluation
  const handleSubmitEvaluation = async () => {
    setCurrentStep('EVALUATING')
    setErrorMsg('')
    try {
      let base64Audio = ''
      if (audioBlob) {
        base64Audio = await blobToBase64(audioBlob)
      }

      const res = await StudentEngine.evaluateAssessment({
        assessmentId,
        studentId,
        grammarAnswers,
        readingAnswers: comprehensionAnswers,
        audioUrl: base64Audio,
        audioDurationSeconds: recordingDuration
      })

      if (res.success) {
        setEvaluationResult(res.assessment)
        if (res.assessment?.assigned_level) {
          localStorage.setItem(`flowike_student_level_${studentId}`, res.assessment.assigned_level)
        }
        setCurrentStep('REVEAL')
      } else {
        throw new Error(res.error || 'Erro na avaliação da IA')
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao processar resultado do teste.')
      setCurrentStep('COMPREHENSION')
    }
  }

  if (!isOpen) return null

  if (currentStep === 'REVEAL' && evaluationResult) {
    return (
      <LevelRevealModal
        isOpen={true}
        onClose={() => {
          if (onCompleted) onCompleted(evaluationResult)
          onClose()
        }}
        assessment={evaluationResult}
        studentName={studentName}
      />
    )
  }

  // Grammar questions list
  const grammarQuestions = testContent?.grammar_section || []
  const currentGrammarQ = grammarQuestions[grammarIndex]

  // Comprehension questions list
  const readingPassage = testContent?.reading_comprehension?.passage || ''
  const comprehensionQuestions = testContent?.reading_comprehension?.questions || []
  const currentComprehensionQ = comprehensionQuestions[comprehensionIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200/90 rounded-[32px] shadow-2xl max-w-2xl w-full overflow-hidden my-8 relative flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
              F
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Flowike Placement Test</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {currentStep === 'INTRO' && 'Boas-vindas'}
                {currentStep === 'READING_ALOUD' && 'Etapa 1 de 3 • Leitura em Voz Alta'}
                {currentStep === 'GRAMMAR' && `Etapa 2 de 3 • Gramática (${grammarIndex + 1}/${grammarQuestions.length})`}
                {currentStep === 'COMPREHENSION' && `Etapa 3 de 3 • Interpretação (${comprehensionIndex + 1}/${comprehensionQuestions.length})`}
                {currentStep === 'EVALUATING' && 'Processando Diagnóstico com IA'}
              </p>
            </div>
          </div>

          {currentStep !== 'EVALUATING' && currentStep !== 'REVEAL' && (
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {loadingTest ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <h4 className="font-extrabold text-base text-slate-800">Preparando seu Teste de Nivelamento...</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">A IA está gerando desafios dinâmicos calibrados para calibrar seu nível CEFR.</p>
            </div>
          ) : (
            <>
              {/* STEP 0: INTRO */}
              {currentStep === 'INTRO' && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100">
                    <Sparkles className="w-10 h-10" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Descubra seu Nível Atual de Inglês</h2>
                    <p className="text-sm text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
                      Este teste rápido de 5 minutos avalia sua pronúncia real, gramática e compreensão de texto para mapear seu nível no padrão internacional **CEFR (A1 a C2)**.
                    </p>
                  </div>

                  {/* 3 Step preview cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-2">1</div>
                      <h4 className="font-black text-xs text-slate-800">Leitura em Voz Alta</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Grave seu áudio lendo um pequeno texto em inglês.</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs mb-2">2</div>
                      <h4 className="font-black text-xs text-slate-800">Gramática</h4>
                      <p className="text-[11px] text-slate-500 mt-1">5 questões interativas de múltipla escolha.</p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">3</div>
                      <h4 className="font-black text-xs text-slate-800">Interpretação</h4>
                      <p className="text-[11px] text-slate-500 mt-1">3 perguntas sobre uma leitura curta.</p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setCurrentStep('READING_ALOUD')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                    >
                      <span>Iniciar Teste de Nivelamento</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: READING ALOUD */}
              {currentStep === 'READING_ALOUD' && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                      Etapa 1 • Pronúncia & Dicção
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-2">Leia o texto abaixo em voz alta</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Leia em ritmo natural. Seu áudio será gravado para avaliar a pronúncia e guardado para comparar sua evolução no futuro!
                    </p>
                  </div>

                  {/* Reading Passage Card */}
                  <div className="bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border-2 border-indigo-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                    {testContent?.reading_aloud?.title && (
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-2">
                        {testContent.reading_aloud.title}
                      </h4>
                    )}
                    <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-serif select-text">
                      "{testContent?.reading_aloud?.text || 'English is a bridge connecting diverse cultures around the world...'}"
                    </p>
                  </div>

                  {/* Audio Recorder Controls */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                    {!audioBlob && !isRecording && (
                      <div className="space-y-3">
                        <button
                          onClick={startRecording}
                          className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-100 mx-auto cursor-pointer"
                        >
                          <Mic className="w-7 h-7" />
                        </button>
                        <p className="text-xs font-bold text-slate-700">Clique para iniciar a gravação</p>
                        <span className="text-[11px] text-slate-400 block">Certifique-se de que está em um ambiente silencioso</span>
                      </div>
                    )}

                    {isRecording && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-rose-600 font-black text-lg">
                          <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                          <span>Gravando: {recordingDuration}s</span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 mx-auto cursor-pointer shadow-md"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>Finalizar Leitura</span>
                        </button>
                      </div>
                    )}

                    {audioBlob && !isRecording && (
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-center gap-3">

                          <button
                            onClick={togglePlayback}
                            className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                          >
                            {isPlayingRecordedAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </button>
                          <div className="text-left">
                            <span className="text-xs font-black text-slate-800 block">Áudio gravado com sucesso! ({recordingDuration}s)</span>
                            <span className="text-[11px] text-slate-400 font-semibold">Ouça antes de avançar para a próxima etapa</span>
                          </div>
                        </div>

                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            onClick={resetRecording}
                            className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Gravar Novamente</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setCurrentStep('INTRO')}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <button
                      onClick={() => setCurrentStep('GRAMMAR')}
                      disabled={!audioBlob}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <span>Avançar para Gramática</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: GRAMMAR CHALLENGE */}
              {currentStep === 'GRAMMAR' && currentGrammarQ && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md">
                      Etapa 2 • Desafio de Gramática ({grammarIndex + 1} de {grammarQuestions.length})
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">Escolha a opção correta para preencher a lacuna</h3>
                  </div>

                  {/* Progress line */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-violet-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${((grammarIndex + 1) / grammarQuestions.length) * 100}%` }}
                    />
                  </div>

                  {/* Question Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
                    <p className="text-base sm:text-lg font-black text-slate-800 leading-relaxed">
                      {currentGrammarQ.question}
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentGrammarQ.options.map((opt: string, idx: number) => {
                      const isSelected = grammarAnswers[currentGrammarQ.id] === opt
                      return (
                        <button
                          key={idx}
                          onClick={() => setGrammarAnswers({ ...grammarAnswers, [currentGrammarQ.id]: opt })}
                          className={`w-full p-4 rounded-xl border text-left font-bold text-sm transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-violet-50 border-violet-500 text-violet-950 shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <span>{opt}</span>
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Grammar Navigation */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => {
                        if (grammarIndex > 0) setGrammarIndex(grammarIndex - 1)
                        else setCurrentStep('READING_ALOUD')
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <button
                      onClick={() => {
                        if (grammarIndex < grammarQuestions.length - 1) {
                          setGrammarIndex(grammarIndex + 1)
                        } else {
                          setCurrentStep('COMPREHENSION')
                        }
                      }}
                      disabled={!grammarAnswers[currentGrammarQ.id]}
                      className="px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <span>{grammarIndex < grammarQuestions.length - 1 ? 'Próxima Questão' : 'Avançar para Interpretação'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: READING COMPREHENSION */}
              {currentStep === 'COMPREHENSION' && currentComprehensionQ && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Etapa 3 • Interpretação de Texto ({comprehensionIndex + 1} de {comprehensionQuestions.length})
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">Leia o texto e responda à pergunta</h3>
                  </div>

                  {/* Reading Passage Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 max-h-40 overflow-y-auto text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                    {readingPassage}
                  </div>

                  {/* Comprehension Question Box */}
                  <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4">
                    <p className="text-sm sm:text-base font-black text-slate-800">
                      {currentComprehensionQ.question}
                    </p>
                  </div>

                  {/* Comprehension Options */}
                  <div className="space-y-2.5">
                    {currentComprehensionQ.options.map((opt: string, idx: number) => {
                      const isSelected = comprehensionAnswers[currentComprehensionQ.id] === opt
                      return (
                        <button
                          key={idx}
                          onClick={() => setComprehensionAnswers({ ...comprehensionAnswers, [currentComprehensionQ.id]: opt })}
                          className={`w-full p-4 rounded-xl border text-left font-bold text-sm transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <span>{opt}</span>
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Comprehension Navigation */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => {
                        if (comprehensionIndex > 0) setComprehensionIndex(comprehensionIndex - 1)
                        else setCurrentStep('GRAMMAR')
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    {comprehensionIndex < comprehensionQuestions.length - 1 ? (
                      <button
                        onClick={() => setComprehensionIndex(comprehensionIndex + 1)}
                        disabled={!comprehensionAnswers[currentComprehensionQ.id]}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <span>Próxima Questão</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitEvaluation}
                        disabled={!comprehensionAnswers[currentComprehensionQ.id]}
                        className="px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Concluir e Descobrir Nível</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: EVALUATING WITH AI */}
              {currentStep === 'EVALUATING' && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center animate-pulse shadow-xl shadow-indigo-100">
                    <Brain className="w-10 h-10 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Avaliando seu Desempenho...</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                    Nossa IA está correlacionando sua pronúncia, acurácia gramatical e compreensão contextual para calibrar seu nível no padrão CEFR.
                  </p>
                  <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden mt-4">
                    <div className="h-full bg-indigo-600 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '70%' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
