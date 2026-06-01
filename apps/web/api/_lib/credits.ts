import { supabaseAdmin } from './supabase.js'

export async function consumeCredits(
  teacherId: string,
  featureKey: string,
  studentId: string | null = null,
  quantity: number = 1,
  description: string = ''
): Promise<{ success: boolean; creditsDeducted: number; remainingBalance: number; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('consume_teacher_credits', {
      p_teacher_id: teacherId,
      p_feature_id: featureKey,
      p_student_id: studentId || null,
      p_quantity: quantity,
      p_description: description
    })

    if (error) {
      console.error('Error invoking consume_teacher_credits RPC:', error)
      return { success: false, creditsDeducted: 0, remainingBalance: 0, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, creditsDeducted: 0, remainingBalance: 0, error: 'Nenhum retorno do motor de créditos.' }
    }

    // Since RPC returns a set of fields, data is an array or object depending on structure.
    // If it returns a TABLE, it comes as an array of rows.
    const result = Array.isArray(data) ? data[0] : data
    
    return {
      success: result.success,
      creditsDeducted: result.credits_deducted,
      remainingBalance: result.remaining_balance,
      error: result.error_message || undefined
    }
  } catch (err: any) {
    console.error('Credits engine unexpected error:', err)
    return { success: false, creditsDeducted: 0, remainingBalance: 0, error: err.message }
  }
}
