import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    // 2. Identify the action based on request body fields
    const body = req.body

    // --- Action A: DELETE USER ---
    if (body.userId && !body.email && !body.requestId) {
      const { userId } = body
      const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      return res.status(200).json({ success: true, user: data.user })
    } 

    // --- Action B: INVITE USER ---
    if (body.email && body.role && !body.requestId) {
      const { email, name, role } = body
      const baseUrl = process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { 
          full_name: name, 
          role: role 
        },
        redirectTo: `${baseUrl}/login`
      })
      if (error) throw error
      return res.status(200).json({ success: true, user: data.user })
    }

    // --- Action C: TEACHER APPROVAL ---
    if (body.requestId && body.action) {
      const { requestId, action, adminNotes, rejectionMessage } = body
      
      const { data: request, error: fetchReqError } = await supabaseAdmin
        .from('teacher_signup_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchReqError || !request) {
        return res.status(404).json({ error: 'Teacher request not found' })
      }

      const { data: teacher } = await supabaseAdmin
        .from('psychologists')
        .select('id')
        .eq('email', request.email)
        .maybeSingle()

      const teacherId = teacher?.id
      let emailTriggered = ''

      if (action === 'approve') {
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

        if (teacherId) {
          const { error: updateTenantError } = await supabaseAdmin
            .from('tenants')
            .update({ status: 'ACTIVE' })
            .eq('owner_user_id', teacherId)
          if (updateTenantError) console.error('Error activating tenant:', updateTenantError)
        }

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

        if (teacherId) {
          const { error: updateTenantError } = await supabaseAdmin
            .from('tenants')
            .update({ status: 'REJECTED' })
            .eq('owner_user_id', teacherId)
          if (updateTenantError) console.error('Error updating tenant to REJECTED:', updateTenantError)
        }

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

      console.log('--- EMAIL SYSTEM SIMULATION ---')
      console.log(emailTriggered)
      console.log('--------------------------------')

      return res.status(200).json({ 
        success: true, 
        action,
        emailSent: true,
        emailContent: emailTriggered
      })
    }

    return res.status(400).json({ error: 'Invalid admin action request' })

  } catch (err: any) {
    console.error('Error processing admin action:', err)
    res.status(500).json({ error: err.message })
  }
}
