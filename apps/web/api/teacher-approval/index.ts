import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate caller and verify they are an ADMIN
    const authClient = createAuthClient(req)
    const { data: { user: adminUser }, error: authError } = await authClient.auth.getUser()

    if (authError || !adminUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (profileError || adminProfile?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admins only' })
    }

    // 2. Fetch parameters
    const { requestId, action, adminNotes, rejectionMessage } = req.body

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Missing or invalid parameters' })
    }

    // 3. Fetch the teacher signup request
    const { data: request, error: fetchReqError } = await supabaseAdmin
      .from('teacher_signup_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchReqError || !request) {
      return res.status(404).json({ error: 'Teacher request not found' })
    }

    // 4. Resolve the teacher user ID using their email from the psychologists table
    const { data: teacher, error: fetchTeacherError } = await supabaseAdmin
      .from('psychologists')
      .select('id')
      .eq('email', request.email)
      .maybeSingle()

    const teacherId = teacher?.id

    let emailTriggered = ''

    if (action === 'approve') {
      // Approve Request
      const { error: updateReqError } = await supabaseAdmin
        .from('teacher_signup_requests')
        .update({
          status: 'APPROVED',
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id
        })
        .eq('id', requestId)

      if (updateReqError) throw updateReqError

      // Activate Tenant if teacher exists in db
      if (teacherId) {
        const { error: updateTenantError } = await supabaseAdmin
          .from('tenants')
          .update({ status: 'ACTIVE' })
          .eq('owner_user_id', teacherId)

        if (updateTenantError) {
          console.error('Error activating tenant:', updateTenantError)
        }
      }

      // Simulate Email 2 — Approved
      emailTriggered = `
        TO: ${request.email}
        SUBJECT: Your Flowike academy is ready 🚀
        CONTENT:
        Olá ${request.full_name},
        Boas notícias! Sua solicitação de acesso ao Flowike foi aprovada por nossa equipe.
        
        Você já pode acessar sua conta e configurar a sua academia personalizada com sua marca, cores e logo.
        
        Acesse o link abaixo para concluir a configuração:
        ${process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'}/login
        
        Seja muito bem-vindo!
      `
    } else {
      // Reject Request
      const { error: updateReqError } = await supabaseAdmin
        .from('teacher_signup_requests')
        .update({
          status: 'REJECTED',
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id
        })
        .eq('id', requestId)

      if (updateReqError) throw updateReqError

      // Deactivate/Reject Tenant if teacher exists in db
      if (teacherId) {
        const { error: updateTenantError } = await supabaseAdmin
          .from('tenants')
          .update({ status: 'REJECTED' })
          .eq('owner_user_id', teacherId)

        if (updateTenantError) {
          console.error('Error updating tenant to REJECTED:', updateTenantError)
        }
      }

      // Simulate Email 3 — Rejected
      emailTriggered = `
        TO: ${request.email}
        SUBJECT: Your Flowike request update
        CONTENT:
        Olá ${request.full_name},
        Agradecemos seu interesse no Flowike.
        Sua solicitação de acesso foi revisada por nossa equipe e, infelizmente, não pudemos aprová-la neste momento.
        
        ${rejectionMessage ? `Mensagem de revisão: "${rejectionMessage}"` : ''}
        
        Se tiver alguma dúvida, entre em contato respondendo a este e-mail.
      `
    }

    // Log the simulated email to output
    console.log('--- EMAIL SYSTEM SIMULATION ---')
    console.log(emailTriggered)
    console.log('--------------------------------')

    res.status(200).json({ 
      success: true, 
      action,
      emailSent: true,
      emailContent: emailTriggered
    })
  } catch (err: any) {
    console.error('Error processing teacher approval:', err)
    res.status(500).json({ error: err.message })
  }
}
