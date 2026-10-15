import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface StudentStatus {
  loading: boolean
  patient: any | null
  isContractSigned: boolean
  isLevelAssessmentCompleted: boolean
  isLevelAssessmentSkipped: boolean
  assessments: any[]
  skipLevelCheck: () => void
  refresh: () => Promise<void>
}

export function useStudentStatus(): StudentStatus {
  const { session, role } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<any | null>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [isLevelAssessmentSkipped, setIsLevelAssessmentSkipped] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      // 1. Fetch patient record for this user
      let { data: patientRecord } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      // Fallback: If not found by user_id, check by email and link user_id
      if (!patientRecord && session.user.email) {
        const { data: byEmail } = await supabase
          .from('patients')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle()

        if (byEmail) {
          await supabase
            .from('patients')
            .update({ user_id: session.user.id })
            .eq('id', byEmail.id)
          patientRecord = { ...byEmail, user_id: session.user.id }
        }
      }

      setPatient(patientRecord)

      // 2. Fetch level assessments if patient exists
      if (patientRecord?.id) {
        const { data: assessData } = await supabase
          .from('level_assessments')
          .select('*')
          .eq('student_id', patientRecord.id)
          .order('created_at', { ascending: false })

        const list = assessData || []
        setAssessments(list)

        // Check localStorage for skip status
        const skipped = localStorage.getItem(`flowike_level_check_skipped_${patientRecord.id}`) === 'true'
        setIsLevelAssessmentSkipped(skipped)
      }
    } catch (err) {
      console.error('Error fetching student onboarding status:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, session?.user?.email])

  useEffect(() => {
    if (role === 'STUDENT' || role === 'PATIENT') {
      fetchStatus()
    } else {
      setLoading(false)
    }
  }, [role, fetchStatus])

  const skipLevelCheck = useCallback(() => {
    if (patient?.id) {
      localStorage.setItem(`flowike_level_check_skipped_${patient.id}`, 'true')
    }
    setIsLevelAssessmentSkipped(true)
  }, [patient?.id])

  const isContractSigned = Boolean(patient?.contract_signed)
  const isLevelAssessmentCompleted = assessments.some((a) => a.status === 'COMPLETED')

  return {
    loading,
    patient,
    isContractSigned,
    isLevelAssessmentCompleted,
    isLevelAssessmentSkipped,
    assessments,
    skipLevelCheck,
    refresh: fetchStatus
  }
}
