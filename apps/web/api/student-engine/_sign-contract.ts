import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { 
      studentId, 
      userId,
      email,
      name,
      cpf,
      rg,
      profession,
      address,
      cep,
      city,
      weeklyFrequency = '2x na semana',
      initialsUrl,
      signatureUrl,
      contractPayload
    } = req.body

    const supabaseAuth = createAuthClient(req)
    let authUser: any = null
    try {
      const { data } = await supabaseAuth.auth.getUser()
      authUser = data?.user
    } catch (e) {
      console.warn('Could not extract auth user from token:', e)
    }

    const effectiveUserId = authUser?.id || userId
    const effectiveEmail = authUser?.email || email

    if (!effectiveUserId && !studentId && !effectiveEmail) {
      return res.status(400).json({ error: 'Identificação do aluno não fornecida' })
    }

    const payload = contractPayload || {
      studentName: name,
      studentCpf: cpf,
      studentRg: rg,
      studentProfession: profession,
      studentAddress: address,
      studentCep: cep,
      studentCity: city,
      weeklyFrequency: weeklyFrequency,
      signedDate: new Date().toISOString()
    }

    // 1. Locate the exact patient record in patients table
    let existingPatient: any = null

    // A. Check by studentId as primary key
    if (studentId) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('id', studentId)
        .maybeSingle()
      if (data) existingPatient = data
    }

    // B. Check by effectiveUserId
    if (!existingPatient && effectiveUserId) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle()
      if (data) existingPatient = data
    }

    // C. Check if studentId was passed as the user_id
    if (!existingPatient && studentId) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle()
      if (data) existingPatient = data
    }

    // D. Fallback: match by email (common when teacher created the student prior to login)
    if (!existingPatient && effectiveEmail) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .ilike('email', effectiveEmail.trim())
        .maybeSingle()
      if (data) existingPatient = data
    }

    // E. Fallback: match by name if client_type is ALUNO
    if (!existingPatient && name) {
      const { data } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('client_type', 'ALUNO')
        .ilike('name', name.trim())
        .maybeSingle()
      if (data) existingPatient = data
    }

    const targetPatientId = existingPatient?.id || studentId

    let updatedPatient: any = null

    if (targetPatientId) {
      const updateData: any = {
        name: name || payload.studentName || existingPatient?.name,
        cpf: cpf || payload.studentCpf || existingPatient?.cpf,
        rg: rg || payload.studentRg || existingPatient?.rg,
        profession: profession || payload.studentProfession || existingPatient?.profession,
        address: address || payload.studentAddress || existingPatient?.address,
        cep: cep || payload.studentCep || existingPatient?.cep,
        city: city || payload.studentCity || existingPatient?.city,
        weekly_frequency: weeklyFrequency,
        contract_signed: true,
        contract_signed_at: new Date().toISOString(),
        contract_initials: initialsUrl,
        contract_signature: signatureUrl,
        contract_data: payload
      }

      // Automatically link user_id if not linked yet
      if (effectiveUserId && (!existingPatient?.user_id || existingPatient.user_id !== effectiveUserId)) {
        updateData.user_id = effectiveUserId
      }

      const { data, error: updateErr } = await supabaseAdmin
        .from('patients')
        .update(updateData)
        .eq('id', targetPatientId)
        .select('*')
        .maybeSingle()

      if (updateErr) {
        console.error('Error updating patient contract:', updateErr)
      } else {
        updatedPatient = data
      }
    }

    // 2. Insert or update student_contracts table
    const contractStudentId = targetPatientId || effectiveUserId
    if (contractStudentId) {
      try {
        await supabaseAdmin.from('student_contracts').insert([{
          student_id: contractStudentId,
          teacher_id: updatedPatient?.psychologist_id || existingPatient?.psychologist_id || null,
          status: 'SIGNED',
          weekly_frequency: weeklyFrequency,
          contract_data: payload,
          initials_data_url: initialsUrl,
          signature_data_url: signatureUrl,
          signed_at: new Date().toISOString(),
          signer_ip: req.headers['x-forwarded-for'] || 'api-server',
          signer_user_agent: req.headers['user-agent'] || 'api-agent'
        }])
      } catch (cErr) {
        console.warn('student_contracts insert warning:', cErr)
      }
    }

    return res.status(200).json({ 
      success: true, 
      patient: updatedPatient || existingPatient || { contract_signed: true } 
    })
  } catch (err: any) {
    console.error('sign-contract handler error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao assinar contrato' })
  }
}
