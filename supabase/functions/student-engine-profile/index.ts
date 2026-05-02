import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { patientId } = await req.json()

    if (!patientId) {
      throw new Error('Missing patientId')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_id', patientId)
      .single()

    // 2. Fetch recent learning events for trends
    const { data: events, error: eventsError } = await supabase
      .from('learning_events')
      .select('id, event_type, severity, frequency, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Profile fetch error: ${profileError.message}`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      profile: profile || null,
      recent_events: events || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
