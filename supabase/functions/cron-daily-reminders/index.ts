import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  // Webhook que escuta o cron (pg_cron) ou agendador externo diário
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    // Calcula datas do lembrete alvo (Sessões marcadas para amanhã)
    const tomorrowStart = new Date()
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    tomorrowStart.setHours(0,0,0,0)

    const tomorrowEnd = new Date(tomorrowStart)
    tomorrowEnd.setHours(23,59,59,999)

    const { data: upcomingSessions } = await supabase
      .from('sessions')
      .select('id, scheduled_date, patient:patients(name, phone)')
      .eq('status', 'SCHEDULED')
      .gte('scheduled_date', tomorrowStart.toISOString())
      .lte('scheduled_date', tomorrowEnd.toISOString())

    let sent = 0;
    if (upcomingSessions) {
      for (const sess of upcomingSessions) {
        // Enviar requisição para Meta/Twilio WhatsApp API...
        // template="lembrete_consulta", var={nome, data_hora}
        console.log(`Disparando envio LGPD para o paciente ID: ${sess.patient.name}`)
        sent++;
      }
    }
    
    // Da mesma forma, logica para faturas (Invoices) em atraso do Épico 7 farão a varredura
    // na tabela 'invoices' onde due_date < NOW() e status = 'OPEN'.

    return new Response(`Foram disparados ${sent} notificações de lembrete automatizado via cron.`, { status: 200 })
  } catch(err: any) {
    return new Response(err.message, { status: 500 })
  }
})
