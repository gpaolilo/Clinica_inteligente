import { createAuthClient } from '../_lib/supabase.js'
import { callGroqChat } from '../_lib/groq.js'

const SYSTEM_PROMPTS: Record<string, string> = {
  job_interview: `You are conducting a professional job interview in English. You are the hiring manager.
Speak strictly in English, be professional, and ask relevant follow-up questions one at a time based on the candidate's responses.
Keep your responses realistic and relatively concise (no more than 3 sentences) to simulate a real conversation.
Do not output any introductory or meta-text. Dive straight into character.`,

  sales_pitch: `You are a skeptical potential client listening to a sales presentation in English.
Speak strictly in English. Ask challenging but realistic questions about cost, return on investment, ease of implementation, and product features.
Keep your responses concise (no more than 3 sentences) to allow the salesperson to reply.
Do not output any meta-text or preambles. Act in character.`,

  casual_chat: `You are a friendly acquaintance meeting the user for a casual coffee chat.
Speak strictly in English. Chat about daily life, hobbies, plans for the weekend, and general small talk.
Keep your tone warm, welcoming, informal, and conversational.
Ensure your responses are short (no more than 2-3 sentences) to foster natural turn-taking.
Do not output any preambles or out-of-character text.`
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { scenarioType, messages } = req.body

    if (!scenarioType || !messages || !Array.isArray(messages)) {
      throw new Error('Missing or invalid parameters')
    }


    // 1. Verify Authentication
    const supabaseAuth = createAuthClient(req)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized user' })
    }

    // 2. Select system prompt
    const systemPrompt = SYSTEM_PROMPTS[scenarioType] || 'You are a helpful language practice partner. Speak in English.'

    // 3. Format message history for GROQ
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ]

    // 4. Call GROQ API
    const groqData = await callGroqChat({
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 300
    })

    const replyContent = groqData.choices[0].message.content

    res.status(200).json({ success: true, message: replyContent })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
