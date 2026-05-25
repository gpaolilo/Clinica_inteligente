import { createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { week } = req.query
  if (!week) {
    return res.status(400).json({ error: 'week parameter is required (YYYY-MM-DD)' })
  }

  try {
    const startDate = new Date(week)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7)

    const supabaseAuth = createAuthClient(req)

    // Buscando as sessões em join explícito com o paciente
    const { data: sessions, error } = await supabaseAuth
      .from('sessions')
      .select(`
        id, 
        scheduled_date, 
        status, 
        price, 
        google_event_id,
        patient:patients (id, name)
      `)
      .gte('scheduled_date', startDate.toISOString())
      .lt('scheduled_date', endDate.toISOString())
      .order('scheduled_date', { ascending: true })

    if (error) throw error

    // Identificar IDs do Google Calendar que já estão associados a sessões locais
    const linkedGoogleEventIds = new Set(
      sessions?.map((s: any) => s.google_event_id).filter(Boolean) || []
    )

    // Formatar os dados para o frontend
    const formattedSessions = sessions?.map((s: any) => ({
      session_id: s.id,
      student_name: Array.isArray(s.patient) ? s.patient[0]?.name : s.patient?.name || 'Sem nome',
      start_time: s.scheduled_date,
      // Assumimos 1 hora de duração p/ exibir no bloco
      end_time: new Date(new Date(s.scheduled_date).getTime() + 60 * 60000).toISOString(),
      price: s.price,
      status: s.status,
    })) || []

    // Buscar eventos bloqueados do Google Calendar
    const { data: googleEvents, error: googleError } = await supabaseAuth
      .from('google_calendar_events')
      .select('*')
      .gte('end_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString())

    if (!googleError && googleEvents) {
      googleEvents.forEach((g: any) => {
        // Se o evento do Google já está atrelado a uma sessão local do app, não exibe duplicado em cinza
        if (linkedGoogleEventIds.has(g.google_event_id)) {
          return
        }
        formattedSessions.push({
          session_id: `google_${g.google_event_id}`,
          student_name: g.summary || 'Bloqueado (Google Calendar)',
          start_time: g.start_time,
          end_time: g.end_time,
          price: 0,
          status: 'BLOCKED'
        })
      })
    }

    res.status(200).json({
      week_start: startDate.toISOString(),
      sessions: formattedSessions
    })

  } catch (err: any) {
    console.error('Error fetching calendar', err)
    res.status(500).json({ error: err.message })
  }
}
