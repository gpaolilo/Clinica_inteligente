import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

async function logSystemEmail(recipient: string, subject: string, bodyText: string) {
  try {
    const { error } = await supabaseAdmin
      .from('system_email_logs')
      .insert([{
        recipient,
        subject,
        body: bodyText,
        status: 'SENT'
      }])
    if (error) console.error('Error logging system email:', error)
  } catch (err) {
    console.error('Error logging system email:', err)
  }
}

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
    if (body.userId && !body.email && !body.requestId && !body.studentRequestId && body.action !== 'create_student_request') {
      const { userId } = body

      // A1. Get user email and role from Auth/Profiles for log cleanup
      let userEmail: string | undefined
      let userRole: string | undefined

      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        userEmail = authUser?.user?.email
      } catch (err) {
        console.warn('Could not fetch user email from auth:', err)
      }

      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, role')
          .eq('id', userId)
          .maybeSingle()
        if (profile) {
          userRole = profile.role
          if (!userEmail) userEmail = profile.email
        }
      } catch (err) {
        console.warn('Could not fetch user profile details:', err)
      }

      // A2. Perform cleanup in related tables
      
      // Delete system email logs
      if (userEmail) {
        await supabaseAdmin.from('system_email_logs').delete().eq('recipient', userEmail)
      }

      // Delete Stripe configurations
      await supabaseAdmin.from('stripe_customers').delete().eq('user_id', userId)
      await supabaseAdmin.from('stripe_subscriptions').delete().eq('user_id', userId)

      // Role-specific cleanups
      if (userRole === 'TEACHER' || userRole === 'PSYCHOLOGIST') {
        if (userEmail) {
          await supabaseAdmin.from('teacher_signup_requests').delete().eq('email', userEmail)
        }
        await supabaseAdmin.from('student_enrollment_requests').delete().eq('teacher_id', userId)
        await supabaseAdmin.from('stripe_connected_accounts').delete().eq('teacher_id', userId)
        await supabaseAdmin.from('onboarding_progress').delete().eq('teacher_id', userId)
        await supabaseAdmin.from('academy_profiles').delete().eq('teacher_id', userId)

        // Deleting the tenant will cascade delete settings, assets, drafts
        await supabaseAdmin.from('tenants').delete().eq('owner_user_id', userId)

        // Deleting the psychologist will cascade delete wallets, transactions, subscriptions, and patients (with all their sessions/notes/gamification)
        await supabaseAdmin.from('psychologists').delete().eq('id', userId)
      } else if (userRole === 'STUDENT' || userRole === 'PATIENT') {
        if (userEmail) {
          await supabaseAdmin.from('student_enrollment_requests').delete().eq('student_email', userEmail)
        }
        await supabaseAdmin.from('student_subscriptions').delete().eq('student_id', userId)

        // Deleting patient will cascade delete sessions, notes, gamification_profiles, achievements, scenario_sessions, vocab banks
        await supabaseAdmin.from('patients').delete().eq('user_id', userId)
        if (userEmail) {
          await supabaseAdmin.from('patients').delete().eq('email', userEmail)
        }
      }

      // Delete main profile record
      await supabaseAdmin.from('profiles').delete().eq('id', userId)

      // A3. Finally delete user from Auth
      const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return res.status(200).json({ success: true, user: data.user })
    } 

    // --- Action B: INVITE USER ---
    if (body.email && body.role && !body.requestId && !body.studentRequestId && body.action !== 'create_student_request') {
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

      // Log the email invite to system_email_logs
      const inviteEmailBody = `
        TO: ${email}
        SUBJECT: Você foi convidado para o Flowike! 🚀
        CONTENT:
        Olá ${name},
        Seu convite para se cadastrar como ${role === 'TEACHER' ? 'Professor' : role === 'PSYCHOLOGIST' ? 'Psicólogo' : role === 'STUDENT' ? 'Aluno' : 'Paciente'} na plataforma Flowike foi gerado.
        
        Clique no link abaixo para criar sua senha e ter acesso à sua conta:
        ${baseUrl}/login
      `
      await logSystemEmail(email, 'Você foi convidado para o Flowike! 🚀', inviteEmailBody)

      return res.status(200).json({ success: true, user: data.user })
    }

    // --- Action C: TEACHER APPROVAL ---
    if (body.requestId && body.action && !body.studentRequestId) {
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
        await logSystemEmail(request.email, 'Your Flowike academy is ready 🚀', emailTriggered)
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
        await logSystemEmail(request.email, 'Your Flowike request update', emailTriggered)
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

    // --- Action D: STUDENT ENROLLMENT ACTIONS ---
    if (body.studentRequestId && body.action) {
      const { studentRequestId, action, rejectionMessage } = body
      
      const { data: request, error: fetchReqError } = await supabaseAdmin
        .from('student_enrollment_requests')
        .select('*')
        .eq('id', studentRequestId)
        .single()

      if (fetchReqError || !request) {
        return res.status(404).json({ error: 'Student enrollment request not found' })
      }

      let emailTriggered = ''

      if (action === 'approve_student') {
        const { error: updateReqError } = await supabaseAdmin
          .from('student_enrollment_requests')
          .update({
            status: 'APPROVED',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id
          })
          .eq('id', studentRequestId)

        if (updateReqError) throw updateReqError

        // Check if student already exists
        const { data: existingPatient } = await supabaseAdmin
          .from('patients')
          .select('id, user_id')
          .eq('email', request.student_email)
          .eq('psychologist_id', request.teacher_id)
          .maybeSingle()

        let patientId = existingPatient?.id
        let userId = existingPatient?.user_id

        if (!patientId) {
          const { data: newPatient, error: insertPatientError } = await supabaseAdmin
            .from('patients')
            .insert([{
              name: request.student_name,
              email: request.student_email,
              phone: request.student_phone,
              client_type: 'ALUNO',
              student_level: request.student_level,
              student_goal: request.student_goal,
              status: 'ACTIVE',
              psychologist_id: request.teacher_id
            }])
            .select('id')
            .single()

          if (insertPatientError) throw insertPatientError
          patientId = newPatient.id
        }

        if (!userId) {
          const baseUrl = process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(request.student_email, {
            data: { 
              full_name: request.student_name, 
              role: 'STUDENT'
            },
            redirectTo: `${baseUrl}/login`
          })

          if (!inviteError && inviteData?.user) {
            userId = inviteData.user.id
            await supabaseAdmin
              .from('patients')
              .update({ user_id: userId })
              .eq('id', patientId)
          }
        }

        emailTriggered = `
          TO: ${request.student_email}
          SUBJECT: Matrícula Confirmada no Flowike! 🎓
          CONTENT:
          Olá ${request.student_name},
          Sua solicitação de matrícula para o curso do professor foi aprovada e confirmada!
          
          Você já pode acessar sua conta de estudante. Se for seu primeiro acesso, use o link de convite enviado ou defina sua senha no login.
          
          Acesse o link abaixo:
          ${process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'}/login
          
          Bons estudos!
        `
        await logSystemEmail(request.student_email, 'Matrícula Confirmada no Flowike! 🎓', emailTriggered)
      } else {
        const { error: updateReqError } = await supabaseAdmin
          .from('student_enrollment_requests')
          .update({
            status: 'REJECTED',
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id
          })
          .eq('id', studentRequestId)

        if (updateReqError) throw updateReqError

        emailTriggered = `
          TO: ${request.student_email}
          SUBJECT: Atualização sobre sua solicitação de matrícula
          CONTENT:
          Olá ${request.student_name},
          Agradecemos seu interesse em se matricular.
          Infelizmente, sua solicitação de matrícula não pôde ser aprovada ou processada neste momento.
          
          ${rejectionMessage ? `Mensagem de revisão: "${rejectionMessage}"` : ''}
          
          Se tiver dúvidas, por favor entre em contato com o administrador ou com o seu professor.
        `
        await logSystemEmail(request.student_email, 'Atualização sobre sua solicitação de matrícula', emailTriggered)
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

    // --- Action E: CREATE STUDENT ENROLLMENT REQUEST ---
    if (body.action === 'create_student_request') {
      const { studentName, studentEmail, studentPhone, teacherId, studentLevel, studentGoal } = body
      
      if (!studentName || !studentEmail || !studentPhone || !teacherId) {
        return res.status(400).json({ error: 'Missing required student enrollment request fields' })
      }

      const { data, error } = await supabaseAdmin
        .from('student_enrollment_requests')
        .insert([{
          student_name: studentName,
          student_email: studentEmail,
          student_phone: studentPhone,
          teacher_id: teacherId,
          student_level: studentLevel || null,
          student_goal: studentGoal || null,
          status: 'PENDING'
        }])
        .select('*')
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, request: data })
    }

    // --- Action F: CREATE PLAN ---
    if (body.action === 'create_plan') {
      const { name, price, studentLimit, includedCredits, billingCycle = 'monthly', featureIds = [] } = body
      
      const { data: plan, error: planErr } = await supabaseAdmin
        .from('plans')
        .insert([{
          name: name.toUpperCase(),
          price: parseFloat(price),
          student_limit: parseInt(studentLimit, 10),
          included_credits: parseInt(includedCredits, 10),
          billing_cycle: billingCycle,
          active: true
        }])
        .select('*')
        .single()

      if (planErr) throw planErr

      if (featureIds.length > 0) {
        const mappings = featureIds.map((fid: string) => ({
          plan_id: plan.id,
          feature_id: fid
        }))
        const { error: featErr } = await supabaseAdmin
          .from('plan_features')
          .insert(mappings)
        if (featErr) throw featErr
      }

      return res.status(200).json({ success: true, plan })
    }

    // --- Action G: EDIT PLAN ---
    if (body.action === 'edit_plan') {
      const { planId, name, price, studentLimit, includedCredits, billingCycle, featureIds = [] } = body
      
      const { data: plan, error: planErr } = await supabaseAdmin
        .from('plans')
        .update({
          name: name.toUpperCase(),
          price: parseFloat(price),
          student_limit: parseInt(studentLimit, 10),
          included_credits: parseInt(includedCredits, 10),
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .select('*')
        .single()

      if (planErr) throw planErr

      // Sync features: delete old mappings, insert new ones
      const { error: delErr } = await supabaseAdmin
        .from('plan_features')
        .delete()
        .eq('plan_id', planId)
      if (delErr) throw delErr

      if (featureIds.length > 0) {
        const mappings = featureIds.map((fid: string) => ({
          plan_id: planId,
          feature_id: fid
        }))
        const { error: featErr } = await supabaseAdmin
          .from('plan_features')
          .insert(mappings)
        if (featErr) throw featErr
      }

      return res.status(200).json({ success: true, plan })
    }

    // --- Action H: ARCHIVE PLAN ---
    if (body.action === 'archive_plan') {
      const { planId } = body
      const { data: plan, error: planErr } = await supabaseAdmin
        .from('plans')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .select('*')
        .single()

      if (planErr) throw planErr
      return res.status(200).json({ success: true, plan })
    }

    // --- Action I: DUPLICATE PLAN ---
    if (body.action === 'duplicate_plan') {
      const { planId } = body
      
      // Fetch plan to duplicate
      const { data: srcPlan, error: fetchErr } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (fetchErr) throw fetchErr

      // Fetch features associated with source plan
      const { data: srcFeats } = await supabaseAdmin
        .from('plan_features')
        .select('feature_id')
        .eq('plan_id', planId)

      const dupName = `${srcPlan.name} COPY`
      
      const { data: dupPlan, error: insertErr } = await supabaseAdmin
        .from('plans')
        .insert([{
          name: dupName.toUpperCase(),
          price: srcPlan.price,
          student_limit: srcPlan.student_limit,
          included_credits: srcPlan.included_credits,
          billing_cycle: srcPlan.billing_cycle,
          active: true
        }])
        .select('*')
        .single()

      if (insertErr) throw insertErr

      if (srcFeats && srcFeats.length > 0) {
        const mappings = srcFeats.map((f: any) => ({
          plan_id: dupPlan.id,
          feature_id: f.feature_id
        }))
        const { error: featErr } = await supabaseAdmin
          .from('plan_features')
          .insert(mappings)
        if (featErr) throw featErr
      }

      return res.status(200).json({ success: true, plan: dupPlan })
    }

    // --- Action J: UPDATE FEATURE COSTS ---
    if (body.action === 'update_feature_costs') {
      const { costs } = body // Array of { id, cost }
      for (const item of costs) {
        const { error } = await supabaseAdmin
          .from('feature_costs')
          .update({ cost: parseInt(item.cost, 10), updated_at: new Date().toISOString() })
          .eq('id', item.id)
        if (error) throw error
      }
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid admin action request' })

  } catch (err: any) {
    console.error('Error processing admin action:', err)
    res.status(500).json({ error: err.message })
  }
}
