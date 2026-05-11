import { supabaseAdmin } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, name, role } = req.body

    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Define a URL base (produção ou enviada via header)
    const baseUrl = process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'
    
    // A função inviteUserByEmail enviará o email configurado nos templates do Supabase
    // O usuário convidado receberá um link mágico para se conectar/criar senha.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: name, 
        role: role 
      },
      redirectTo: `${baseUrl}/login`
    })

    if (error) {
      throw error
    }

    res.status(200).json({ success: true, user: data.user })
  } catch (err: any) {
    console.error('Error inviting user', err)
    res.status(500).json({ error: err.message })
  }
}
