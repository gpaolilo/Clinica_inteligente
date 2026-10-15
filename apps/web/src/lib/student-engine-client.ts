import { supabase } from './supabase'

const fetchApi = async (endpoint: string, body: any) => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const url = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/student-engine/${endpoint}` : `/api/student-engine/${endpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP Error ${res.status}`)
  }
  
  return res.json()
}

export const StudentEngine = {
  transcribe: async (audioUrl: string, sessionId: string, patientId: string, psychologistId: string) => {
    return await fetchApi('transcribe', { audioUrl, sessionId, patientId, psychologistId })
  },

  analyze: async (sessionId: string, patientId: string, psychologistId: string) => {
    return await fetchApi('analyze', { sessionId, patientId, psychologistId })
  },

  generateHomework: async (sessionId: string, patientId: string, psychologistId: string, config?: any) => {
    return await fetchApi('generate-homework', { sessionId, patientId, psychologistId, ...config })
  },

  getProfile: async (patientId: string) => {
    return await fetchApi('profile', { patientId })
  },

  evaluateWriting: async (question: string, userAnswer: string, studentLevel: string) => {
    return await fetchApi('evaluate-writing', { question, userAnswer, studentLevel })
  },

  generateAssessment: async (studentId: string, teacherId?: string, assessmentType: string = 'INITIAL_PLACEMENT', targetLevel?: string) => {
    return await fetchApi('generate-assessment', { studentId, teacherId, assessmentType, targetLevel })
  },

  evaluateAssessment: async (payload: { 
    assessmentId: string
    studentId: string
    grammarAnswers: Record<string, string>
    readingAnswers: Record<string, string>
    audioUrl?: string
    audioDurationSeconds?: number 
  }) => {
    return await fetchApi('evaluate-assessment', payload)
  },

  signContract: async (payload: any) => {
    return await fetchApi('sign-contract', payload)
  }
}
