import { createAuthClient } from '../_lib/supabase.js'

const SYSTEM_PROMPT = `You are an expert language evaluator and conversational partner.
The user is practicing a specific scenario. Evaluate their final performance based on the conversation transcript.
You MUST return ONLY a valid JSON object matching this exact structure:

{
  "fluency_score": 85,
  "grammar_score": 90,
  "confidence_score": 80,
  "feedback": {
    "strengths": ["string"],
    "improvements": ["string"],
    "overall_impression": "string"
  }
}
`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { patientId, scenarioType, transcript, durationSeconds } = req.body

    if (!patientId || !scenarioType || !transcript) {
      throw new Error('Missing required parameters')
    }

    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ API Key is missing')

    // 1. Evaluate Transcript with GROQ
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Scenario: ${scenarioType}\nTranscript:\n${JSON.stringify(transcript)}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    })

    const groqData = await response.json()
    if (groqData.error) throw new Error(`GROQ Error: ${groqData.error.message}`)

    const evaluation = JSON.parse(groqData.choices[0].message.content)

    const supabaseAuth = createAuthClient(req)

    // 2. Save Session
    const { data: sessionData, error: sessionError } = await supabaseAuth.from('scenario_sessions').insert([{
      patient_id: patientId,
      scenario_type: scenarioType,
      transcript: transcript,
      fluency_score: evaluation.fluency_score,
      grammar_score: evaluation.grammar_score,
      confidence_score: evaluation.confidence_score,
      feedback: evaluation.feedback,
      duration_seconds: durationSeconds || 0
    }]).select().single()

    if (sessionError) throw new Error(`Database Error: ${sessionError.message}`)

    // 3. Grant XP
    try {
      const { data: gamification } = await supabaseAuth.from('gamification_profiles').select('xp').eq('patient_id', patientId).single()
      if (gamification) {
         await supabaseAuth.from('gamification_profiles').update({ xp: gamification.xp + 100 }).eq('patient_id', patientId)
      }
    } catch (xpErr) {
      console.error('Error updating XP', xpErr)
    }

    res.status(200).json({ success: true, evaluation: evaluation, session: sessionData })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
