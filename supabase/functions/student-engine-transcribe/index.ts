import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { audioUrl, sessionId, psychologistId, patientId } = await req.json()

    if (!audioUrl || !sessionId || !psychologistId || !patientId) {
      throw new Error('Missing required parameters')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const assemblyAiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    if (!assemblyAiKey) throw new Error('AssemblyAI API Key is missing')

    // 1. Submit audio to AssemblyAI
    const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ audio_url: audioUrl })
    })
    const submitData = await submitRes.json()

    if (submitData.error) throw new Error(`AssemblyAI Error: ${submitData.error}`)

    const transcriptId = submitData.id

    // 2. Poll for completion
    let transcriptData
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'authorization': assemblyAiKey }
      })
      transcriptData = await pollRes.json()

      if (transcriptData.status === 'completed') break
      if (transcriptData.status === 'error') throw new Error('Transcription failed')
    }

    // 3. Save to database
    const words = transcriptData.words.map((w: any) => ({
      word: w.text,
      start: w.start,
      end: w.end
    }))

    const { error: dbError } = await supabase.from('session_transcripts').insert([{
      session_id: sessionId,
      psychologist_id: psychologistId,
      patient_id: patientId,
      transcript: transcriptData.text,
      words: words
    }])

    if (dbError) throw new Error(`Database Error: ${dbError.message}`)

    return new Response(JSON.stringify({ success: true, transcript: transcriptData.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
