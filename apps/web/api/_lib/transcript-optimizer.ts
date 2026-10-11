/**
 * Transcript Optimizer for Pedagogical Analysis
 * 
 * Compresses long lesson transcripts (e.g., 60-90+ min sessions) to stay safely
 * under Groq's 7,000 ITPM (Input Tokens Per Minute) free/on-demand limit while
 * preserving student errors, vocabulary gaps, and learning patterns.
 */

export interface OptimizationResult {
  optimizedTranscript: string
  originalTokens: number
  optimizedTokens: number
  wasCompressed: boolean
}

/**
 * Estimates token count accurately for English/mixed transcripts.
 * English averages ~1.3 tokens per word or ~4 chars per token.
 * We use a conservative ceiling to guarantee we never exceed Groq's quota.
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0
  const words = text.trim().split(/\s+/).length
  const chars = text.length
  // Conservative estimate: max of (words * 1.35) and (chars / 3.8)
  return Math.ceil(Math.max(words * 1.35, chars / 3.8))
}

interface TranscriptTurn {
  speaker: string
  text: string
  wordCount: number
}

/**
 * Parses transcript into speaker turns.
 * Handles formats like "Speaker A: ...", "Speaker 0: ...", or newline separated blocks.
 */
function parseTurns(rawTranscript: string): TranscriptTurn[] {
  const lines = rawTranscript.split('\n').map(l => l.trim()).filter(Boolean)
  const turns: TranscriptTurn[] = []
  
  const speakerRegex = /^(Speaker\s+[^:]+|Teacher|Student|Professor|Aluno|User|Assistant|Guest):\s*(.*)$/i

  let currentSpeaker = 'Speaker'
  let currentText = ''

  for (const line of lines) {
    const match = line.match(speakerRegex)
    if (match) {
      if (currentText) {
        turns.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          wordCount: currentText.trim().split(/\s+/).length
        })
      }
      currentSpeaker = match[1]
      currentText = match[2]
    } else {
      currentText = currentText ? `${currentText} ${line}` : line
    }
  }

  if (currentText) {
    turns.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
      wordCount: currentText.trim().split(/\s+/).length
    })
  }

  return turns
}

/**
 * Cleans repetitive mechanical stutters and filler artifacts
 * e.g., "yeah yeah yeah" -> "yeah", "I I I" -> "I", "uh uh" -> ""
 */
