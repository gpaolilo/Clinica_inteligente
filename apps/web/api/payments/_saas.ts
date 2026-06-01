import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockSecretKey'
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
})

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate teacher
    const authClient = createAuthClient(req)
    const { data: { user: teacherUser }, error: authError } = await authClient.auth.getUser()

    if (authError || !teacherUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { action, planType, creditPack } = req.body

    if (action !== 'saas_subscribe' && action !== 'purchase_credits') {
      return res.status(400).json({ error: 'Invalid action parameter' })
    }

    // 2. Fetch or create Stripe Customer for the teacher
    let { data: stripeCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', teacherUser.id)
      .maybeSingle()

    let stripeCustomerId = stripeCustomer?.stripe_customer_id

    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: teacherUser.email,
          name: teacherUser.user_metadata?.full_name || 'Professor Flowike',
        })
        stripeCustomerId = customer.id

        await supabaseAdmin
          .from('stripe_customers')
          .insert([{
            user_id: teacherUser.id,
            stripe_customer_id: stripeCustomerId
          }])
      } catch (err: any) {
        console.error('Customer creation failed:', err)
        return res.status(500).json({ error: 'Failed to create stripe customer: ' + err.message })
      }
    }

    const baseUrl = process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'
    const successUrl = `${baseUrl}/dashboard/finance?billing=success`
    const cancelUrl = `${baseUrl}/dashboard/finance?billing=cancel`

    // --- Action 1: SaaS Subscription ---
    if (action === 'saas_subscribe') {
      if (!planType || !['STARTER', 'PRO', 'ACADEMY'].includes(planType.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid plan type' })
      }

      const plan = planType.toUpperCase()
      let planPrice = 19
      if (plan === 'PRO') planPrice = 49
      else if (plan === 'ACADEMY') planPrice = 99

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Flowike SaaS Plan - ${plan}`,
              description: `SaaS Subscription Plan for AI-powered teachers. Includes custom branding and booking features.`,
            },
            unit_amount: Math.round(planPrice * 100),
            recurring: { interval: 'month' }
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          teacher_id: teacherUser.id,
          type: 'SAAS',
          plan_type: plan,
          price_amount: String(planPrice)
        }
      }

      try {
        const session = await stripe.checkout.sessions.create(sessionConfig)
        
        await supabaseAdmin
          .from('payments')
          .insert([{
            payer_id: teacherUser.id,
            payee_id: null, // Goes to platform
            amount: planPrice,
            status: 'PENDING',
            type: 'SAAS',
            stripe_payment_intent_id: session.id
          }])

        return res.status(200).json({ url: session.url })
      } catch (err: any) {
        console.error('Stripe SaaS Session Error:', err)
        // Mock fallback for local dev
        const mockSessionId = 'saas_sess_' + Math.random().toString(36).substring(2, 10)
        const mockUrl = `${baseUrl}/dashboard/finance?billing=success_mock&plan_type=${plan}&session_id=${mockSessionId}`
        
        await supabaseAdmin
          .from('payments')
          .insert([{
            payer_id: teacherUser.id,
            payee_id: null,
            amount: planPrice,
            status: 'PENDING',
            type: 'SAAS',
            stripe_payment_intent_id: mockSessionId
          }])

        return res.status(200).json({ url: mockUrl, isMock: true })
      }
    }

    // --- Action 2: Purchase AI Credits ---
    if (action === 'purchase_credits') {
      if (!creditPack || !['500', '1500', '5000'].includes(creditPack)) {
        return res.status(400).json({ error: 'Invalid credit package' })
      }

      let packPrice = 10
      let creditsAdded = 500

      if (creditPack === '1500') {
        packPrice = 25
        creditsAdded = 1500
      } else if (creditPack === '5000') {
        packPrice = 75
        creditsAdded = 5000
      }

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: stripeCustomerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Flowike AI Pack - ${creditsAdded} Credits`,
              description: `Additional AI credits for generating homework, insights, and session reports.`,
            },
            unit_amount: Math.round(packPrice * 100),
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          teacher_id: teacherUser.id,
          type: 'CREDITS',
          credits_added: String(creditsAdded),
          price_amount: String(packPrice)
        }
      }

      try {
        const session = await stripe.checkout.sessions.create(sessionConfig)
        
        await supabaseAdmin
          .from('payments')
          .insert([{
            payer_id: teacherUser.id,
            payee_id: null, // Direct platform revenue
            amount: packPrice,
            status: 'PENDING',
            type: 'CREDITS',
            stripe_payment_intent_id: session.id
          }])

        return res.status(200).json({ url: session.url })
      } catch (err: any) {
        console.error('Stripe Credits Checkout Error:', err)
        // Mock fallback
        const mockSessionId = 'credits_sess_' + Math.random().toString(36).substring(2, 10)
        const mockUrl = `${baseUrl}/dashboard/finance?billing=success_mock&credits=${creditsAdded}&session_id=${mockSessionId}`
        
        await supabaseAdmin
          .from('payments')
          .insert([{
            payer_id: teacherUser.id,
            payee_id: null,
            amount: packPrice,
            status: 'PENDING',
            type: 'CREDITS',
            stripe_payment_intent_id: mockSessionId
          }])

        return res.status(200).json({ url: mockUrl, isMock: true })
      }
    }

  } catch (err: any) {
    console.error('SaaS checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
