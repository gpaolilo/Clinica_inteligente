import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { "Access-Control-Allow-Origin": "*" } })
  }

  try {
    const { phone, patientId } = await req.json()

    // Mock da integração com API Oficial do WhatsApp
    // Ex: await fetch('https://api.twilio.com/...', { method: 'POST', body: ... })
    
    console.log(`[EDGE FUNCTION] Disparando Template "consentimento_lgpd" via WhatsApp`)
    console.log(`Telefone: ${phone} | ID Paciente Relacionado: ${patientId}`)

    // Quando o paciente clicar no "Aceito" lá pelo WhatsApp,
    // um webhook reverso enviará uma request para nosso Supabase e
    // faremos "UPDATE patients SET lgpd_consent = true" no banco!

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mensagem instruindo consentimento da gravação (LGPD) enviada com sucesso para mensageria assíncrona." 
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
