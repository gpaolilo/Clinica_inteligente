import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
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
      console.error('Erro interno no handler do google POST:', err)
      return res.status(500).json({ error: err.message })
    }

  } else if (req.method === 'GET') {
    const { action, psychologist_id } = req.query
    if (!psychologist_id) {
      return res.status(400).json({ error: 'psychologist_id is required' })
    }

    if (action === 'token') {
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
        console.error('Erro no handler do google action=token:', err)
        return res.status(500).json({ error: err.message })
      }

    } else if (action === 'pull') {
      try {
        const supabaseAuth = createAuthClient(req)
        // 1. Validar autorização do solicitante (deve ser o psicólogo ou um de seus pacientes)
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
          return res.status(403).json({ error: 'Acesso proibido' })
        }

        // 2. Buscar/Renovar Token
        // Buscamos os tokens do banco
        const { data: psych, error: dbError } = await supabaseAdmin
          .from('psychologists')
          .select('google_access_token, google_refresh_token, google_token_expires_at')
          .eq('id', psychologist_id)
          .single()

        if (dbError || !psych || !psych.google_access_token) {
          return res.status(404).json({ error: 'Integração com Google Calendar não configurada para este profissional' })
        }

        let token = psych.google_access_token
        const expiresAt = psych.google_token_expires_at ? new Date(psych.google_token_expires_at).getTime() : 0
        const isExpired = expiresAt - Date.now() < 5 * 60 * 1000

        if (isExpired && psych.google_refresh_token) {
          // Renovar token
          const client_id = '1037826432340-6moimmcstt6m8dqp7hs4cia89b44rj68.apps.googleusercontent.com'
          const client_secret = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET

          if (client_secret) {
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id,
                client_secret,
                refresh_token: psych.google_refresh_token,
                grant_type: 'refresh_token'
              })
            })

            if (refreshResponse.ok) {
              const data = await refreshResponse.json()
              token = data.access_token
              const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
              
              await supabaseAdmin
                .from('psychologists')
                .update({
                  google_access_token: token,
                  ...(data.refresh_token ? { google_refresh_token: data.refresh_token } : {}),
                  google_token_expires_at: newExpiresAt
                })
                .eq('id', psychologist_id)
            }
          }
        }

        // 3. Fazer o pull dos eventos do Google Calendar
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Puxa desde 7 dias atrás
        const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // Próximos 90 dias

        const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
        
        const response = await fetch(gcalUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error('Erro ao buscar eventos do Google Calendar:', errText)
          return res.status(400).json({ error: 'Erro ao buscar eventos do Google Calendar', details: errText })
        }

        const data = await response.json()
        const events = data.items || []

        const busyEvents = events.filter((evt: any) => 
          evt.transparency !== 'transparent' && 
          evt.start?.dateTime && 
          evt.end?.dateTime
        )

        // 4. Salvar no banco usando supabaseAdmin (ignora restrições de escrita de RLS do aluno)
        if (busyEvents.length > 0) {
          const payload = busyEvents.map((evt: any) => ({
            psychologist_id,
            google_event_id: evt.id,
            summary: evt.summary || 'Evento Google',
            start_time: evt.start.dateTime,
            end_time: evt.end.dateTime
          }))

          const { error: upsertError } = await supabaseAdmin
            .from('google_calendar_events')
            .upsert(payload, { onConflict: 'psychologist_id,google_event_id' })

          if (upsertError) throw upsertError
        }

        // Limpar eventos deletados do Google
        const currentGoogleIds = busyEvents.map((e: any) => e.id)
        if (currentGoogleIds.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('google_calendar_events')
            .delete()
            .eq('psychologist_id', psychologist_id)
            .gte('start_time', timeMin)
            .not('google_event_id', 'in', `(${currentGoogleIds.join(',')})`)
            
          if (deleteError) throw deleteError
        } else {
          const { error: deleteAllError } = await supabaseAdmin
            .from('google_calendar_events')
            .delete()
            .eq('psychologist_id', psychologist_id)
            .gte('start_time', timeMin)
            
          if (deleteAllError) throw deleteAllError
        }

        return res.status(200).json({ success: true, count: busyEvents.length })

      } catch (err: any) {
        console.error('Erro interno no pull-google (google action=pull):', err)
        return res.status(500).json({ error: err.message })
      }
    } else {
      return res.status(400).json({ error: 'Ação inválida ou não especificada' })
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
