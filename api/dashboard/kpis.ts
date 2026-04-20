import { supabaseAdmin } from '../_lib/supabase'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 1. Expected Revenue (Current Month, SCHEDULED or COMPLETED)
    const { data: currentMonthSessions, error: err1 } = await supabaseAdmin
      .from('sessions')
      .select('price, status')
      .gte('scheduled_date', currentMonthStart)
      .lt('scheduled_date', nextMonthStart)
      .in('status', ['SCHEDULED', 'COMPLETED', 'PENDING']) // Add any active status

    if (err1) throw err1

    let expectedRevenue = 0
    currentMonthSessions?.forEach(s => {
      expectedRevenue += (s.price || 0)
    })

    // 2. Last Month Revenue (COMPLETED)
    const { data: lastMonthSessions, error: err2 } = await supabaseAdmin
      .from('sessions')
      .select('price, status')
      .gte('scheduled_date', lastMonthStart)
      .lt('scheduled_date', lastMonthEnd)
      .in('status', ['COMPLETED']) 

    if (err2) throw err2

    let lastMonthRevenue = 0
    lastMonthSessions?.forEach(s => {
      lastMonthRevenue += (s.price || 0)
    })

    // 3. Average Revenue per Session
    // Calcula com base em todas as completadas da vida ou do mês
    const { aggregate } = await supabaseAdmin
      .from('sessions')
      .select('price, status')
      .eq('status', 'COMPLETED')
      // Note: Ideal limit here or aggregation function sum/count instead of returning all rows
      .limit(1000)

    const allCompletedResponse = aggregate || await supabaseAdmin.from('sessions').select('price').eq('status', 'COMPLETED').limit(500)
    
    let averageRevenue = 0
    let totalPrices = 0
    let totalCount = allCompletedResponse.data?.length || 0

    if (totalCount > 0) {
      allCompletedResponse.data?.forEach(s => totalPrices += (s.price || 0))
      averageRevenue = totalPrices / totalCount
    } else {
      averageRevenue = expectedRevenue / (currentMonthSessions?.length || 1) // Fallback estimation
    }

    // 4. Potential Revenue 
    // Pegar config do usuário (se existir) senão usar defaults: 8h-18h seg a sex
    let potentialHours = 0;
    
    // Simplificando o availability: pegar resto dos dias letivos do mês, multiplicar por (por exemplo) 6 slots por dia, deduzir marcados
    const today = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    let remainingWorkdays = 0;
    for (let d = new Date(today); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
       if (d.getDay() !== 0 && d.getDay() !== 6) remainingWorkdays++; // Exclui sabado e domingo
    }
    
    const slotsPordia = 8; // Assumindo base 8 vagas diárias (09 às 18h com 1h de almoço)
    const futureSessionsInMonth = currentMonthSessions?.filter((s:any) => s.status === 'SCHEDULED').length || 0;
    
    let freeSlotsRemainingThisMonth = (remainingWorkdays * slotsPordia) - futureSessionsInMonth;
    if (freeSlotsRemainingThisMonth < 0) freeSlotsRemainingThisMonth = 0;

    const potentialRevenue = freeSlotsRemainingThisMonth * (averageRevenue || 150);

    res.status(200).json({
      expected_revenue: expectedRevenue,
      last_month_revenue: lastMonthRevenue,
      average_revenue: averageRevenue,
      potential_revenue: potentialRevenue,
    })

  } catch (err: any) {
    console.error('Error fetching KPIs', err)
    res.status(500).json({ error: err.message })
  }
}
