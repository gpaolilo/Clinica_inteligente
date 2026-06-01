import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate user
    const authClient = createAuthClient(req)
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(403).json({ error: 'Forbidden: Profile not found' })
    }

    const role = profile.role

    // --- CASE A: ADMIN DASHBOARD DATA ---
    if (role === 'ADMIN') {
      // 1. Fetch total platform revenue aggregations
      const { data: revData } = await supabaseAdmin
        .from('platform_revenue')
        .select('*')

      let saasRevenue = 0
      let revShareRevenue = 0
      let aiRevenue = 0
      let totalPlatformRevenue = 0

      if (revData) {
        revData.forEach(r => {
          const amt = Number(r.amount)
          totalPlatformRevenue += amt
          if (r.source_type === 'SAAS') saasRevenue += amt
          else if (r.source_type === 'REVSHARE') revShareRevenue += amt
          else if (r.source_type === 'AI_CREDITS') aiRevenue += amt
        })
      }

      // 2. Teacher Revenue aggregation (Gross payments to teachers)
      const { data: transData } = await supabaseAdmin
        .from('payment_transactions')
        .select('gross_amount, net_amount, platform_fee, stripe_fee')

      let totalTeacherRevenue = 0
      if (transData) {
        transData.forEach(t => {
          totalTeacherRevenue += Number(t.net_amount)
        })
      }

      // 3. Platform subscription totals (MRR / Active counts)
      const { data: subs } = await supabaseAdmin
        .from('platform_subscriptions')
        .select('status, plan_type')

      let activeSubscribers = 0
      let mrr = 0
      let churnedCount = 0

      if (subs) {
        subs.forEach(s => {
          if (s.status === 'ACTIVE') {
            activeSubscribers++
            let planPrice = 19
            if (s.plan_type === 'PRO') planPrice = 49
            else if (s.plan_type === 'ACADEMY') planPrice = 99
            mrr += planPrice
          } else if (s.status === 'CANCELLED') {
            churnedCount++
          }
        })
      }

      const totalSubsCount = activeSubscribers + churnedCount
      const churnRate = totalSubsCount > 0 ? (churnedCount / totalSubsCount) * 100 : 0

      return res.status(200).json({
        mrr,
        arr: mrr * 12,
        revShareRevenue,
        aiRevenue,
        saasRevenue,
        totalPlatformRevenue,
        totalTeacherRevenue,
        activeSubscribers,
        churnRate,
        recentTransactions: transData ? transData.slice(0, 10) : []
      })
    }

    // --- CASE B: TEACHER DASHBOARD DATA ---
    if (role === 'TEACHER' || role === 'PSYCHOLOGIST') {
      const teacherId = user.id

      // 1. Fetch payments made to this teacher
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('*, payment_transactions(*)')
        .eq('payee_id', teacherId)
        .eq('status', 'SUCCEEDED')

      let grossRevenue = 0
      let platformFees = 0
      let stripeFees = 0
      let netRevenue = 0

      if (payments) {
        payments.forEach(p => {
          const amt = Number(p.amount)
          grossRevenue += amt
          
          if (p.payment_transactions && p.payment_transactions.length > 0) {
            const trans = p.payment_transactions[0]
            platformFees += Number(trans.platform_fee)
            stripeFees += Number(trans.stripe_fee)
            netRevenue += Number(trans.net_amount)
          } else {
            // Estimate splits if webhook missing transaction
            const fee = amt * 0.10 // 10%
            platformFees += fee
            stripeFees += (amt * 0.03) + 0.3
            netRevenue += (amt - fee - ((amt * 0.03) + 0.3))
          }
        })
      }

      // 2. Fetch subscribers (students)
      const { data: studentSubs } = await supabaseAdmin
        .from('student_subscriptions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('status', 'active')

      const subscribersCount = studentSubs ? studentSubs.length : 0

      // Estimate MRR (monthly subscription items)
      const { data: teacherProducts } = await supabaseAdmin
        .from('teacher_products')
        .select('price')
        .eq('teacher_id', teacherId)
        .eq('type', 'MONTHLY_SUBSCRIPTION')

      const subPrice = teacherProducts && teacherProducts.length > 0 ? Number(teacherProducts[0].price) : 0
      const teacherMRR = subscribersCount * subPrice

      // 3. Fetch payouts details
      const { data: payoutsList } = await supabaseAdmin
        .from('payouts')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })

      // Sum pending payouts (estimated status pending)
      const pendingPayouts = payoutsList 
        ? payoutsList.filter(p => p.status === 'PENDING').reduce((sum, curr) => sum + Number(curr.amount), 0)
        : 0

      // 4. Generate daily chart data for Recharts (last 7 days)
      const chartData: any[] = []
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
        const dayLabel = days[d.getDay()]

        // Filter payments on this day
        let dayGross = 0
        let dayNet = 0
        if (payments) {
          payments.forEach(p => {
            const payDate = new Date(p.created_at)
            if (payDate.toDateString() === d.toDateString()) {
              dayGross += Number(p.amount)
              if (p.payment_transactions && p.payment_transactions.length > 0) {
                dayNet += Number(p.payment_transactions[0].net_amount)
              } else {
                dayNet += Number(p.amount) * 0.86
              }
            }
          })
        }

        chartData.push({
          date: dateStr,
          day: dayLabel,
          Receita: dayGross,
          Líquido: dayNet
        })
      }

      return res.status(200).json({
        grossRevenue,
        netRevenue,
        platformFees,
        stripeFees,
        pendingPayouts,
        subscribers: subscribersCount,
        mrr: teacherMRR,
        payoutHistory: payoutsList || [],
        chartData
      })
    }

    return res.status(400).json({ error: 'Invalid dashboard request' })

  } catch (err: any) {
    console.error('Payments Dashboard Fetch error:', err)
    res.status(500).json({ error: err.message })
  }
}
