const SYSTEM_PROMPT = `You are an expert English language teacher and proofreader.
Analyze the student's response to the writing prompt.
Identify grammatical errors, spelling mistakes, incorrect phrasing, and structure issues.
You must focus on sentence-by-sentence review and corrections, explaining clearly in Portuguese why each correction is made and suggesting the correct grammatical approach.

You MUST return ONLY a valid JSON object matching this exact structure, with no markdown formatting, no code blocks, no trailing commas, and no additional text:

{
  "has_mistakes": boolean,
  "corrections": [
    {
      "original": "Sentence exactly as written by the student containing a mistake",
      "corrected": "Corrected sentence with the grammar mistakes fixed",
      "explanation": "Explanation in Portuguese detailing the grammar rule and correct approach"
    }
  ],
  "overall_feedback": "General feedback in Portuguese about structure, vocabulary, and grammar, suggesting the correct approach.",
  "improved_version": "A complete, polished, natural, and advanced version of the student's paragraph."
}
`

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { question, userAnswer, studentLevel } = req.body

    if (!question || !userAnswer) {
      throw new Error('Missing question or userAnswer')
    }

    const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ API Key is missing')

    const promptData = {
      student_level: studentLevel || 'Intermediate',
      writing_prompt: question,
      student_answer: userAnswer
    }

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
          { role: 'user', content: `Analyze the student response: ${JSON.stringify(promptData)}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    })

    const groqData = await response.json()
    if (groqData.error) throw new Error(`GROQ Error: ${groqData.error.message}`)

    const evaluation = JSON.parse(groqData.choices[0].message.content)

    res.status(200).json(evaluation)

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
