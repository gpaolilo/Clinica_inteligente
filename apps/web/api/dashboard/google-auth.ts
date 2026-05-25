import { supabaseAdmin } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, user_id } = req.body
  if (!code || !user_id) {
    return res.status(400).json({ error: 'code and user_id are required' })
  }

  const client_id = '1037826432340-6moimmcstt6m8dqp7hs4cia89b44rj68.apps.googleusercontent.com'
  const client_secret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET

  if (!client_secret) {
    console.error('GOOGLE_CLIENT_SECRET environment variable is missing!')
    return res.status(500).json({ error: 'Configuração do servidor ausente (GOOGLE_CLIENT_SECRET não definido)' })
  }

  try {
    // Troca o código de autorização por tokens de acesso e refresh
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri: 'postmessage', // Padrão usado pelo @react-oauth/google
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Erro ao trocar auth code por tokens:', errText)
      return res.status(400).json({ error: 'Falha na autenticação com o Google', details: errText })
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_in } = data

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Salva os tokens no registro do psicólogo
    const { error: dbError } = await supabaseAdmin
      .from('psychologists')
      .update({
        google_access_token: access_token,
        ...(refresh_token ? { google_refresh_token: refresh_token } : {}), // O refresh token só vem no primeiro consentimento
        google_token_expires_at: expiresAt
      })
      .eq('id', user_id)

    if (dbError) {
      console.error('Erro ao salvar tokens no Supabase:', dbError)
      return res.status(500).json({ error: 'Erro ao salvar tokens no banco de dados', details: dbError.message })
    }

    return res.status(200).json({
      access_token,
      expires_in
    })

  } catch (err: any) {
    console.error('Erro interno no handler do google-auth:', err)
    return res.status(500).json({ error: err.message })
  }
}
