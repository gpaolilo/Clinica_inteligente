import { useState, useRef } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerInterval = useRef<any>(null)

  const startRecording = async () => {
    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorder.current = new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      
      mediaRecorder.current.onstop = () => {
        const blb = new Blob(chunks.current, { type: 'audio/webm' })
        setAudioBlob(blb)
        setAudioUrl(URL.createObjectURL(blb))
        
        stream.getTracks().forEach(track => track.stop())
        clearInterval(timerInterval.current)
      }
      
      chunks.current = []
      mediaRecorder.current.start()
      setIsRecording(true)
      
      setDuration(0)
      timerInterval.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (err) {
      console.error(err)
      alert("Acesso ao microfone foi negado pelo navegador.")
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
