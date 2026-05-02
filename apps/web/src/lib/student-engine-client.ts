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

  generateHomework: async (sessionId: string, patientId: string, psychologistId: string) => {
    return await fetchApi('generate-homework', { sessionId, patientId, psychologistId })
  },

  getProfile: async (patientId: string) => {
    return await fetchApi('profile', { patientId })
  }
}
