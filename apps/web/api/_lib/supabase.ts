import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables in case they are not set (e.g. local dev)
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env') })

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
  
  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  })

  // Override getUser to explicitly pass the token.
  // In Supabase JS v2, auth.getUser() calls on the server do not automatically
  // read the global headers and instead default to anon key authorization,
  // returning 401. Passing the token explicitly solves this.
  const originalGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = (jwt?: string) => {
    return originalGetUser(jwt || token)
  }

  return client
}
