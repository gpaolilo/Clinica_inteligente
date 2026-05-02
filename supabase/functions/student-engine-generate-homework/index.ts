import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are an expert language teacher and AI homework generator.
Based on the student's recent learning events (errors, gaps) and their overall profile, generate a personalized homework plan.
Every exercise MUST be derived from the real events provided. Prioritize high severity/frequency errors.
You MUST return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks, and no additional text:

{
  "exercises": [
    {
      "type": "vocabulary" | "grammar" | "speaking" | "repetition" | "reflection",
      "title": "string",
      "instruction": "string",
      "example": "string",
      "expected_output": "string",
      "difficulty": "easy" | "medium" | "hard",
      "source_event_ids": ["string"]
    }
  ]
}
`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { sessionId, psychologistId, patientId } = await req.json()

    if (!sessionId || !psychologistId || !patientId) {
      throw new Error('Missing required parameters')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch learning events for this session
    const { data: events, error: eventsError } = await supabase
      .from('learning_events')
      .select('*')
      .eq('session_id', sessionId)
      .eq('patient_id', patientId)

    if (eventsError) throw new Error('Error fetching events')

    // 2. Fetch student profile
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_id', patientId)
      .single()

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) throw new Error('GROQ API Key is missing')

    // 3. Construct prompt data
    const promptData = {
      student_level: profile?.level || 'Beginner',
      strengths: profile?.strengths || [],
      weaknesses: profile?.weaknesses || [],
      recent_events: events?.map(e => ({
        id: e.id,
        type: e.event_type,
        severity: e.severity,
        details: e.details
      }))
    }

    // 4. Call GROQ API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(promptData) }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    })

    const groqData = await response.json()
    if (groqData.error) throw new Error(`GROQ Error: ${groqData.error.message}`)

    const generatedPlan = JSON.parse(groqData.choices[0].message.content)

    // 5. Save to database
    const { data: insertedPlan, error: insertError } = await supabase
      .from('homework_plans')
      .insert([{
        session_id: sessionId,
        psychologist_id: psychologistId,
        patient_id: patientId,
        exercises: generatedPlan.exercises,
        status: 'DRAFT'
      }])
      .select()
      .single()

    if (insertError) throw new Error(`Database Error: ${insertError.message}`)

    return new Response(JSON.stringify({ success: true, plan: insertedPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
