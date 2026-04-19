import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  // Edge Function de Recepção do Webhook do WhatsApp/Twilio

  try {
    const payload = await req.json()
    // O payload de uma API do Whatsapp comumente envia dados de "Body" da mensagem.
    const messageBody = payload.text?.trim()
    const senderPhone = payload.from

    // Setup Client with Service Role to bypass RLS in background execution
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Encontra o paciente baseado no número do remetente
    const { data: patient } = await supabase.from('patients').select('id').eq('phone', senderPhone).single()
    
    if (patient && messageBody) {
       // Buscar a próxima sessão SCKEDULED daquele paciente
       const { data: session } = await supabase
         .from('sessions')
         .select('id')
         .eq('patient_id', patient.id)
         .eq('status', 'SCHEDULED')
         .order('scheduled_date', { ascending: true })
         .limit(1)
         .single()

       if (session) {
         // Interpretar a Resposta: "1" Confirmado, "2" Cancelado
         if (messageBody === '1') {
            await supabase.from('sessions').update({ status: 'CONFIRMED' }).eq('id', session.id)
            return new Response(JSON.stringify({ response: 'Status setado para CONFIRMADO' }), { status: 200 })
         } else if (messageBody === '2') {
            await supabase.from('sessions').update({ status: 'CANCELLED' }).eq('id', session.id)
            return new Response(JSON.stringify({ response: 'Status setado para CANCELADO' }), { status: 200 })
         }
       }
    }

    return new Response('Webhook Recebido sem ação.', { status: 200 })
  } catch (err: any) {
    return new Response(`Erro de Webhook: ${err.message}`, { status: 400 })
  }
})
