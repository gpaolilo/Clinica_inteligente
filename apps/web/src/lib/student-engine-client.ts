import { supabase } from './supabase'

export const StudentEngine = {
  transcribe: async (audioUrl: string, sessionId: string, patientId: string, psychologistId: string) => {
    const { data, error } = await supabase.functions.invoke('student-engine-transcribe', {
      body: { audioUrl, sessionId, patientId, psychologistId }
    })
    if (error) throw error
    return data
  },

  analyze: async (sessionId: string, patientId: string, psychologistId: string) => {
    const { data, error } = await supabase.functions.invoke('student-engine-analyze', {
      body: { sessionId, patientId, psychologistId }
    })
    if (error) throw error
    return data
  },

  generateHomework: async (sessionId: string, patientId: string, psychologistId: string) => {
    const { data, error } = await supabase.functions.invoke('student-engine-generate-homework', {
      body: { sessionId, patientId, psychologistId }
    })
    if (error) throw error
    return data
  },

  getProfile: async (patientId: string) => {
    const { data, error } = await supabase.functions.invoke('student-engine-profile', {
      body: { patientId }
    })
    if (error) throw error
    return data
  }
}
