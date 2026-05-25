import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { psychologist_id } = req.query
  if (!psychologist_id) {
    return res.status(400).json({ error: 'psychologist_id is required' })
  }

  try {
    const supabaseAuth = createAuthClient(req)
    // Verifica se quem está solicitando tem autorização:
    // Deve ser o próprio profissional OU um aluno atrelado a esse profissional.
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    const isSelf = user.id === psychologist_id
    let isPatient = false

    if (!isSelf) {
      const { data: patient } = await supabaseAuth
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .eq('psychologist_id', psychologist_id)
        .maybeSingle()
      
      if (patient) {
        isPatient = true
      }
    }

    if (!isSelf && !isPatient) {
      return res.status(403).json({ error: 'Acesso proibido para esta agenda' })
    }

    // Busca os tokens salvos no banco
    const { data: psych, error } = await supabaseAdmin
      .from('psychologists')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', psychologist_id)
      .single()

    if (error || !psych) {
      return res.status(404).json({ error: 'Profissional não encontrado' })
    }

    const { google_access_token, google_refresh_token, google_token_expires_at } = psych

    if (!google_access_token) {
      return res.status(404).json({ error: 'Integração com Google Calendar não configurada' })
    }

    // Verifica se está expirado (ou prestes a expirar nos próximos 5 minutos)
    const expiresAt = google_token_expires_at ? new Date(google_token_expires_at).getTime() : 0
    const isExpired = expiresAt - Date.now() < 5 * 60 * 1000

    if (!isExpired) {
      return res.status(200).json({ access_token: google_access_token })
    }

    // Se expirou, tenta usar o refresh token
    if (!google_refresh_token) {
      return res.status(401).json({ error: 'Sessão expirada. Reconecte sua conta Google.' })
    }

    const client_id = '1037826432340-6moimmcstt6m8dqp7hs4cia89b44rj68.apps.googleusercontent.com'
    const client_secret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET

    if (!client_secret) {
      console.error('GOOGLE_CLIENT_SECRET environment variable is missing!')
      return res.status(500).json({ error: 'Erro de configuração no servidor (GOOGLE_CLIENT_SECRET ausente)' })
    }

    // Renova o token na API do Google
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        refresh_token: google_refresh_token,
        grant_type: 'refresh_token'
      })
    })

    if (!refreshResponse.ok) {
      const errText = await refreshResponse.text()
      console.error('Erro ao renovar token com o Google:', errText)
      return res.status(400).json({ error: 'Erro ao renovar sessão do Google Calendar', details: errText })
    }

    const data = await refreshResponse.json()
    const { access_token, expires_in, refresh_token: new_refresh_token } = data

    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Salva os novos tokens no banco
    const { error: updateError } = await supabaseAdmin
      .from('psychologists')
      .update({
        google_access_token: access_token,
        ...(new_refresh_token ? { google_refresh_token: new_refresh_token } : {}),
        google_token_expires_at: newExpiresAt
      })
      .eq('id', psychologist_id)

    if (updateError) {
      console.error('Erro ao salvar novos tokens no banco:', updateError)
    }

    return res.status(200).json({ access_token })

  } catch (err: any) {
    console.error('Erro no handler do google-token:', err)
    return res.status(500).json({ error: err.message })
  }
}
