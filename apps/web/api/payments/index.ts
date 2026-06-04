import checkoutHandler from './_checkout.js'
import connectHandler from './_connect.js'
import saasHandler from './_saas.js'
import webhookHandler from './_webhook.js'
import dashboardHandler from './_dashboard.js'
import ratesHandler from './_rates.js'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const action = parts[parts.length - 1]

  switch (action) {
    case 'checkout':
      return checkoutHandler(req, res)
    case 'connect':
      return connectHandler(req, res)
    case 'saas':
      return saasHandler(req, res)
    case 'webhook':
      return webhookHandler(req, res)
    case 'dashboard':
      return dashboardHandler(req, res)
    case 'rates':
      return ratesHandler(req, res)
    default:
      return res.status(404).json({ error: `Route not found: ${action}` })
  }
}
