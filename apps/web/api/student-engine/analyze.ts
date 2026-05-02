import { createAuthClient } from '../_lib/supabase.js'

const SYSTEM_PROMPT = `You are an expert language teacher and AI learning analyst.
Analyze the following lesson transcript and extract structured learning events. 
You MUST return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks, and no additional text:

{
  "grammar_errors": [
    { "sentence": "string", "correction": "string", "explanation": "string", "frequency": 1, "severity": "low" | "medium" | "high" }
  ],
  "vocabulary_gaps": [
    { "missing_word": "string", "suggested_word": "string", "context": "string" }
  ],
  "fluency": {
    "score": 0.8,
    "hesitation_examples": ["string"]
  },
  "pronunciation_issues": [
    { "word": "string", "issue": "string" }
  ],
  "learning_patterns": [
    { "pattern": "string", "confidence": 0.9 }
  ],
  "context_needs": [
    { "scenario": "string", "priority": "low" | "medium" | "high" }
  ]
}
`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { sessionId, psychologistId, patientId } = req.body

    if (!sessionId || !psychologistId || !patientId) {
      throw new Error('Missing required parameters')
    }

    const supabaseAuth = createAuthClient(req)
    // 1. Fetch transcript
    const { data: transcriptData, error: transcriptError } = await supabaseAuth
      .from('session_transcripts')
      .select('transcript')
      .eq('session_id', sessionId)
      .single()

    if (transcriptError || !transcriptData) throw new Error('Transcript not found')

    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ API Key is missing')

    // 2. Call GROQ API
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
          { role: 'user', content: transcriptData.transcript }
        ],
        temperature: 0.1, 
        response_format: { type: 'json_object' }
      })
    })

    const groqData = await response.json()
    if (groqData.error) throw new Error(`GROQ Error: ${groqData.error.message}`)

    const analysis = JSON.parse(groqData.choices[0].message.content)

    // 3. Normalize into events
    const eventsToInsert = []

    if (analysis.grammar_errors) {
      for (const e of analysis.grammar_errors) {
        eventsToInsert.push({
          session_id: sessionId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          event_type: 'grammar_error',
          severity: e.severity,
          frequency: e.frequency || 1,
          confidence: 1.0,
          details: { sentence: e.sentence, correction: e.correction, explanation: e.explanation }
        })
      }
    }

    if (analysis.vocabulary_gaps) {
      for (const e of analysis.vocabulary_gaps) {
        eventsToInsert.push({
          session_id: sessionId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          event_type: 'vocabulary_gap',
          severity: 'medium',
          frequency: 1,
          confidence: 1.0,
          details: { missing_word: e.missing_word, suggested_word: e.suggested_word, context: e.context }
        })
      }
    }

    if (analysis.pronunciation_issues) {
      for (const e of analysis.pronunciation_issues) {
        eventsToInsert.push({
          session_id: sessionId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          event_type: 'pronunciation_issue',
          severity: 'medium',
          frequency: 1,
          confidence: 1.0,
          details: { word: e.word, issue: e.issue }
        })
      }
    }

    if (analysis.context_needs) {
      for (const e of analysis.context_needs) {
        eventsToInsert.push({
          session_id: sessionId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          event_type: 'context_need',
          severity: e.priority,
          frequency: 1,
          confidence: 1.0,
          details: { scenario: e.scenario }
        })
      }
    }

    if (analysis.learning_patterns) {
      for (const e of analysis.learning_patterns) {
        eventsToInsert.push({
          session_id: sessionId,
          psychologist_id: psychologistId,
          patient_id: patientId,
          event_type: 'learning_pattern',
          severity: 'low',
          frequency: 1,
          confidence: e.confidence,
          details: { pattern: e.pattern }
        })
      }
    }

    // 4. Save events
    if (eventsToInsert.length > 0) {
      const { error: eventsError } = await supabaseAuth.from('learning_events').insert(eventsToInsert)
      if (eventsError) throw new Error(`Database Error saving events: ${eventsError.message}`)
    }

    // 5. Update student profile
    const { data: profile } = await supabaseAuth.from('student_profiles').select('*').eq('student_id', patientId).single()
    
    const weaknesses = profile ? profile.weaknesses : []
    const patterns = profile ? profile.learning_patterns : []

    const newWeaknesses = [...new Set([...weaknesses, ...(analysis.grammar_errors || []).map((g: any) => g.explanation)])]
    const newPatterns = [...new Set([...patterns, ...(analysis.learning_patterns || []).map((p: any) => p.pattern)])]

    if (profile) {
      await supabaseAuth.from('student_profiles').update({
        weaknesses: newWeaknesses,
        learning_patterns: newPatterns,
        last_updated: new Date()
      }).eq('student_id', patientId)
    } else {
      await supabaseAuth.from('student_profiles').insert([{
        student_id: patientId,
        psychologist_id: psychologistId,
        weaknesses: newWeaknesses,
        learning_patterns: newPatterns
      }])
    }

    res.status(200).json({ success: true, events_count: eventsToInsert.length, fluency: analysis.fluency })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