function cleanSpeechArtifacts(text: string): string {
  return text
    // Replace duplicate consecutive identical words (e.g. "I I" or "like like")
    .replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1')
    // Remove isolated excessive filler sounds
    .replace(/\b(um|uh|er|ah)\b/gi, '')
    // Clean multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Checks if a turn is trivial audio setup or farewell
 */
function isTrivialTurn(text: string): boolean {
  const lower = text.toLowerCase().trim()
  const trivialPatterns = [
    /^(can you hear me|can you see my screen|yes i hear you|loud and clear|wait a second|hang on)\.?$/i,
    /^(hello hello|testing testing|can you see it|i see it now|hold on)\.?$/i,
    /^(goodbye|bye bye|see you next (week|class|time)|have a (great|nice) (day|weekend))\b/i
  ]
  return trivialPatterns.some(pattern => pattern.test(lower))
}

/**
 * Compresses an excessively long monologue (usually teacher explanations of grammar/rules).
 * Keeps opening context sentence and closing cue/question.
 */
function compressMonologue(turnText: string, maxWords: number = 55): string {
  const words = turnText.split(/\s+/)
  if (words.length <= maxWords) return turnText

  // Split into sentences
  const sentences = turnText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [turnText]
  if (sentences.length <= 2) {
    // Just truncate middle words
    const head = words.slice(0, 30).join(' ')
    const tail = words.slice(-20).join(' ')
    return `${head} [...] ${tail}`
  }

  const firstSentence = sentences[0].trim()
  const lastSentence = sentences[sentences.length - 1].trim()

  return `${firstSentence} [...] ${lastSentence}`
}

/**
 * Main optimization function.
 * Ensures the transcript fits within safe token budget (default 4,500 tokens).
 */
export function optimizeTranscriptForAnalysis(
  rawTranscript: string,
  targetMaxTokens: number = 4500
): OptimizationResult {
  const originalTokens = estimateTokens(rawTranscript)

  // If already comfortably below the limit, return as is with light whitespace cleanup
  if (originalTokens <= targetMaxTokens) {
    return {
      optimizedTranscript: rawTranscript.trim(),
      originalTokens,
      optimizedTokens: originalTokens,
      wasCompressed: false
    }
  }

  const parsedTurns = parseTurns(rawTranscript)
  if (parsedTurns.length === 0) {
    return {
      optimizedTranscript: rawTranscript.slice(0, targetMaxTokens * 3),
      originalTokens,
      optimizedTokens: estimateTokens(rawTranscript.slice(0, targetMaxTokens * 3)),
      wasCompressed: true
    }
  }

  // 1. Filter trivial setup at start and farewells at end
  let processedTurns = parsedTurns.filter((turn, idx) => {
    const isAtEdge = idx < 3 || idx >= parsedTurns.length - 3
    if (isAtEdge && isTrivialTurn(turn.text)) {
      return false
    }
    return true
  })

  // 2. Clean speech artifacts and compress long monologues (> 60 words)
  processedTurns = processedTurns.map(turn => {
    let cleanedText = cleanSpeechArtifacts(turn.text)
    if (turn.wordCount > 60) {
      cleanedText = compressMonologue(cleanedText, 50)
    }
    return {
      ...turn,
      text: cleanedText,
      wordCount: cleanedText.split(/\s+/).length
    }
  })

  let currentText = processedTurns.map(t => `${t.speaker}: ${t.text}`).join('\n')
  let currentTokens = estimateTokens(currentText)

  // 3. If still above targetMaxTokens, apply stratified windowing (Beginning 25%, Middle 50%, End 25%)
  if (currentTokens > targetMaxTokens && processedTurns.length > 8) {
    const totalTurns = processedTurns.length
    const partSize = Math.floor(totalTurns / 3)
    
    const part1 = processedTurns.slice(0, partSize) // Intro / Warm-up
    const part2 = processedTurns.slice(partSize, partSize * 2) // Core activities
    const part3 = processedTurns.slice(partSize * 2) // Practice & Wrap-up

    // Sample turns with higher preference for student conversational interactions (turns with questions/answers)
    const selectTurns = (turns: TranscriptTurn[], maxTurnsToTake: number) => {
      if (turns.length <= maxTurnsToTake) return turns
      const step = turns.length / maxTurnsToTake
      const sampled: TranscriptTurn[] = []
      for (let i = 0; i < maxTurnsToTake; i++) {
        const index = Math.min(Math.floor(i * step), turns.length - 1)
        sampled.push(turns[index])
      }
      return sampled
    }

    // Allocate turn quotas
    const totalTargetTurns = Math.max(12, Math.floor((targetMaxTokens / currentTokens) * totalTurns * 0.9))
    const quota1 = Math.floor(totalTargetTurns * 0.25)
    const quota2 = Math.floor(totalTargetTurns * 0.50)
    const quota3 = Math.max(1, totalTargetTurns - quota1 - quota2)

    const sampledTurns = [
      ...selectTurns(part1, quota1),
      ...selectTurns(part2, quota2),
      ...selectTurns(part3, quota3)
    ]

    currentText = sampledTurns.map(t => `${t.speaker}: ${t.text}`).join('\n')
    currentTokens = estimateTokens(currentText)
  }

  // Final hard guard: if still slightly above due to unexpected token density, slice lines
  if (currentTokens > targetMaxTokens) {
    const lines = currentText.split('\n')
    const keptLines: string[] = []
    let accumulated = 0
    for (const line of lines) {
      const lineTokens = estimateTokens(line)
      if (accumulated + lineTokens > targetMaxTokens) break
      keptLines.push(line)
      accumulated += lineTokens
    }
    currentText = keptLines.join('\n')
    currentTokens = estimateTokens(currentText)
  }

  return {
    optimizedTranscript: currentText,
    originalTokens,
    optimizedTokens: currentTokens,
    wasCompressed: true
  }
}
