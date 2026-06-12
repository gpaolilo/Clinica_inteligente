import { supabaseAdmin } from '../_lib/supabase.js'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || 'sk_test_51MockSecretKey'
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
})

// Vercel serverless function config to read raw body if verifying signature
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper to read request body stream as text/raw
async function getRawBody(readable: any): Promise<string> {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  
  let event: Stripe.Event
  let rawBody = ''

  try {
    rawBody = await getRawBody(req)
    
    if (sig && webhookSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      // In development / mock mode, parse raw body directly
      console.warn('Stripe webhook signature validation skipped (no secret/sig found). Parsing directly.')
      event = JSON.parse(rawBody)
    }
  } catch (err: any) {
    console.error('Webhook Error parsing raw body:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    console.log(`Processing Stripe Event: ${event.type}`)

    switch (event.type) {
      // --- Checkout Session Completed (Primary Success Trigger) ---
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = session.metadata || {}
        const type = metadata.type // 'PRODUCT', 'SAAS', 'CREDITS'

        const productId = metadata.product_id

        console.log(`Checkout Completed: Type = ${type}, SessionId = ${session.id}`)

        // Update payment record status in local DB
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'SUCCEEDED',
            ...(productId ? { product_id: productId } : {}),
            stripe_payment_intent_id: session.payment_intent as string || session.id
          })
          .eq('stripe_payment_intent_id', session.id)

        // Case A: Student buys a class product
        if (type === 'PRODUCT') {
          const payerId = metadata.payer_id
          const payeeId = metadata.payee_id
          const productId = metadata.product_id
          const classesIncluded = parseInt(metadata.classes_included || '1', 10)
          const priceAmount = parseFloat(metadata.price_amount || '0')

          // Fetch product details from DB
          const { data: prod } = await supabaseAdmin
            .from('teacher_products')
            .select('product_type, ai_credits_included')
            .eq('id', productId)
            .maybeSingle()

          const aiCreditsIncluded = prod?.ai_credits_included || 0

          // Find student (patient) in local database to update status and activate
          const { data: student } = await supabaseAdmin
            .from('patients')
            .select('id, status, class_balance, ai_credits_balance, name')
            .eq('user_id', payerId)
            .eq('psychologist_id', payeeId)
            .maybeSingle()

          if (student) {
            const newBalance = (student.class_balance || 0) + classesIncluded
            const newAiBalance = (student.ai_credits_balance || 0) + aiCreditsIncluded

            // Update student status to active (enforces seat limit via trigger) and balances
            const { error: patientErr } = await supabaseAdmin
              .from('patients')
              .update({ 
                status: 'ACTIVE',
                class_balance: newBalance,
                ai_credits_balance: newAiBalance
              })
              .eq('id', student.id)

            if (patientErr) {
              console.error('Error activating student / applying seat limit:', patientErr)
              // Log the seat limit failure to admin alerts if triggered
              if (patientErr.message.includes('limit')) {
                await supabaseAdmin
                  .from('admin_alerts')
                  .insert([{
                    type: 'failed_payment',
                    title: 'Limite de Assentos Excedido no Webhook',
                    description: `Erro ao ativar o aluno ${student.id} para o professor ${payeeId}. Motivo: ${patientErr.message}`,
                    status: 'active'
                  }])
              }
            } else {
              // Record seat mapping in student_seats
              await supabaseAdmin
                .from('student_seats')
                .insert([{
                  teacher_id: payeeId,
                  student_id: student.id,
                  active: true
                }])
                .onConflictDoUpdate({
                  constraint: 'student_seats_teacher_id_student_id_key',
                  set: { active: true, assigned_at: new Date().toISOString() }
                })

              // If AI credits are bundled in this purchase, deduct them from the teacher's wallet
              if (aiCreditsIncluded > 0) {
                const { data: teacherWallet } = await supabaseAdmin
                  .from('teacher_wallets')
                  .select('current_balance')
                  .eq('teacher_id', payeeId)
                  .maybeSingle()

                if (teacherWallet) {
                  const nextBalance = (teacherWallet.current_balance || 0) - aiCreditsIncluded
                  await supabaseAdmin
                    .from('teacher_wallets')
                    .update({
                      current_balance: nextBalance,
                      updated_at: new Date().toISOString()
                    })
                    .eq('teacher_id', payeeId)
                }

                // Log a deduction transaction for the teacher
                const { data: payment } = await supabaseAdmin
                  .from('payments')
                  .select('id')
                  .eq('stripe_payment_intent_id', session.payment_intent as string || session.id)
                  .maybeSingle()

                await supabaseAdmin
                  .from('credit_transactions')
                  .insert([{
                    teacher_id: payeeId,
                    type: 'consumption',
                    amount: -aiCreditsIncluded,
                    source: 'credits_sale',
                    reference_id: payment?.id || session.id,
                    description: `Venda de ${aiCreditsIncluded} créditos de IA para o aluno ${student.name || ''}`
                  }])
              }
            }
          }

          if (prod && prod.product_type === 'MONTHLY_SUBSCRIPTION') {
            // Save to student_subscriptions
            await supabaseAdmin
              .from('student_subscriptions')
              .insert([{
                student_id: payerId,
                teacher_id: payeeId,
                stripe_subscription_id: session.subscription as string || ('sub_' + Math.random().toString(36).substring(2, 10)),
                status: 'ACTIVE',
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              }])
              .onConflictDoUpdate({
                constraint: 'student_subscriptions_stripe_subscription_id_key',
                set: { status: 'ACTIVE', current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
              })
          }

          // Log split calculations in payment_transactions with 0% platform fee
          const stripeFee = (priceAmount * 0.039) + 0.30; // Estimated Stripe Fee (3.9% + $0.30)
          const netAmount = priceAmount - stripeFee

          const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('id')
            .eq('stripe_payment_intent_id', session.payment_intent as string || session.id)
            .maybeSingle()

          if (payment) {
            await supabaseAdmin
              .from('payment_transactions')
              .insert([{
                payment_id: payment.id,
                gross_amount: priceAmount,
                net_amount: netAmount,
                platform_fee: 0.00,
                stripe_fee: stripeFee,
                status: 'SUCCEEDED'
              }])
          }
        }

        // Case B: Teacher subscribes to SaaS Plan
        if (type === 'SAAS') {
          const teacherId = metadata.teacher_id
          const planName = metadata.plan_type as string
          const priceAmount = parseFloat(metadata.price_amount || '0')
          const currentPeriodEnd = new Date()
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // 1 month cycle

          // Fetch plan details from plans table
          const { data: dbPlan } = await supabaseAdmin
            .from('plans')
            .select('id, included_credits')
            .eq('name', planName.toUpperCase())
            .maybeSingle()

          const planId = dbPlan?.id
          const creditsToGrant = dbPlan?.included_credits || 8000

          // Update plan in psychologists table (trigger will sync plan_type/plan_id and wallets)
          await supabaseAdmin
            .from('psychologists')
            .update({ 
              plan_type: planName,
              plan_id: planId 
            })
            .eq('id', teacherId)

          // Log teacher subscription
          if (planId) {
            await supabaseAdmin
              .from('teacher_subscriptions')
              .insert([{
                teacher_id: teacherId,
                plan_id: planId,
                stripe_subscription_id: session.subscription as string || ('sub_saas_' + Math.random().toString(36).substring(2, 10)),
                status: 'ACTIVE',
                current_period_end: currentPeriodEnd.toISOString()
              }])
              .onConflictDoUpdate({
                constraint: 'teacher_subscriptions_teacher_id_key',
                set: {
                  plan_id: planId,
                  status: 'ACTIVE',
                  current_period_end: currentPeriodEnd.toISOString(),
                  updated_at: new Date().toISOString()
                }
              })
          }

          // Let's also update the teacher_wallets balance with allocation
          const { data: wallet } = await supabaseAdmin
            .from('teacher_wallets')
            .select('current_balance')
            .eq('teacher_id', teacherId)
            .maybeSingle()

          if (wallet) {
            await supabaseAdmin
              .from('teacher_wallets')
              .update({ 
                current_balance: wallet.current_balance + creditsToGrant,
                monthly_allocation: creditsToGrant,
                updated_at: new Date().toISOString()
              })
              .eq('teacher_id', teacherId)

            // Log AI transaction credit addition
            await supabaseAdmin
              .from('credit_transactions')
              .insert([{
                teacher_id: teacherId,
                type: 'allocation',
                amount: creditsToGrant,
                source: 'saas_plan_grant',
                reference_id: session.id,
                description: `Alocação mensal de créditos do plano ${planName}`
              }])
          }

          // Record platform SaaS revenue
          await supabaseAdmin
            .from('platform_revenue')
            .insert([{
              source_type: 'SAAS',
              amount: priceAmount,
              stripe_payment_id: session.id
            }])

          // Create invoice
          await supabaseAdmin
            .from('platform_invoices')
            .insert([{
              teacher_id: teacherId,
              amount: priceAmount,
              status: 'PAID',
              invoice_number: 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
              pdf_url: session.hosted_invoice_url || ''
            }])
        }

        // Case C: Teacher purchases AI Credits
        if (type === 'CREDITS') {
          const teacherId = metadata.teacher_id
          const creditsAdded = parseInt(metadata.credits_added || '5000', 10)
          const priceAmount = parseFloat(metadata.price_amount || '0')

          // Update teacher wallet
          const { data: wallet } = await supabaseAdmin
            .from('teacher_wallets')
            .select('current_balance')
            .eq('teacher_id', teacherId)
            .maybeSingle()

          if (wallet) {
            await supabaseAdmin
              .from('teacher_wallets')
              .update({ 
                current_balance: wallet.current_balance + creditsAdded,
                credits_purchased: wallet.credits_purchased + creditsAdded,
                updated_at: new Date().toISOString()
              })
              .eq('teacher_id', teacherId)
          } else {
            await supabaseAdmin
              .from('teacher_wallets')
              .insert([{ 
                teacher_id: teacherId, 
                current_balance: creditsAdded,
                credits_purchased: creditsAdded,
                monthly_allocation: 0
              }])
          }

          // Log transaction
          await supabaseAdmin
            .from('credit_transactions')
            .insert([{
              teacher_id: teacherId,
              type: 'purchase',
              amount: creditsAdded,
              source: 'credit_store_purchase',
              reference_id: session.id,
              description: `Compra de pacote de ${creditsAdded} créditos de IA`
            }])

          // Record platform AI sales revenue
          await supabaseAdmin
            .from('platform_revenue')
            .insert([{
              source_type: 'AI_CREDITS',
              amount: priceAmount,
              stripe_payment_id: session.id
            }])
        }

        break
      }

      // --- Stripe Subscription Updates ---
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status = subscription.status

        // Sync subscription statuses in database
        if (status === 'canceled' || status === 'unpaid') {
          await supabaseAdmin
            .from('platform_subscriptions')
            .update({ status: 'CANCELLED' })
            .eq('id', subscription.id)
        }
        break
      }

      // --- Connect Account Updates ---
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const stripeAccountId = account.id
        
        const detailsSubmitted = account.details_submitted || false
        const chargesEnabled = account.charges_enabled || false
        const payoutsEnabled = account.payouts_enabled || false

        let status = 'PENDING'
        if (chargesEnabled && payoutsEnabled) {
          status = 'ACTIVE'
        } else if (detailsSubmitted) {
          status = 'PENDING'
        } else {
          status = 'RESTRICTED'
        }

        // Sync local DB stripe connected status
        const { data: connectedAccount } = await supabaseAdmin
          .from('stripe_connected_accounts')
          .update({
            status,
            details_submitted: detailsSubmitted,
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', stripeAccountId)
          .select('teacher_id')
          .maybeSingle()

        if (connectedAccount?.teacher_id) {
          await supabaseAdmin
            .from('psychologists')
            .update({
              stripe_onboarding_completed: detailsSubmitted,
              stripe_charges_enabled: chargesEnabled,
              stripe_payouts_enabled: payoutsEnabled
            })
            .eq('id', connectedAccount.teacher_id)
        }
        break
      }

      // --- Payout Webhooks ---
      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout
        
        // Find connected account mapping
        const stripeAccountId = event.account // Connect account ID triggering the webhook
        if (stripeAccountId) {
          const { data: conn } = await supabaseAdmin
            .from('stripe_connected_accounts')
            .select('teacher_id')
            .eq('stripe_account_id', stripeAccountId)
            .maybeSingle()

          if (conn?.teacher_id) {
            await supabaseAdmin
              .from('payouts')
              .insert([{
                teacher_id: conn.teacher_id,
                amount: payout.amount / 100.0,
                currency: payout.currency.toUpperCase(),
                status: 'PAID',
                stripe_payout_id: payout.id,
                estimated_arrival: new Date(payout.arrival_date * 1000).toISOString()
              }])
          }
        }
        break
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout
        const stripeAccountId = event.account
        if (stripeAccountId) {
          const { data: conn } = await supabaseAdmin
            .from('stripe_connected_accounts')
            .select('teacher_id')
            .eq('stripe_account_id', stripeAccountId)
            .maybeSingle()

          if (conn?.teacher_id) {
            await supabaseAdmin
              .from('payouts')
              .insert([{
                teacher_id: conn.teacher_id,
                amount: payout.amount / 100.0,
                currency: payout.currency.toUpperCase(),
                status: 'FAILED',
                stripe_payout_id: payout.id
              }])
          }
        }
        break
      }
    }

    res.status(200).json({ received: true })
  } catch (err: any) {
    console.error('Webhook event handling failure:', err)
    res.status(500).json({ error: 'Webhook handler failed: ' + err.message })
  }
}
