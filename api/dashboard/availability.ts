import { supabaseAdmin } from '../_lib/supabase'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Expects ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' })
  }

  try {
    // 1. Buscar sessões no período (já marcadas)
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('scheduled_date, duration, status')
      .gte('scheduled_date', startDate)
      .lt('scheduled_date', endDate)
      .neq('status', 'CANCELLED')

    if (error) throw error

    // Constantes de funcionamento (Mock - poderia ser puxado de user_settings)
    const startHour = 9  // 09:00
    const endHour = 18   // 18:00
    const sessionDurationMinutes = 60
    
    const freeSlots = []
    
    const startObj = new Date(startDate)
    const endObj = new Date(endDate)

    // Interar sobre os dias do intervalo
    for (let d = new Date(startObj); d < endObj; d.setDate(d.getDate() + 1)) {
      // Ignorar fins de semana
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      // Iterar as horas do dia
      for (let h = startHour; h < endHour; h++) {
        const slotStart = new Date(d)
        slotStart.setHours(h, 0, 0, 0)
        
        const slotEnd = new Date(slotStart.getTime() + sessionDurationMinutes * 60000)

        // Verificar colapso com sessões existentes
        const isOccupied = sessions?.some((s: any) => {
          const sStart = new Date(s.scheduled_date)
          const sDur = s.duration || 60
          const sEnd = new Date(sStart.getTime() + sDur * 60000)
          
          // Lógica de overlap
          return (slotStart < sEnd && slotEnd > sStart)
        })

        if (!isOccupied) {
          freeSlots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString()
          })
        }
      }
    }

    res.status(200).json({ freeSlots })

  } catch (err: any) {
    console.error('Error computing availability', err)
    res.status(500).json({ error: err.message })
  }
}
