import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type UserRole = 'ADMIN' | 'TEACHER' | 'PSYCHOLOGIST' | 'STUDENT' | 'PATIENT'

interface AuthState {
  session: Session | null
  user: User | null
  role: UserRole | null
  loading: boolean
  setSession: (session: Session | null) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  setSession: async (session) => {
    set({ loading: true })
    if (!session?.user) {
      set({ session: null, user: null, role: null, loading: false })
      return
    }
    
    // Buscar perfil para capturar a role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      
    // Se não encontrar (usuário antigo não migrado), assume PSYCHOLOGIST temporariamente
    set({ 
      session, 
      user: session.user, 
      role: (profile?.role as UserRole) || 'PSYCHOLOGIST', 
      loading: false 
    })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, role: null })
  }
}))

// Inicializa a sessão e carrega perfil
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
})

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})
