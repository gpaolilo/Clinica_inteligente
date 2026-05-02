import { supabaseAdmin } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { patientId } = req.body

    if (!patientId) {
      throw new Error('Missing patientId')
    }

    // 1. Fetch profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('student_id', patientId)
      .single()

    // 2. Fetch recent learning events for trends
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('learning_events')
      .select('id, event_type, severity, frequency, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Profile fetch error: ${profileError.message}`)
    }
    
    if (eventsError) {
      console.error('Events fetch error:', eventsError.message)
    }

    res.status(200).json({ 
      success: true, 
      profile: profile || null,
      recent_events: events || []
    })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
