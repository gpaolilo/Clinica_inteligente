import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface PlanDetails {
  id: string
  name: string
  student_limit: number
  included_credits: number
  price: number
}

export function usePlanFeatures() {
  const { user, role } = useAuthStore()
  const [features, setFeatures] = useState<string[]>([])
  const [plan, setPlan] = useState<PlanDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStudentsCount, setActiveStudentsCount] = useState(0)

  useEffect(() => {
    async function loadPlanAndFeatures() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        if (role === 'ADMIN') {
          // Admins have access to all features and unlimited seats
          const { data: allFeats } = await supabase.from('features').select('id')
          setFeatures(allFeats?.map(f => f.id) || [])
          setPlan({
            id: 'admin',
            name: 'ADMIN',
            student_limit: 99999,
            included_credits: 99999,
            price: 0
          })
          setLoading(false)
          return
        }

        let teacherId = ''
        if (role === 'TEACHER' || role === 'PSYCHOLOGIST') {
          teacherId = user.id
        } else if (role === 'STUDENT' || role === 'PATIENT') {
          // Find student's teacher
          const { data: student } = await supabase
            .from('patients')
            .select('psychologist_id')
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (student?.psychologist_id) {
            teacherId = student.psychologist_id
          }
        }

        if (!teacherId) {
          setLoading(false)
          return
        }

        // Get teacher's plan
        const { data: teacher } = await supabase
          .from('psychologists')
          .select('plan_id, plan_type')
          .eq('id', teacherId)
          .single()

        let planId = teacher?.plan_id

        // Fallback: If plan_id is null, find by plan_type
        if (!planId && teacher?.plan_type) {
          const { data: fallbackPlan } = await supabase
            .from('plans')
            .select('id')
            .eq('name', teacher.plan_type.toUpperCase())
            .maybeSingle()
          planId = fallbackPlan?.id
        }

        if (planId) {
          // Fetch plan details
          const { data: planData } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single()
          
          setPlan(planData)

          // Fetch enabled features for the plan
          const { data: pf } = await supabase
            .from('plan_features')
            .select('feature_id')
            .eq('plan_id', planId)

          setFeatures(pf?.map(f => f.feature_id) || [])
        } else {
          // Default Starter features if no plan is linked
          setFeatures(['student_management', 'booking', 'homework', 'finance_dashboard'])
        }

        // Count active students (seats) for the teacher
        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('psychologist_id', teacherId)
          .eq('status', 'ACTIVE')
        
        setActiveStudentsCount(count || 0)

      } catch (err) {
        console.error('Error loading plan features:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlanAndFeatures()
  }, [user, role])

  const hasFeature = (featureId: string): boolean => {
    if (role === 'ADMIN') return true
    return features.includes(featureId)
  }

  const isSeatLimitReached = (): boolean => {
    if (!plan) return false
    return activeStudentsCount >= plan.student_limit
  }

  return {
    loading,
    plan,
    features,
    activeStudentsCount,
    hasFeature,
    isSeatLimitReached
  }
}
