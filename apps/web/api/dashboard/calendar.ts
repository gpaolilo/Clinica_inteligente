import { supabaseAdmin } from '../_lib/supabase.js'

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

    // Buscando as sessões em join explícito com o paciente
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id, 
        scheduled_date, 
        status, 
        price, 
        patient:patients (id, name)
      `)
      .gte('scheduled_date', startDate.toISOString())
      .lt('scheduled_date', endDate.toISOString())
      .order('scheduled_date', { ascending: true })

    if (error) throw error

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

    res.status(200).json({
      week_start: startDate.toISOString(),
      sessions: formattedSessions
    })

  } catch (err: any) {
    console.error('Error fetching calendar', err)
    res.status(500).json({ error: err.message })
  }
}
