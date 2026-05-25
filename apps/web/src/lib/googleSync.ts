import { supabase } from './supabase'

export const fetchValidGoogleToken = async (psychologist_id: string): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession()
    const sessionToken = data.session?.access_token
    
    const response = await fetch(`/api/dashboard/google?action=token&psychologist_id=${psychologist_id}`, {
      headers: {
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
      }
    })
    
    if (response.ok) {
      const body = await response.json()
      return body.access_token
    }
    return null
  } catch (err) {
    console.error('Erro ao buscar google-token no backend:', err)
    return null
  }
}

export const syncPendingSessions = async (token: string | null, psychologist_id: string) => {
  try {
    let activeToken = token
    if (!activeToken) {
      activeToken = await fetchValidGoogleToken(psychologist_id)
    }
    if (!activeToken) {
      console.warn('Sincronização abortada: sem token válido para o Google Calendar.')
      return
    }

    const now = new Date().toISOString()
    
    // 1. Busca sessões futuras que ainda não tem google_event_id
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id, 
        scheduled_date, 
        patient:patients(name)
      `)
      .eq('psychologist_id', psychologist_id)
      .eq('status', 'SCHEDULED')
      .is('google_event_id', null)
      .gte('scheduled_date', now)

    if (error) {
      console.error('Erro ao buscar sessões pendentes para sync', error)
    } else if (sessions && sessions.length > 0) {
      console.log(`Encontradas ${sessions.length} sessões para sincronizar com o Google Calendar...`)

      for (const session of sessions) {
        const startDateTime = new Date(session.scheduled_date)
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000) // +1 hora
        
        const patientName = Array.isArray(session.patient) 
          ? session.patient[0]?.name 
          : (session.patient as any)?.name || 'Paciente'

        // Cria no Google Calendar
        const gcalResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `Sessão com ${patientName}`,
            description: 'Sessão sincronizada via Clinica.ia',
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() }
          })
        })

        if (gcalResponse.ok) {
          const event = await gcalResponse.json()
          
          // Atualiza no banco
          await supabase
            .from('sessions')
            .update({ google_event_id: event.id })
            .eq('id', session.id)
            
          console.log(`Sessão ${session.id} sincronizada com sucesso.`)
        } else {
          console.error(`Falha ao sincronizar sessão ${session.id}`, await gcalResponse.text())
        }
      }
    }

    // 2. Busca sessões que foram canceladas mas ainda têm o google_event_id ativo
    const { data: cancelledSessions, error: cancelError } = await supabase
      .from('sessions')
      .select('id, google_event_id')
      .eq('psychologist_id', psychologist_id)
      .eq('status', 'CANCELLED')
      .not('google_event_id', 'is', null)

    if (cancelError) {
      console.error('Erro ao buscar sessões canceladas para sync', cancelError)
    } else if (cancelledSessions && cancelledSessions.length > 0) {
      console.log(`Encontradas ${cancelledSessions.length} sessões canceladas para limpar no Google Calendar...`)

      for (const session of cancelledSessions) {
        if (!session.google_event_id) continue

        const gcalResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${session.google_event_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        })

        // 204 No Content, 404 Not Found ou OK são sucessos aceitáveis para limpeza
        if (gcalResponse.status === 204 || gcalResponse.status === 404 || gcalResponse.ok) {
          await supabase
            .from('sessions')
            .update({ google_event_id: null })
            .eq('id', session.id)
          console.log(`Evento Google ${session.google_event_id} removido e sessão ${session.id} atualizada.`)
        } else {
          console.error(`Falha ao remover evento Google ${session.google_event_id}`, await gcalResponse.text())
        }
      }
    }
  } catch (err) {
    console.error('Erro no processo de sync automático:', err)
  }
}

export const pullGoogleEvents = async (token: string | null, psychologist_id: string) => {
  try {
    let activeToken = token
    if (!activeToken) {
      activeToken = await fetchValidGoogleToken(psychologist_id)
    }
    if (!activeToken) {
      console.warn('Pull abortado: sem token válido para o Google Calendar.')
      return
    }

    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Puxa dos últimos 7 dias para abranger a semana atual
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // Próximos 90 dias

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${activeToken}`
      }
    })

    if (!response.ok) {
      console.error('Erro ao buscar eventos do Google Calendar', await response.text())
      return
    }

    const data = await response.json()
    const events = data.items || []

    // Filtrar apenas eventos que ocupam tempo (transparent = livre) e têm data de início/fim claras
    const busyEvents = events.filter((evt: any) => 
      evt.transparency !== 'transparent' && 
      evt.start?.dateTime && 
      evt.end?.dateTime
    )

    if (busyEvents.length === 0) {
      console.log('Nenhum evento ocupado encontrado no Google Calendar.')
    } else {
      console.log(`Sincronizando ${busyEvents.length} eventos do Google Calendar para o app...`)
      
      const payload = busyEvents.map((evt: any) => ({
        psychologist_id,
        google_event_id: evt.id,
        summary: evt.summary || 'Evento Google',
        start_time: evt.start.dateTime,
        end_time: evt.end.dateTime
      }))

      // Upsert: como criamos o índice único em (psychologist_id, google_event_id), podemos usar onConflict
      const { error } = await supabase
        .from('google_calendar_events')
        .upsert(payload, { onConflict: 'psychologist_id,google_event_id' })

      if (error) {
        console.error('Erro ao salvar eventos do Google no banco:', error)
      } else {
        console.log('Eventos sincronizados com sucesso.')
      }
    }
    
    // Opcional: remover eventos deletados (que estão no banco mas não vieram na resposta)
    // Extraímos os IDs que recebemos agora:
    const currentGoogleIds = busyEvents.map((e: any) => e.id)
    
    if (currentGoogleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('google_calendar_events')
        .delete()
        .eq('psychologist_id', psychologist_id)
        .gte('start_time', timeMin)
        .not('google_event_id', 'in', `(${currentGoogleIds.join(',')})`)
        
      if (deleteError) {
        console.error('Erro ao limpar eventos deletados:', deleteError)
      }
    } else {
      // Se não há eventos, deletar todos a partir de agora
      const { error: deleteAllError } = await supabase
        .from('google_calendar_events')
        .delete()
        .eq('psychologist_id', psychologist_id)
        .gte('start_time', timeMin)
        
      if (deleteAllError) {
        console.error('Erro ao limpar todos eventos futuros do Google:', deleteAllError)
      }
    }

  } catch (err) {
    console.error('Erro no pull de eventos do Google:', err)
  }
}

