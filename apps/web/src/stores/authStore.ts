import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'ADMIN' | 'TEACHER' | 'PSYCHOLOGIST' | 'STUDENT' | 'PATIENT'

interface AuthState {
  session: Session | null
  user: User | null
  role: UserRole | null
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  onboardingCompleted: boolean
  loading: boolean
  setSession: (session: Session | null) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  approvalStatus: null,
  onboardingCompleted: false,
  loading: true,
  setSession: async (session) => {
    const currentState = get()

    if (!session?.user) {
      set({ session: null, user: null, role: null, approvalStatus: null, onboardingCompleted: false, loading: false })
      return
    }
    
    // Se o usuário já está logado e já temos o papel dele, apenas atualiza a sessão
    if (currentState.user?.id === session.user.id && currentState.role) {
       set({ session, user: session.user, loading: false })
       return
     }

    set({ loading: true })
    
    // Buscar perfil para capturar a role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      
    const userRole = (profile?.role as UserRole) || 'PSYCHOLOGIST'
    let approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null = 'APPROVED'
    let onboardingCompleted = true

    if (userRole === 'TEACHER') {
      // 1. Buscar status da aprovação
      const { data: request } = await supabase
        .from('teacher_signup_requests')
        .select('status')
        .eq('email', session.user.email)
        .maybeSingle()

      if (request) {
        approvalStatus = request.status as 'PENDING' | 'APPROVED' | 'REJECTED'
      } else {
        // Se for um professor criado direto sem requisição (ex: por admin), considera aprovado
        approvalStatus = 'APPROVED'
      }

      // 2. Buscar progresso de onboarding
      const { data: academyProfile } = await supabase
        .from('academy_profiles')
        .select('is_published')
        .eq('teacher_id', session.user.id)
        .maybeSingle()

      onboardingCompleted = academyProfile?.is_published || false
    }
      
    set({ 
      session, 
      user: session.user, 
      role: userRole, 
      approvalStatus,
      onboardingCompleted,
      loading: false 
    })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, role: null, approvalStatus: null, onboardingCompleted: false })
  }
}))

// Inicializa a sessão e carrega perfil
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
})

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})
