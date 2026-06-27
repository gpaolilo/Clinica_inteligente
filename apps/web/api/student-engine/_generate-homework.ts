import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import { consumeCredits } from '../_lib/credits.js'

const SYSTEM_PROMPT = `You are an expert language teacher and AI homework generator.
Based on the student's recent learning events (errors, gaps), class transcript, and their overall profile, generate a personalized homework plan.
Every exercise MUST be derived from the real class transcript and events provided. Prioritize high severity/frequency errors and gaps.

You MUST return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks, no trailing commas, and no additional text:

{
  "exercises": [
    {
      "section": "Section Name (e.g. Correct Your Mistakes)",
      "type": "grammar" | "vocabulary" | "writing" | "speaking" | "scenario" | "reading" | "reflection" | "bonus",
      "title": "Exercise Title",
      "question": "The question prompt, text, or task instructions",
      "answer": "Expected correct answer, model answer, or key points for open-ended exercises",
      "explanation": "Educational rules, grammar tips, or explanation",
      "difficulty": "easy" | "medium" | "hard",
      "time_estimate": number (estimated minutes to complete, integer),
      "xp_reward": number (XP awarded for completion, integer 10-50)
    }
  ]
}
`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { 
      sessionId, 
      psychologistId, 
      patientId, 
      template = 'standard', 
      difficulty = 'adaptive', 
      enabledSections = ['mistakes', 'grammar', 'vocabulary', 'writing', 'speaking', 'scenario', 'reading', 'reflection', 'bonus'] 
    } = req.body

    if (!sessionId || !psychologistId || !patientId) {
      throw new Error('Missing required parameters')
    }

    const supabaseAuth = createAuthClient(req)

    // 1. Fetch student profile
    const { data: profile } = await supabaseAuth
      .from('student_profiles')
      .select('*')
      .eq('student_id', patientId)
      .single()

    // 2. Fetch learning events for this session
    const { data: events, error: eventsError } = await supabaseAuth
      .from('learning_events')
      .select('*')
      .eq('session_id', sessionId)
      .eq('patient_id', patientId)

    if (eventsError) throw new Error('Error fetching events')

    // 3. Fetch transcript for this session
    const { data: transcriptData } = await supabaseAuth
      .from('session_transcripts')
      .select('transcript')
      .eq('session_id', sessionId)
      .maybeSingle()

    // 4. Calculate adaptive difficulty based on past performance
    let finalDifficulty = difficulty
    if (difficulty === 'adaptive') {
      const { data: pastResults } = await supabaseAuth
        .from('homework_results')
        .select('score')
        .eq('patient_id', patientId)
        .order('completed_at', { ascending: false })
        .limit(3)

      if (pastResults && pastResults.length > 0) {
        const avgScore = pastResults.reduce((acc: number, r: any) => acc + (parseFloat(r.score) || 0), 0) / pastResults.length
        if (avgScore >= 90) {
          finalDifficulty = 'hard'
        } else if (avgScore <= 60) {
          finalDifficulty = 'easy'
        } else {
          finalDifficulty = 'medium'
        }
      } else {
        finalDifficulty = 'medium' // Default fallback
      }
    }

    // 5. Calculate AI Credit cost based on enabled sections
    const sectionCosts: Record<string, number> = {
      mistakes: 5,
      grammar: 5,
      vocabulary: 5,
      writing: 15,
      speaking: 20,
      scenario: 20,
      reading: 5,
      reflection: 2,
      bonus: 2
    }

    const creditCost = enabledSections.reduce((sum: number, sec: string) => sum + (sectionCosts[sec] || 0), 0)

    // 6. Verify and deduct AI credits
    const creditResult = await consumeCredits(
      psychologistId,
      'homework_generation',
      patientId,
      creditCost || 1,
      `Geração de homework adaptativa (${template})`
    )

    if (!creditResult.success) {
      return res.status(403).json({ error: creditResult.error })
    }

    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ API Key is missing')

    // 7. Format sections prompt guidelines
    const sectionGuidelines: Record<string, string> = {
      mistakes: "Section 1: Correct Your Mistakes. Goal: Reinforce mistakes made during class. Focus on rewriting, correcting, or translating real incorrect phrases from the transcript.",
      grammar: "Section 2: Grammar Practice. Goal: Reinforce weak grammar topics (Prepositions, Articles, Conditionals, Verb Tenses, Verb Agreements) matching the student's level.",
      vocabulary: "Section 3: Vocabulary Reinforcement. Goal: Improve vocabulary retention using words mentioned in class or introducing related business/practical terms.",
      writing: "Section 4: Writing Challenge. Goal: Promote written production. Formats: Email writing, opinion paragraph, story completion, business communication.",
      speaking: "Section 5: AI Speaking Challenge. Goal: Speak and record practice (presentation, monologue, response to scenario).",
      scenario: "Section 6: Scenario Practice. Goal: Simulate real-life roleplay (Job Interview, airport conversation, negotiation, travel small talk) relevant to student's goal.",
      reading: "Section 7: Reading Comprehension. Goal: Short readable text or dialog suited for level, followed by comprehension questions.",
      reflection: "Section 8: Reflection Questions. Goal: Self-awareness questions (e.g. what was difficult today, how confident do you feel).",
      bonus: "Section 9: Bonus XP Mission. Goal: Fun task (e.g. read an article, learn 5 specific words, watch a TED talk)."
    }

    const promptSections = enabledSections.map((sec: string) => sectionGuidelines[sec]).filter(Boolean).join('\n')

    // 8. Construct custom instructions based on Template
    const templateInstructions: Record<string, string> = {
      quick: "Make a quick homework assignment. Total of 3-4 concise exercises, time estimate 10-15 minutes total.",
      standard: "Make a standard homework assignment. Total of 5-6 well-rounded exercises, time estimate 20-30 minutes total.",
      intensive: "Make an intensive homework assignment. Total of 8-10 exercises spanning all key language skills, time estimate 45-60 minutes total.",
      business: "Focus exclusively on Business English, professional vocabulary, corporate meeting scenarios, business emails, and workplace communication.",
      speaking: "Focus mostly on speaking challenges, pronunciation, read-aloud prompts, and conversational scenarios.",
      exam_prep: "Tailor exercises to academic exam formats (like TOEFL, IELTS, or Cambridge), focusing on error identification, listening transcripts, and essays."
    }

    const promptTemplate = templateInstructions[template] || templateInstructions.standard

    // 9. Construct full LLM prompt data
    const promptData = {
      student_level: profile?.level || 'Beginner',
      learning_goals: profile?.strengths || [], // fallback
      learning_style: profile?.learning_patterns || 'Practical',
      difficulty_target: finalDifficulty,
      template_focus: promptTemplate,
      enabled_sections: promptSections,
      class_transcript: transcriptData?.transcript || 'No transcript available.',
      recent_events: events?.map((e: any) => ({
        id: e.id,
        type: e.event_type,
        severity: e.severity,
        details: e.details
      }))
    }

    // 10. Call GROQ API
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
          { role: 'user', content: `Please generate the homework plan using this configuration: ${JSON.stringify(promptData)}` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    })

    const groqData = await response.json()
    if (groqData.error) throw new Error(`GROQ Error: ${groqData.error.message}`)

    const generatedPlan = JSON.parse(groqData.choices[0].message.content)

    // 11. Save to database
    const { data: insertedPlan, error: insertError } = await supabaseAuth
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

    res.status(200).json({ success: true, plan: insertedPlan })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
