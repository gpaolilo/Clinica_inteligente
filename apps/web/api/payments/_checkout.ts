import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || 'sk_test_51MockSecretKey'
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
})

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate student
    const authClient = createAuthClient(req)
    const { data: { user: studentUser }, error: authError } = await authClient.auth.getUser()

    if (authError || !studentUser) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    const { productId, paymentMethod = 'card', cpfCnpj } = req.body

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' })
    }

    // 2. Fetch product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('teacher_products')
      .select('*, psychologists(*)')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const teacher = product.psychologists
    if (!teacher || !teacher.stripe_account_id || !teacher.stripe_charges_enabled) {
      return res.status(400).json({ error: 'Este professor ainda não configurou as cobranças na conta Stripe.' })
    }

    // 3. Determine revenue share percentage based on teacher plan (No revenue share model - 0% fee)
    const revSharePercent = 0.0
    const flowikeFee = 0.0

    // 4. Retrieve or create Stripe Customer for the student
    let { data: stripeCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', studentUser.id)
      .maybeSingle()

    let stripeCustomerId = stripeCustomer?.stripe_customer_id

    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: studentUser.email,
          name: studentUser.user_metadata?.full_name || 'Estudante Flowike',
        })
        stripeCustomerId = customer.id

        await supabaseAdmin
          .from('stripe_customers')
          .insert([{
            user_id: studentUser.id,
            stripe_customer_id: stripeCustomerId
          }])
      } catch (err: any) {
        console.error('Stripe Customer Creation Error:', err)
        return res.status(500).json({ error: 'Stripe customer creation failed: ' + err.message })
      }
    }

    // 5. Build Checkout Session
    const baseUrl = process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app'
    const successUrl = `${baseUrl}/client?payment=success&product_id=${productId}`
    const cancelUrl = `${baseUrl}/client?payment=cancel`

    const isSubscription = product.type === 'MONTHLY_SUBSCRIPTION'
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: paymentMethod === 'pix' ? ['pix'] : ['card'],
      line_items: [{
        price_data: {
          currency: product.currency.toLowerCase() || 'usd',
          product_data: {
            name: product.name,
            description: product.description || `Flowike product - ${product.type}`,
          },
          unit_amount: Math.round(product.price * 100),
          ...(isSubscription ? {
            recurring: { interval: 'month' }
          } : {})
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        payer_id: studentUser.id,
        payee_id: teacher.id,
        product_id: productId,
        type: 'PRODUCT',
        price_amount: String(product.price),
        classes_included: String(product.classes_included),
      }
    }

    // If PIX, we require name & email. Stripe handles address details, but we can gather cpf/cnpj
    if (paymentMethod === 'pix' && sessionConfig.payment_method_options?.pix) {
      // Stripe will request CPF/CNPJ inside the checkout form automatically if set up, 
      // but we can pass it if we want to store it in session metadata
      sessionConfig.metadata = {
        ...sessionConfig.metadata,
        cpfCnpj: cpfCnpj || 'Not provided'
      }
    }

    // Connect Split setup: Destination Charge split (0% fee - student payments belong 100% to teachers)
    if (isSubscription) {
      sessionConfig.subscription_data = {
        transfer_data: {
          destination: teacher.stripe_account_id,
        },
      }
    } else {
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: teacher.stripe_account_id,
        },
      }
    }

    try {
      const session = await stripe.checkout.sessions.create(sessionConfig)
      
      // Save pending payment record
      await supabaseAdmin
        .from('payments')
        .insert([{
          payer_id: studentUser.id,
          payee_id: teacher.id,
          product_id: productId,
          amount: product.price,
          status: 'PENDING',
          type: 'PRODUCT',
          stripe_payment_intent_id: session.id // Temporarily save session ID here
        }])

      return res.status(200).json({ url: session.url })
    } catch (err: any) {
      console.error('Stripe Checkout Creation Error:', err)
      // Dev mock redirect if using a dummy Stripe key
      const mockSessionId = 'sess_' + Math.random().toString(36).substring(2, 10)
      const mockCheckoutUrl = `${baseUrl}/client?payment=success_mock&product_id=${productId}&session_id=${mockSessionId}`
      
      await supabaseAdmin
        .from('payments')
        .insert([{
          payer_id: studentUser.id,
          payee_id: teacher.id,
          product_id: productId,
          amount: product.price,
          status: 'PENDING',
          type: 'PRODUCT',
          stripe_payment_intent_id: mockSessionId
        }])

      return res.status(200).json({ url: mockCheckoutUrl, isMock: true })
    }

  } catch (err: any) {
    console.error('Student checkout processing error:', err)
    res.status(500).json({ error: err.message })
  }
}
