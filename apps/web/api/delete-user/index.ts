import { supabaseAdmin } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId field' })
    }

    // Deleta o usuário do Supabase Auth (isso vai disparar cascade na maioria das tabelas)
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      throw error
    }

    res.status(200).json({ success: true, user: data.user })
  } catch (err: any) {
    console.error('Error deleting user', err)
    res.status(500).json({ error: err.message })
  }
}
