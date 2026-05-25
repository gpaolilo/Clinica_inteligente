import { supabase } from './supabase'

export const syncPendingSessions = async (token: string, psychologist_id: string) => {
  try {
    const now = new Date().toISOString()
    
    // Busca sessões futuras que ainda não tem google_event_id
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
      return
    }

    if (!sessions || sessions.length === 0) {
      return // Nada para sincronizar
    }

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
          'Authorization': `Bearer ${token}`,
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
  } catch (err) {
    console.error('Erro no processo de sync automático:', err)
  }
}

export const pullGoogleEvents = async (token: string, psychologist_id: string) => {
  try {
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // Próximos 90 dias

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
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
      const { error: deleteError } = await supabase
        .from('google_calendar_events')
        .delete()
        .eq('psychologist_id', psychologist_id)
        .gte('start_time', timeMin)
    }

  } catch (err) {
    console.error('Erro no pull de eventos do Google:', err)
  }
}
