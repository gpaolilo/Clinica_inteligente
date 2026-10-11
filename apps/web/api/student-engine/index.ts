import analyzeHandler from './_analyze.js'
import generateHomeworkHandler from './_generate-homework.js'
import profileHandler from './_profile.js'
import transcribeHandler from './_transcribe.js'
import evaluateWritingHandler from './_evaluate-writing.js'
import generateAssessmentHandler from './_generate-assessment.js'
import evaluateAssessmentHandler from './_evaluate-assessment.js'

export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '', 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const action = parts[parts.length - 1]

  switch (action) {
    case 'analyze':
      return analyzeHandler(req, res)
    case 'generate-homework':
      return generateHomeworkHandler(req, res)
    case 'profile':
      return profileHandler(req, res)
    case 'transcribe':
      return transcribeHandler(req, res)
    case 'evaluate-writing':
      return evaluateWritingHandler(req, res)
    case 'generate-assessment':
      return generateAssessmentHandler(req, res)
    case 'evaluate-assessment':
      return evaluateAssessmentHandler(req, res)
    default:
      return res.status(404).json({ error: `Route not found: ${action}` })
  }
}
