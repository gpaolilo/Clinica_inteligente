import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import { consumeCredits } from '../_lib/credits.js'
import { callGroqChat } from '../_lib/groq.js'

const SYSTEM_PROMPT = `You are an expert language teacher and AI homework generator for the Flowike learning platform.
Based on the student's recent learning events (errors, gaps), class transcript, and their overall profile, generate a personalized, interactive homework plan matching the modern interactive method and design of Flowike Level Assessments.

CRITICAL INTERACTIVE FORMAT REQUIREMENTS:
All exercises MUST be interactive so students can solve them using either:
1. "multiple_choice": A clear question where multiple answer options are tagged and presented as selectable cards (exactly 4 distinct options).
2. "reorder_boxes": A sentence reconstruction / syntax challenge where pre-defined word/phrase boxes are provided in a scrambled word bank for the student to click and move into an ordered answer box.
3. "speaking": Voice recording challenge (for pronunciation/speaking only).
4. "writing": Open writing or reflection challenge (for essays/reflections only).

FORMAT RULES BY SECTION:
- Section 1 (Correct Your Mistakes): Use format "reorder_boxes" (student reconstructs the correct sentence using pre-defined word boxes) OR format "multiple_choice" (student tags the correct alternative).
- Section 2 (Grammar Practice): Use format "multiple_choice" (with 4 distinct options) OR "reorder_boxes" (unscramble grammatical structures).
- Section 3 (Vocabulary Reinforcement): Use format "multiple_choice" (fill-in-the-blank with 4 options to tag, or match definition).
- Section 6 (Scenario Practice): Use format "multiple_choice" to choose the most natural conversational response.
- Section 7 (Reading Comprehension): Short passage followed by format "multiple_choice" questions to tag.

FOR "multiple_choice":
- "options": An array of exactly 4 strings (1 correct answer and 3 realistic distractors).
- "answer": The exact string of the correct choice from the options array.

FOR "reorder_boxes":
- "word_bank": An array of individual word or short phrase tokens in scrambled/shuffled order (e.g. ["yesterday", "I", "to", "went", "the", "market"]).
- "answer": The exact complete sentence assembled in proper order (e.g. "Yesterday I went to the market").

You MUST return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks, no trailing commas, and no additional text:

{
  "exercises": [
    {
      "section": "Section Name (e.g. Correct Your Mistakes)",
      "type": "grammar" | "vocabulary" | "mistakes" | "reading" | "scenario" | "writing" | "speaking" | "reflection" | "bonus",
      "format": "multiple_choice" | "reorder_boxes" | "speaking" | "writing",
      "title": "Exercise Title",
      "question": "The question prompt, incomplete sentence with '_____', or reading excerpt",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "word_bank": ["word1", "word2", "word3", "word4"],
      "answer": "Expected correct answer string",
      "explanation": "Didactic rules, grammar tips, or explanation in Portuguese or English",
      "difficulty": "easy" | "medium" | "hard",
      "time_estimate": number,
      "xp_reward": number
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

    // 7. Format sections prompt guidelines
    const sectionGuidelines: Record<string, string> = {
      mistakes: "Section 1: Correct Your Mistakes. Reinforce errors made during class. Use format 'reorder_boxes' to move scrambled words into the correct sentence, or format 'multiple_choice' to tag the correct sentence.",
      grammar: "Section 2: Grammar Practice. Use format 'multiple_choice' with 4 distinct options to tag, or 'reorder_boxes' to construct proper grammatical sentences.",
      vocabulary: "Section 3: Vocabulary Reinforcement. Use format 'multiple_choice' with 4 tagged options (definitions, synonyms, or sentence completion).",
      writing: "Section 4: Writing Challenge. Encourage active writing production. Use format 'writing'.",
      speaking: "Section 5: AI Speaking Challenge. Voice recording practice. Use format 'speaking'.",
      scenario: "Section 6: Scenario Practice. Real-life roleplay situation. Use format 'multiple_choice' to tag the best response.",
      reading: "Section 7: Reading Comprehension. Short article or dialogue with comprehension questions using format 'multiple_choice' to tag.",
      reflection: "Section 8: Reflection Questions. Self-awareness questions using format 'writing' or 'multiple_choice'.",
      bonus: "Section 9: Bonus XP Mission. Extra engagement challenge."
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
      learning_goals: profile?.strengths || [],
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
    const groqData = await callGroqChat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please generate the homework plan using this configuration: ${JSON.stringify(promptData)}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const generatedPlan = JSON.parse(groqData.choices[0].message.content)

    // 11. Normalize exercises to guarantee multiple_choice options and reorder_boxes word_banks
    const shuffleArray = (arr: any[]) => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }

    const cleanWords = (text: string) => {
      if (!text) return []
      return text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).filter(Boolean)
    }

    const normalizedExercises = (generatedPlan.exercises || []).map((ex: any) => {
      let format = ex.format
      let options = Array.isArray(ex.options) ? ex.options.filter(Boolean) : []
      let wordBank = Array.isArray(ex.word_bank) ? ex.word_bank.filter(Boolean) : []
      const answer = (ex.answer || '').trim()

      // Determine or validate format
      if (!format) {
        if (options.length >= 2) format = 'multiple_choice'
        else if (wordBank.length >= 2) format = 'reorder_boxes'
        else if (ex.type === 'speaking') format = 'speaking'
        else if (ex.type === 'writing' || ex.type === 'reflection') format = 'writing'
        else if (answer && cleanWords(answer).length >= 3 && cleanWords(answer).length <= 12) format = 'reorder_boxes'
        else format = 'multiple_choice'
      }

      // Format-specific normalization
      if (format === 'multiple_choice') {
        if (!options.includes(answer) && answer) {
          options.unshift(answer)
        }
        // Ensure at least 4 options if possible
        if (options.length < 4 && answer) {
          const commonDistractors = ['None of the above', 'Both options are correct', 'Neither option applies', 'All of the above']
          for (const dist of commonDistractors) {
            if (options.length >= 4) break
            if (!options.includes(dist)) options.push(dist)
          }
        }
        // Shuffle options so answer isn't always first
        options = shuffleArray(options)
      } else if (format === 'reorder_boxes') {
        if (wordBank.length < 2 && answer) {
          wordBank = cleanWords(answer)
        }
        // Always shuffle the word bank so words are moved into boxes
        wordBank = shuffleArray(wordBank)
      }

      return {
        ...ex,
        format,
        options: format === 'multiple_choice' ? options : undefined,
        word_bank: format === 'reorder_boxes' ? wordBank : undefined,
        answer,
        time_estimate: ex.time_estimate || 2,
        xp_reward: ex.xp_reward || 15
      }
    })

    // 12. Save to database
    const { data: insertedPlan, error: insertError } = await supabaseAuth
      .from('homework_plans')
      .insert([{
        session_id: sessionId,
        psychologist_id: psychologistId,
        patient_id: patientId,
        exercises: normalizedExercises,
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

