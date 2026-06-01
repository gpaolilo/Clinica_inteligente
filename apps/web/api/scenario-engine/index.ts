import chatHandler from './_chat.js'
import evaluateHandler from './_evaluate.js'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const action = parts[parts.length - 1]

  switch (action) {
    case 'chat':
      return chatHandler(req, res)
    case 'evaluate':
      return evaluateHandler(req, res)
    default:
      return res.status(404).json({ error: `Route not found: ${action}` })
  }
}
