import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) {
  console.warn('Variável de ambiente do Supabase não encontrada.')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey)

export const createAuthClient = (req: any) => {
  const authHeader = req.headers.authorization
  const token = authHeader ? authHeader.split(' ')[1] : ''
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  })
}
