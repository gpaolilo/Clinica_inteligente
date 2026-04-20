import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Caso seja fornecida a chave de service role (mais segura para ambiente servidor) a daremos prioridade
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) {
  console.warn('Variável de ambiente do Supabase não encontrada.')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey)
