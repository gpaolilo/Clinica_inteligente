import availabilityHandler from './_availability.js'
import calendarHandler from './_calendar.js'
import googleHandler from './_google.js'
import kpisHandler from './_kpis.js'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const action = parts[parts.length - 1]

  switch (action) {
    case 'availability':
      return availabilityHandler(req, res)
    case 'calendar':
      return calendarHandler(req, res)
    case 'google':
      return googleHandler(req, res)
    case 'kpis':
      return kpisHandler(req, res)
    default:
      return res.status(404).json({ error: `Route not found: ${action}` })
  }
}
