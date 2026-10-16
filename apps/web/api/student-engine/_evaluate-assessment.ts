import { supabaseAdmin } from '../_lib/supabase.js'
import { callGroqChat } from '../_lib/groq.js'

const EVALUATION_SYSTEM_PROMPT = `You are a Senior CEFR (Common European Framework of Reference for Languages) Examiner.
Evaluate an ESL student's English Level Assessment based on their answers, reading aloud performance, and scores.

You MUST return ONLY a valid JSON object matching this exact structure, with no markdown, no code fences, and no surrounding text:
{
  "assigned_level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "overall_score": number (0 to 100),
  "pronunciation_score": number (0 to 100),
  "grammar_score": number (0 to 100),
  "reading_score": number (0 to 100),
  "evaluation_report": {
    "title": "Level Placement Diagnosis (e.g. B1 - Independent Intermediate)",
    "summary": "2-3 encouraging sentences highlighting the student's current proficiency level.",
    "strengths": ["2-3 specific bullet points of demonstrated competence"],
    "growth_areas": ["2-3 specific areas for grammatical or vocabulary growth"],
    "pronunciation_notes": "Actionable feedback on rhythm, cadence, word stress, or specific sounds.",
    "next_milestone": "A concrete learning goal for the upcoming weeks."
  }
}`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { 
      assessmentId, 
      studentId, 
      grammarAnswers = {}, 
      readingAnswers = {}, 
      audioUrl,
      audioDurationSeconds = 0 
    } = req.body

    if (!assessmentId || !studentId) {
      return res.status(400).json({ error: 'Missing assessmentId or studentId' })
    }

    // 1. Fetch the assessment
    const { data: assessment, error: fetchErr } = await supabaseAdmin
      .from('level_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (fetchErr || !assessment) {
      throw new Error('Assessment not found')
    }

    const testContent = assessment.test_content || {}
    const grammarQuestions = testContent.grammar_section || []
    const readingQuestions = testContent.reading_comprehension?.questions || []
    const readingText = testContent.reading_aloud?.text || ''

    // 2. Automatic grading of objective questions
    let correctGrammar = 0
    const grammarDetails = grammarQuestions.map((q: any) => {
      const studentChoice = grammarAnswers[q.id]
      const isCorrect = studentChoice === q.correct_answer
      if (isCorrect) correctGrammar++
      return {
        id: q.id,
        question: q.question,
        selected: studentChoice,
        correct: q.correct_answer,
        isCorrect
      }
    })
    const calculatedGrammarScore = grammarQuestions.length > 0 
      ? Math.round((correctGrammar / grammarQuestions.length) * 100) 
      : 70

    let correctReading = 0
    const readingDetails = readingQuestions.map((q: any) => {
      const studentChoice = readingAnswers[q.id]
      const isCorrect = studentChoice === q.correct_answer
      if (isCorrect) correctReading++
      return {
        id: q.id,
        question: q.question,
        selected: studentChoice,
        correct: q.correct_answer,
        isCorrect
      }
    })
    const calculatedReadingScore = readingQuestions.length > 0 
      ? Math.round((correctReading / readingQuestions.length) * 100) 
      : 70

    // Reading Aloud evaluation heuristics
    const readingWordCount = readingText.split(/\s+/).filter(Boolean).length
    let estimatedPronunciationScore = 75
    if (audioDurationSeconds > 0 && readingWordCount > 0) {
      const wordsPerMinute = (readingWordCount / audioDurationSeconds) * 60
      // Ideal natural reading pace is ~110-150 WPM
      if (wordsPerMinute >= 90 && wordsPerMinute <= 160) {
        estimatedPronunciationScore = 85
      } else if (wordsPerMinute >= 70 && wordsPerMinute < 90) {
        estimatedPronunciationScore = 75
      } else if (wordsPerMinute < 70) {
        estimatedPronunciationScore = 65 // Hesitant / slow
      } else {
        estimatedPronunciationScore = 70 // Rushed
      }
    }

    // 3. Ask AI to perform holistic evaluation & CEFR assignment
    const evaluationPrompt = `The student completed a Level Assessment:
1. Target Reading Passage (${readingWordCount} words):
"${readingText}"
- Audio Duration: ${audioDurationSeconds} seconds (${audioUrl ? 'Audio successfully recorded' : 'No audio'})
- Initial estimated pronunciation/cadence score: ${estimatedPronunciationScore}%

2. Grammar Challenge:
- Correct answers: ${correctGrammar}/${grammarQuestions.length} (${calculatedGrammarScore}%)
- Details: ${JSON.stringify(grammarDetails)}

3. Reading Comprehension:
- Correct answers: ${correctReading}/${readingQuestions.length} (${calculatedReadingScore}%)
- Details: ${JSON.stringify(readingDetails)}

Assessment Type: ${assessment.assessment_type}

Determine the final CEFR Level (A1, A2, B1, B2, C1, C2), realistic balanced scores, and detailed constructive feedback.`

    const groqData = await callGroqChat({
      messages: [
        { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const evaluation = JSON.parse(groqData.choices[0].message.content)

    const finalAssignedLevel = evaluation.assigned_level || 'B1'
    const finalOverallScore = evaluation.overall_score || Math.round((calculatedGrammarScore + calculatedReadingScore + estimatedPronunciationScore) / 3)
    const finalPronunciationScore = evaluation.pronunciation_score || estimatedPronunciationScore
    const finalGrammarScore = evaluation.grammar_score || calculatedGrammarScore
    const finalReadingScore = evaluation.reading_score || calculatedReadingScore

    // 4. Update level_assessments in database
    const studentAnswersPayload = {
      grammar: grammarAnswers,
      reading: readingAnswers,
      grammar_details: grammarDetails,
      reading_details: readingDetails
    }

    const { data: updatedAssessment, error: updateErr } = await supabaseAdmin
      .from('level_assessments')
      .update({
        status: 'COMPLETED',
        audio_url: audioUrl || null,
        audio_duration_seconds: audioDurationSeconds,
        student_answers: studentAnswersPayload,
        pronunciation_score: finalPronunciationScore,
        grammar_score: finalGrammarScore,
        reading_score: finalReadingScore,
        overall_score: finalOverallScore,
        assigned_level: finalAssignedLevel,
        evaluation_report: evaluation.evaluation_report,
        completed_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('Error updating level_assessment:', updateErr)
      throw new Error(`Database Error: ${updateErr.message}`)
    }

    // 5. Update patient's current level
    await supabaseAdmin
      .from('patients')
      .update({ student_level: finalAssignedLevel })
      .or(`id.eq.${studentId},user_id.eq.${studentId}`)

    // 6. Update student_profiles if present
    try {
      await supabaseAdmin
        .from('student_profiles')
        .update({
          student_level: finalAssignedLevel,
          last_updated: new Date()
        })
        .eq('student_id', studentId)
    } catch (e) {
      console.warn('Could not update student_profiles level:', e)
    }

    // 7. Reward XP in gamification_profiles
    try {
      const { data: gamification } = await supabaseAdmin
        .from('gamification_profiles')
        .select('xp')
        .eq('patient_id', studentId)
        .single()

      if (gamification) {
        await supabaseAdmin
          .from('gamification_profiles')
          .update({ xp: (gamification.xp || 0) + 100 })
          .eq('patient_id', studentId)
      }
    } catch (e) {
      console.warn('Could not update gamification XP:', e)
    }

    return res.status(200).json({ 
      success: true, 
      assessment: updatedAssessment,
      assigned_level: finalAssignedLevel,
      overall_score: finalOverallScore,
      scores: {
        pronunciation: finalPronunciationScore,
        grammar: finalGrammarScore,
        reading: finalReadingScore
      },
      evaluation: evaluation.evaluation_report
    })
  } catch (err: any) {
    console.error('Error in evaluate-assessment:', err)
    return res.status(400).json({ error: err.message || 'Failed to evaluate assessment' })
  }
}
