import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req) => {
  // Edge Function ativada via Webhook da gateway de pagamento (Ex: Stripe)
  const signature = req.headers.get("stripe-signature");

  try {
    const payload = await req.json()
    const type = payload.type 

    if (type === 'payment_intent.succeeded' || type === 'checkout.session.completed') {
      const metadata = payload.data.object.metadata; 
      const invoiceId = metadata.invoice_id; // Passado previamente no generate-link

      if (invoiceId) {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        
        // Liquida a Fatura
        await supabase.from('invoices').update({ status: 'PAID' }).eq('id', invoiceId)
        
        // Busca o paciente ligado ao invoice
        const { data: inv } = await supabase.from('invoices').select('patient:patients(phone)').eq('id', invoiceId).single()
        
        const phone = Array.isArray(inv?.patient) ? inv?.patient[0].phone : inv?.patient?.phone

        // (Opcional) Dispara na mesma hora um Whatsapp de "Recibo de Pagamento"
        if (phone) {
          console.log(`Disparando envio do Recibo para ${phone} provando a conciliação da fatura de baixa automática...`)
        }
      }
    }

    return new Response('Sucesso na reconciliação', { status: 200 })
  } catch (err: any) {
    return new Response(`Erro de segurança Webhook: ${err.message}`, { status: 400 })
  }
})
