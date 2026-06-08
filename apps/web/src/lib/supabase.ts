import { createClient } from '@supabase/supabase-js'

// Capture invite/recovery hash before Supabase client consumes/clears it
if (typeof window !== 'undefined' && window.location.hash) {
  const hash = window.location.hash
  if (hash.includes('type=invite') || hash.includes('type=signup') || hash.includes('type=recovery')) {
    const type = hash.includes('type=invite') ? 'invite' : hash.includes('type=signup') ? 'signup' : 'recovery'
    sessionStorage.setItem('auth_hash_type', type)
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4MDAwMDAwMCwiZXhwIjoxOTk1NjE2MDAwfQ.xxx'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
