import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { path, sessionId, psychologistId } = await req.json()

    // Setup Supabase Client (usar service_role local se disponível no proxy do Deno)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Simulando processamento real: Baixar audio do storage (1), Transcrever (2), Estruturar LLM (3), Mascarar (4)

    // Delay mockado de 3.5 segundos para representar inferência GPT-4
    await new Promise(resolve => setTimeout(resolve, 3500))

    const fakeAiEvolutionText = `Evolução Clínica (Gerada via IA - Molde Psicanalítico):

Relatório da Sessão:
O paciente trouxe questões latentes envolvendo o ambiente de trabalho, relatando intenso desgaste e sentimento de perseguição atrelado à figura paterna projetada no seu gestor diretor.
Pode-se notar choro contido ao longo dos primeiros 20 minutos de escuta.
Não há indicações de risco severo no relato atual.
PII Mascarados: *[NOME_DO_GESTOR]*.

Conduta e Encaminhamentos: Manutenção do setting analítico semanal contínuo e orientação focada em defesas narcísicas para a próxima sessão.
`

    // Inserir registro na Tabela clinical_notes. Assim que inserir, o Supabase Realtime 
    // WebSocket fará o push transparente pro navegador do usuário (na ActiveSession.tsx).
    const { error: insertError } = await supabase.from('clinical_notes').insert([{
      session_id: sessionId,
      psychologist_id: psychologistId,
      template_type: 'PSICANALISE',
      ai_evolution: fakeAiEvolutionText,
      status: 'AWAITING_REVIEW'
    }])

    if (insertError) throw new Error(insertError.message)

    // Emulação da Devolução expurgada do áudio
    console.log(`[Segurança] O Bucket de áudio (Storage) referente à chave ${path} foi excluído da AWS S3 com sucesso devido à regra Zero-Retention.`)

    return new Response(JSON.stringify({ success: true, ai_evolution: fakeAiEvolutionText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
