import { createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { audioUrl, sessionId, psychologistId, patientId } = req.body

    if (!audioUrl || !sessionId || !psychologistId || !patientId) {
      throw new Error('Missing required parameters')
    }

    const assemblyAiKey = process.env.VITE_ASSEMBLYAI_API_KEY || process.env.ASSEMBLYAI_API_KEY
    if (!assemblyAiKey) throw new Error('AssemblyAI API Key is missing')

    const supabaseAuth = createAuthClient(req)

    // Check if transcript already exists for this session
    const { data: existingTranscript } = await supabaseAuth
      .from('session_transcripts')
      .select('transcript')
      .eq('session_id', sessionId)
      .single()

    if (existingTranscript) {
      return res.status(200).json({ success: true, transcript: existingTranscript.transcript })
    }

    // 1. Submit audio to AssemblyAI
    const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ 
        audio_url: audioUrl,
        language_code: 'en',
        speech_models: ['universal-2'],
        speaker_labels: true
      })
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
    const words = transcriptData.words ? transcriptData.words.map((w: any) => ({
      word: w.text,
      start: w.start,
      end: w.end
    })) : []

    let formattedTranscript = transcriptData.text
    if (transcriptData.utterances && transcriptData.utterances.length > 0) {
      formattedTranscript = transcriptData.utterances.map((u: any) => `Speaker ${u.speaker}: ${u.text}`).join('\n')
    }

    const { error: dbError } = await supabaseAuth.from('session_transcripts').insert([{
      session_id: sessionId,
      psychologist_id: psychologistId,
      patient_id: patientId,
      transcript: formattedTranscript,
      words: words
    }])

    if (dbError) throw new Error(`Database Error: ${dbError.message}`)

    res.status(200).json({ success: true, transcript: formattedTranscript })

  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}
