import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import { callGroqChat } from '../_lib/groq.js'

const GENERATION_SYSTEM_PROMPT = `You are a world-class Cambridge and CEFR certified English Assessment Designer.
Create a dynamic, comprehensive English Level Assessment.
The assessment must evaluate 3 core pillars:
1. Reading Aloud (Pronunciation, rhythm, phonetics)
2. Grammar (Verb tenses, prepositions, structure)
3. Reading Comprehension (Contextual analysis and inference)

You MUST return ONLY a valid JSON object matching this exact structure, with no markdown, no code fences, and no surrounding text:
{
  "reading_aloud": {
    "title": "Short title of the passage",
    "text": "A rich 80-120 word passage with diverse phonetics (e.g., th-sounds, vowel contrasts, past tense -ed endings, connected speech).",
    "focus_areas": ["List of 2-3 phonetic features to focus on"]
  },
  "grammar_section": [
    {
      "id": "g1",
      "question": "Question text with a blank like '_____'",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Exact string of correct option",
      "explanation": "Why this answer is correct",
      "difficulty": "A1" | "A2" | "B1" | "B2" | "C1"
    }
  ],
  "reading_comprehension": {
    "passage": "An engaging 100-140 word story or informative text.",
    "questions": [
      {
        "id": "r1",
        "question": "Comprehension question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Exact string of correct option",
        "explanation": "Why this answer is correct"
      }
    ]
  }
}

Ensure grammar has exactly 5 diverse questions (spanning from beginner A2 to upper-intermediate B2).
Ensure reading comprehension has exactly 3 questions testing factual recall and inference.`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { studentId, teacherId, assessmentType = 'INITIAL_PLACEMENT', targetLevel } = req.body

    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId' })
    }

    const supabaseAuth = createAuthClient(req)

    // Call Groq to generate dynamic test content
    const prompt = `Create a fresh, unique ${assessmentType === 'PROGRESS_CHECK' ? 'Progress Check' : 'Initial Placement'} test for an ESL student.${targetLevel ? ` Target current level is around ${targetLevel}.` : ''}`

    const groqData = await callGroqChat({
      messages: [
        { role: 'system', content: GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const testContent = JSON.parse(groqData.choices[0].message.content)

    // Locate student patient record to guarantee valid UUID
    let targetStudentId = studentId
    const { data: patientData } = await supabaseAdmin
      .from('patients')
      .select('id, user_id, psychologist_id')
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)
      .maybeSingle()

    if (patientData?.id) {
      targetStudentId = patientData.id
    }

    const effectiveTeacherId = teacherId || patientData?.psychologist_id || null

    // Insert new pending assessment
    const insertPayload = {
      student_id: targetStudentId,
      teacher_id: effectiveTeacherId,
      assessment_type: assessmentType,
      status: 'PENDING',
      test_content: testContent,
      requested_by_teacher_at: new Date().toISOString()
    }

    // Try inserting via supabaseAuth (which possesses teacher's Authorization token)
    let assessment: any = null
    let dbError: any = null

    try {
      const authRes = await supabaseAuth
        .from('level_assessments')
        .insert([insertPayload])
        .select('*')
        .maybeSingle()
      if (authRes.data) {
        assessment = authRes.data
      } else if (authRes.error) {
        dbError = authRes.error
      }
    } catch (e: any) {
      dbError = e
    }

    // Fallback: try via supabaseAdmin
    if (!assessment) {
      const adminRes = await supabaseAdmin
        .from('level_assessments')
        .insert([insertPayload])
        .select('*')
        .maybeSingle()
      if (adminRes.data) {
        assessment = adminRes.data
      } else {
        console.error('Error inserting level_assessment:', adminRes.error || dbError)
        throw new Error(`Database Error: ${adminRes.error?.message || dbError?.message || 'Failed to insert assessment'}`)
      }
    }

    return res.status(200).json({ success: true, assessment })
  } catch (err: any) {
    console.error('Error in generate-assessment:', err)
    return res.status(400).json({ error: err.message || 'Failed to generate assessment' })
  }
}
