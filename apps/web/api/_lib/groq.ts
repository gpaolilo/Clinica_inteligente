import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b'

export interface GroqPayload {
  messages: Array<{ role: string; content: string }>
  temperature?: number
  response_format?: { type: string }
  max_tokens?: number
  model?: string
}

export async function callGroqChat(payload: GroqPayload) {
  const groqKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ API Key is missing')

  const candidateModels = [
    payload.model,
    process.env.GROQ_MODEL,
    process.env.VITE_GROQ_MODEL,
    DEFAULT_GROQ_MODEL,
    'openai/gpt-oss-120b'
  ].filter(Boolean) as string[]

  const modelsToTry = [...new Set(candidateModels)]
  let lastError: any = null

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          model
        })
      })

      const groqData = await response.json()
      if (!groqData.error) {
        return groqData
      }

      lastError = groqData.error
      const errMsg = groqData.error.message || ''

      // If model not found or decommissioned, try next model candidate
      if (
        errMsg.includes('does not exist') ||
        errMsg.includes('not have access') ||
        errMsg.includes('decommissioned')
      ) {
        console.warn(`Groq model '${model}' failed with error: ${errMsg}. Attempting fallback...`)
        continue
      }

      // Other errors (auth, quota, bad request), throw immediately
      throw new Error(`GROQ Error: ${errMsg}`)
    } catch (err: any) {
      if (err.message?.startsWith('GROQ Error:')) {
        throw err
      }
      lastError = err
    }
  }

  throw new Error(`GROQ Error: ${lastError?.message || 'Failed to complete request with available Groq models.'}`)
}
