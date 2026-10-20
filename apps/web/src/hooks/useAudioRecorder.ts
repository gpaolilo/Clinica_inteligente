import { useState, useRef } from 'react'

/**
 * Detecta dinamicamente o formato de áudio suportado pelo navegador.
 * macOS Safari suporta nativamente audio/mp4 e audio/aac (não suporta audio/webm).
 * Chrome/Firefox/Edge suportam audio/webm;codecs=opus.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return ''
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav'
  ]
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return ''
}

export type RecordingSource = 'MIC_ONLY' | 'MIC_AND_TAB'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeMimeType, setActiveMimeType] = useState<string>('')
  
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerInterval = useRef<any>(null)
  
  // Guardamos as streams para encerrar depois
  const activeStreams = useRef<MediaStream[]>([])
  const audioContext = useRef<AudioContext | null>(null)

  const startRecording = async (source: RecordingSource = 'MIC_ONLY') => {
    setError(null)
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      
      activeStreams.current = []
      chunks.current = []

      const isMac = typeof navigator !== 'undefined' && 
        (navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent.toUpperCase().includes('MAC'))
      const isSafari = typeof navigator !== 'undefined' && 
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      // 1. SEMPRE requisitar o microfone primeiro com o gesto do usuário ativo
      let micStream: MediaStream
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        activeStreams.current.push(micStream)
      } catch (micErr: any) {
        console.error('Erro de permissão de microfone:', micErr)
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          const macMsg = isMac
            ? "Permissão de microfone negada. No macOS, abra 'Ajustes do Sistema > Privacidade e Segurança > Microfone' e ative a permissão para o seu navegador (Chrome/Safari), depois recarregue a página."
            : "Permissão de microfone negada. Clique no ícone de cadeado/configurações ao lado do endereço do site para permitir o microfone."
          setError(macMsg)
          throw new Error(macMsg)
        }
        throw new Error("Não foi possível acessar o microfone: " + (micErr.message || micErr.name))
      }

      let finalStream: MediaStream = micStream
      let displayStream: MediaStream | null = null

      // 2. Se o professor escolheu capturar também a Guia (Meet/Zoom)
      if (source === 'MIC_AND_TAB') {
        if (isSafari) {
          // O Safari no macOS não suporta captura de áudio da guia/tela
          console.warn("Safari no macOS não suporta captura de áudio da tela. Continuando com o microfone de alta qualidade.")
        } else if (navigator.mediaDevices?.getDisplayMedia) {
          try {
            displayStream = await navigator.mediaDevices.getDisplayMedia({ 
              video: true, 
              audio: true 
            })
            if (displayStream) {
              activeStreams.current.push(displayStream)
            }
          } catch (dispErr: any) {
            console.warn("Captura da guia foi cancelada ou não permitida. Gravando apenas o microfone da aula:", dispErr)
          }
        }

        // Verifica se há faixa de áudio na tela/guia capturada
        const sysAudioTracks = displayStream ? displayStream.getAudioTracks() : []
        if (sysAudioTracks.length > 0) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
            audioContext.current = new AudioCtx()
            
            if (audioContext.current.state === 'suspended') {
              await audioContext.current.resume().catch(console.warn)
            }

            const dest = audioContext.current.createMediaStreamDestination()
            
            const micSource = audioContext.current.createMediaStreamSource(micStream)
            micSource.connect(dest)
            
            const sysAudioStream = new MediaStream([sysAudioTracks[0]])
            const sysSource = audioContext.current.createMediaStreamSource(sysAudioStream)
            sysSource.connect(dest)
            
            finalStream = dest.stream
          } catch (mergeError) {
            console.error("Erro ao mesclar áudio da guia, gravando microfone:", mergeError)
            finalStream = micStream
          }
        } else if (displayStream) {
          // Se capturou vídeo mas não marcou 'Compartilhar áudio', para os vídeos desnecessários
          displayStream.getVideoTracks().forEach(track => track.stop())
        }
      }

      // 3. Obter MIME type compatível com o navegador (WebKit/Safari usa audio/mp4, Chromium usa audio/webm)
      const selectedMimeType = getSupportedAudioMimeType()
      setActiveMimeType(selectedMimeType)

      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : undefined
      const recorder = new MediaRecorder(finalStream, recorderOptions)
      mediaRecorder.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        const mime = recorder.mimeType || selectedMimeType || (isSafari ? 'audio/mp4' : 'audio/webm')
        const blb = new Blob(chunks.current, { type: mime })
        setAudioBlob(blb)
        setAudioUrl(URL.createObjectURL(blb))
        
        // Finaliza explicitamente todas as faixas ativas
        activeStreams.current.forEach(stream => {
          stream.getTracks().forEach(track => track.stop())
        })
        activeStreams.current = []

        if (audioContext.current && audioContext.current.state !== 'closed') {
          audioContext.current.close().catch(console.warn)
          audioContext.current = null
        }

        if (timerInterval.current) {
          clearInterval(timerInterval.current)
          timerInterval.current = null
        }
      }

      // Inicia a gravação (fatiando em chunks de 1s para estabilidade)
      recorder.start(1000)
      setIsRecording(true)
      
      setDuration(0)
      timerInterval.current = setInterval(() => setDuration(d => d + 1), 1000)

    } catch (err: any) {
      console.error('Falha ao iniciar gravação:', err)
      setError(err.message || "Falha ao iniciar gravação.")
      // Limpa faixas que possam ter ficado abertas
      activeStreams.current.forEach(stream => {
        stream.getTracks().forEach(track => track.stop())
      })
      activeStreams.current = []
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  const reset = () => {
    if (isRecording && mediaRecorder.current) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
    activeStreams.current.forEach(stream => {
      stream.getTracks().forEach(track => track.stop())
    })
    activeStreams.current = []
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close().catch(console.warn)
      audioContext.current = null
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setError(null)
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }

  return { 
    isRecording, 
    duration, 
    audioUrl, 
    audioBlob, 
    error, 
    activeMimeType, 
    startRecording, 
    stopRecording, 
    reset 
  }
}
