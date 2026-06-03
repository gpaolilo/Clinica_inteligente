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

    const { action, planType, creditPack, source } = req.body

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
    let successUrl = `${baseUrl}/dashboard/finance?billing=success`
    let cancelUrl = `${baseUrl}/dashboard/finance?billing=cancel`

    if (source === 'onboarding') {
      successUrl = `${baseUrl}/onboarding?billing=success`
      cancelUrl = `${baseUrl}/onboarding?billing=cancel`
    } else if (source === 'settings') {
      successUrl = `${baseUrl}/dashboard/settings?billing=success`
      cancelUrl = `${baseUrl}/dashboard/settings?billing=cancel`
    }

    // --- Action 1: SaaS Subscription ---
    if (action === 'saas_subscribe') {
      if (!planType) {
        return res.status(400).json({ error: 'Plan type is required' })
      }

      // Fetch plan from database dynamically
      const { data: dbPlan, error: planErr } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('name', planType.toUpperCase())
        .eq('active', true)
        .maybeSingle()

      if (planErr || !dbPlan) {
        return res.status(400).json({ error: 'Invalid or inactive plan type' })
      }

      const plan = dbPlan.name
      const planPrice = Number(dbPlan.price)

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
        const mockSessionId = 'saas_sess_' + Math.random().toString(36).substring(2, 10)
        const redirectParam = source === 'onboarding' ? 'onboarding' : source === 'settings' ? 'dashboard/settings' : 'dashboard/finance'
        const mockUrl = `${baseUrl}/${redirectParam}?billing=success_mock&plan_type=${plan}&session_id=${mockSessionId}`
        
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
      if (!creditPack) {
        return res.status(400).json({ error: 'Credit pack size is required' })
      }

      // Fetch credit pack from database dynamically
      const { data: dbPack, error: packErr } = await supabaseAdmin
        .from('credit_packages')
        .select('*')
        .eq('credits', parseInt(creditPack, 10))
        .eq('active', true)
        .maybeSingle()

      if (packErr || !dbPack) {
        return res.status(400).json({ error: 'Invalid or inactive credit package' })
      }

      const packPrice = Number(dbPack.price)
      const creditsAdded = dbPack.credits

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
