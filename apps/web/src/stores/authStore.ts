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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  setSession: async (session) => {
    const currentState = get()

    if (!session?.user) {
      set({ session: null, user: null, role: null, loading: false })
      return
    }
    
    // Se o usuário já está logado e já temos o papel dele, apenas atualiza a sessão
    // Isso evita definir `loading: true` durante refreshes de token (ex: ao voltar para a aba),
    // o que desmontaria toda a árvore de componentes e faria a gravação ser perdida.
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
