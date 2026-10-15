import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { 
      studentId, 
      userId,
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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    const effectiveUserId = user?.id || userId

    if (!effectiveUserId && !studentId) {
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

    // 1. Update patients table
    let query = supabaseAdmin.from('patients').update({
      name: name || payload.studentName,
      cpf: cpf || payload.studentCpf,
      rg: rg || payload.studentRg,
      profession: profession || payload.studentProfession,
      address: address || payload.studentAddress,
      cep: cep || payload.studentCep,
      city: city || payload.studentCity,
      weekly_frequency: weeklyFrequency,
      contract_signed: true,
      contract_signed_at: new Date().toISOString(),
      contract_initials: initialsUrl,
      contract_signature: signatureUrl,
      contract_data: payload
    })

    if (studentId) {
      query = query.eq('id', studentId)
    } else if (effectiveUserId) {
      query = query.eq('user_id', effectiveUserId)
    }

    const { data: updatedPatient, error: updateErr } = await query.select('*').maybeSingle()

    if (updateErr) {
      console.error('Error updating patient contract:', updateErr)
    }

    // 2. Insert into student_contracts table
    const targetStudentId = studentId || updatedPatient?.id
    if (targetStudentId) {
      try {
        await supabaseAdmin.from('student_contracts').insert([{
          student_id: targetStudentId,
          teacher_id: updatedPatient?.psychologist_id || null,
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
      patient: updatedPatient || { contract_signed: true } 
    })
  } catch (err: any) {
    console.error('sign-contract handler error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno ao assinar contrato' })
  }
}
