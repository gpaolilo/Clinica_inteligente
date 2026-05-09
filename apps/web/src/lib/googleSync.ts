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
