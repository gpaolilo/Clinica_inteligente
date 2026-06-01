import { supabaseAdmin } from '../_lib/supabase.js'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockSecretKey'
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

        console.log(`Checkout Completed: Type = ${type}, SessionId = ${session.id}`)

        // Update payment record status in local DB
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'SUCCEEDED',
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

          // Find student (patient) in local database to update class balance
          const { data: student } = await supabaseAdmin
            .from('patients')
            .select('id, class_balance')
            .eq('user_id', payerId)
            .eq('psychologist_id', payeeId)
            .maybeSingle()

          if (student) {
            const newBalance = (student.class_balance || 0) + classesIncluded
            await supabaseAdmin
              .from('patients')
              .update({ class_balance: newBalance })
              .eq('id', student.id)
            console.log(`Granted ${classesIncluded} classes to student ${student.id}. New Balance = ${newBalance}`)
          }

          // Fetch teacher plan for revenue share recording
          const { data: teacher } = await supabaseAdmin
            .from('psychologists')
            .select('plan_type')
            .eq('id', payeeId)
            .single()

          const plan = (teacher?.plan_type || 'STARTER').toUpperCase()
          const { data: rule } = await supabaseAdmin
            .from('revenue_share_rules')
            .select('percentage')
            .eq('plan_type', plan)
            .maybeSingle()

          const percentage = rule ? Number(rule.percentage) : 10.0
          const platformFee = (priceAmount * percentage) / 100.0
          const stripeFee = (priceAmount * 0.039) + 0.30; // Estimated Stripe Fee (3.9% + $0.30)
          const netAmount = priceAmount - platformFee - stripeFee

          // Log split calculations in payment_transactions
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
                platform_fee: platformFee,
                stripe_fee: stripeFee,
                status: 'SUCCEEDED'
              }])
          }

          // Record platform revenue share income
          await supabaseAdmin
            .from('platform_revenue')
            .insert([{
              source_type: 'REVSHARE',
              amount: platformFee,
              stripe_payment_id: session.id
            }])
        }

        // Case B: Teacher subscribes to SaaS Plan
        if (type === 'SAAS') {
          const teacherId = metadata.teacher_id
          const plan = metadata.plan_type as string
          const priceAmount = parseFloat(metadata.price_amount || '0')
          const currentPeriodEnd = new Date()
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // 1 month cycle

          // Update plan in psychologists table
          await supabaseAdmin
            .from('psychologists')
            .update({ plan_type: plan })
            .eq('id', teacherId)

          // Log platform subscription
          await supabaseAdmin
            .from('platform_subscriptions')
            .insert([{
              teacher_id: teacherId,
              plan_type: plan,
              status: 'ACTIVE',
              current_period_end: currentPeriodEnd.toISOString()
            }])

          // Grant Plan AI credits
          let creditsToGrant = 50
          if (plan === 'PRO') creditsToGrant = 500
          else if (plan === 'ACADEMY') creditsToGrant = 2000

          const { data: wallet } = await supabaseAdmin
            .from('ai_wallets')
            .select('balance')
            .eq('teacher_id', teacherId)
            .maybeSingle()

          if (wallet) {
            await supabaseAdmin
              .from('ai_wallets')
              .update({ balance: wallet.balance + creditsToGrant })
              .eq('teacher_id', teacherId)
          } else {
            await supabaseAdmin
              .from('ai_wallets')
              .insert([{ teacher_id: teacherId, balance: creditsToGrant }])
          }

          // Log AI transaction credit addition (use negative credits_used to represent addition)
          await supabaseAdmin
            .from('ai_transactions')
            .insert([{
              teacher_id: teacherId,
              action: 'PURCHASE',
              credits_used: -creditsToGrant
            }])

          // Record platform SaaS revenue
          await supabaseAdmin
            .from('platform_revenue')
            .insert([{
              source_type: 'SAAS',
              amount: priceAmount,
              stripe_payment_id: session.id
            }])
        }

        // Case C: Teacher purchases AI Credits
        if (type === 'CREDITS') {
          const teacherId = metadata.teacher_id
          const creditsAdded = parseInt(metadata.credits_added || '500', 10)
          const priceAmount = parseFloat(metadata.price_amount || '0')

          // Update AI wallet
          const { data: wallet } = await supabaseAdmin
            .from('ai_wallets')
            .select('balance')
            .eq('teacher_id', teacherId)
            .maybeSingle()

          if (wallet) {
            await supabaseAdmin
              .from('ai_wallets')
              .update({ balance: wallet.balance + creditsAdded })
              .eq('teacher_id', teacherId)
          } else {
            await supabaseAdmin
              .from('ai_wallets')
              .insert([{ teacher_id: teacherId, balance: creditsAdded }])
          }

          // Log AI transaction credit addition
          await supabaseAdmin
            .from('ai_transactions')
            .insert([{
              teacher_id: teacherId,
              action: 'PURCHASE',
              credits_used: -creditsAdded
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
