import { IncomingMessage, ServerResponse } from 'http'

// In-memory cache for Vercel serverless function instances
let cachedRates: Record<string, number> | null = null
let lastFetched = 0
const CACHE_DURATION = 3600000 // 1 hour in milliseconds

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now()
  
  if (cachedRates && (now - lastFetched < CACHE_DURATION)) {
    return cachedRates
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 seconds timeout
    
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { 
      signal: controller.signal 
    })
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.result === 'success' && data.rates) {
        cachedRates = {
          usd: 1.0,
          brl: data.rates.BRL || 5.0,
          eur: data.rates.EUR || 0.9,
        }
        lastFetched = now
        console.log('Exchange rates updated successfully from open.er-api.com:', cachedRates)
        return cachedRates
      }
    }
  } catch (err) {
    console.error('Error fetching live exchange rates, using fallbacks:', err)
  }

  // Fallback if fetch fails or times out
  return {
    usd: 1.0,
    brl: 5.0,
    eur: 0.9,
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rates = await getExchangeRates()
    return res.status(200).json(rates)
  } catch (err: any) {
    console.error('Rates handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}
