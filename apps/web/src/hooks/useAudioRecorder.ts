import { useState, useRef } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerInterval = useRef<any>(null)
  
  // Guardamos as streams para encerrar depois
  const activeStreams = useRef<MediaStream[]>([])
  const audioContext = useRef<AudioContext | null>(null)

  const startRecording = async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      
      activeStreams.current = []
      
      // Resolve conflitos de navegadores entre getDisplayMedia e getUserMedia
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      let micStream: MediaStream;
      let displayStream: MediaStream | null = null;

      try {
        if (isSafari) {
           // No Safari, o getDisplayMedia deve ser a PRIMEIRA operação, senão o user gesture expira.
           try {
              displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
              if (displayStream) activeStreams.current.push(displayStream)
           } catch (e) { console.warn("Captura de tela cancelada no Safari.") }

           micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
           activeStreams.current.push(micStream)
        } else {
           // No Chrome/Edge, pedimos o microfone PRIMEIRO. Se pedirmos simultaneamente ou depois, 
           // o prompt pode ser rejeitado instantaneamente ou falhar porque a aba foi para background.
           micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
           activeStreams.current.push(micStream)

           try {
              displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
              if (displayStream) activeStreams.current.push(displayStream)
           } catch (e) { console.warn("Captura de tela cancelada no Chrome/Edge.") }
        }
      } catch (err: any) {
         throw new Error("Permissão de câmera/microfone negada. Detalhes: " + err.message);
      }

      // 4. Verifica se o usuário de fato compartilhou o Áudio na Guia
      const hasSystemAudio = displayStream && displayStream.getAudioTracks().length > 0;

      let finalStream = micStream;

      if (hasSystemAudio) {
         try {
           // Cria o pipeline de WebAudio para mesclar microfone e guia
           audioContext.current = new AudioContext()
           
           if (audioContext.current.state === 'suspended') {
             audioContext.current.resume().catch(console.warn)
           }

           const dest = audioContext.current.createMediaStreamDestination()
           
           const micSource = audioContext.current.createMediaStreamSource(micStream)
           micSource.connect(dest)
           
           const sysAudioTrack = displayStream!.getAudioTracks()[0]
           const sysAudioStream = new MediaStream([sysAudioTrack])
           const sysSource = audioContext.current.createMediaStreamSource(sysAudioStream)
           sysSource.connect(dest)
           
           finalStream = dest.stream
         } catch (mergeError) {
           console.error("Erro ao mesclar áudios, gravando apenas microfone:", mergeError)
           finalStream = micStream;
         }
      }

      mediaRecorder.current = new MediaRecorder(finalStream)
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      
      mediaRecorder.current.onstop = () => {
        const blb = new Blob(chunks.current, { type: 'audio/webm' })
        setAudioBlob(blb)
        setAudioUrl(URL.createObjectURL(blb))
        
        // Finaliza explicitamente todas as tracks envolvidas
        activeStreams.current.forEach(stream => {
           stream.getTracks().forEach(track => track.stop())
        })
        if (audioContext.current) {
           audioContext.current.close()
        }
        clearInterval(timerInterval.current)
      }
      
      chunks.current = []
      mediaRecorder.current.start()
      setIsRecording(true)
      
      setDuration(0)
      timerInterval.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (err: any) {
      console.error(err)
      alert("Falha ao iniciar gravação. " + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  const reset = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    if (timerInterval.current) clearInterval(timerInterval.current)
  }

  return { isRecording, duration, audioUrl, audioBlob, startRecording, stopRecording, reset }
}
