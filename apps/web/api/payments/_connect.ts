import { supabaseAdmin, createAuthClient } from '../_lib/supabase.js'
import Stripe from 'stripe'

// Initialize Stripe with secret key or mock fallback
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockSecretKey'
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
})

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Authenticate user
    const authClient = createAuthClient(req)
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Verify user is a TEACHER or PSYCHOLOGIST
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || (profile?.role !== 'TEACHER' && profile?.role !== 'PSYCHOLOGIST')) {
      return res.status(403).json({ error: 'Forbidden: Teachers only' })
    }

    const teacherId = user.id

    // --- GET: Check status ---
    if (req.method === 'GET') {
      const { data: connectedAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      if (!connectedAccount) {
        return res.status(200).json({ status: 'NOT_CONNECTED' })
      }

      // If we have an account ID, retrieve status from Stripe to sync
      try {
        if (connectedAccount.stripe_account_id.startsWith('acct_mock_')) {
          return res.status(200).json(connectedAccount)
        }
        const stripeAccount = await stripe.accounts.retrieve(connectedAccount.stripe_account_id)
        
        const detailsSubmitted = stripeAccount.details_submitted || false
        const chargesEnabled = stripeAccount.charges_enabled || false
        const payoutsEnabled = stripeAccount.payouts_enabled || false
        
        let status = 'PENDING'
        if (chargesEnabled && payoutsEnabled) {
          status = 'ACTIVE'
        } else if (detailsSubmitted) {
          status = 'PENDING'
        } else {
          status = 'RESTRICTED'
        }

        // Update database
        await supabaseAdmin
          .from('stripe_connected_accounts')
          .update({
            status,
            details_submitted: detailsSubmitted,
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            updated_at: new Date().toISOString()
          })
          .eq('teacher_id', teacherId)

        await supabaseAdmin
          .from('psychologists')
          .update({
            stripe_account_id: connectedAccount.stripe_account_id,
            stripe_onboarding_completed: detailsSubmitted,
            stripe_charges_enabled: chargesEnabled,
            stripe_payouts_enabled: payoutsEnabled
          })
          .eq('id', teacherId)

        return res.status(200).json({
          ...connectedAccount,
          status,
          details_submitted: detailsSubmitted,
          charges_enabled: chargesEnabled,
          payouts_enabled: payoutsEnabled
        })
      } catch (err: any) {
        console.error('Error fetching Stripe account info:', err)
        // Fallback to local DB if Stripe retrieval fails (e.g. mock key in dev)
        return res.status(200).json(connectedAccount)
      }
    }

    // --- POST: Create / Connect Stripe Account ---
    if (req.method === 'POST') {
      const origin = req.headers.origin || req.headers.referer
      const baseUrl = origin ? new URL(origin).origin : (process.env.VITE_APP_URL || 'https://clinica-inteligente-web-chi.vercel.app')
      
      const source = req.body?.source || 'dashboard'
      const return_url = source === 'onboarding'
        ? `${baseUrl}/onboarding?stripe=success`
        : `${baseUrl}/dashboard/finance?stripe=success`
      const refresh_url = source === 'onboarding'
        ? `${baseUrl}/onboarding?stripe=refresh`
        : `${baseUrl}/dashboard/finance?stripe=refresh`

      // Check if connection already exists
      let { data: connectedAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle()

      let stripeAccountId = connectedAccount?.stripe_account_id

      // Create new connected Express account if none exists
      if (!stripeAccountId) {
        try {
          const account = await stripe.accounts.create({
            type: 'express',
            country: 'BR', // Default country matching PIX / local usage
            email: user.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_profile: {
              product_description: 'Aulas particulares e cursos de educação online via Flowike.',
            }
          })
          stripeAccountId = account.id

          // Save to local database
          await supabaseAdmin
            .from('stripe_connected_accounts')
            .insert([{
              teacher_id: teacherId,
              stripe_account_id: stripeAccountId,
              status: 'PENDING'
            }])

          await supabaseAdmin
            .from('psychologists')
            .update({
              stripe_account_id: stripeAccountId,
              stripe_onboarding_completed: false
            })
            .eq('id', teacherId)
        } catch (err: any) {
          console.warn('Stripe Account Creation failed (using mock fallback):', err.message)
          stripeAccountId = `acct_mock_${teacherId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`

          // Save mock account to local database
          await supabaseAdmin
            .from('stripe_connected_accounts')
            .insert([{
              teacher_id: teacherId,
              stripe_account_id: stripeAccountId,
              status: 'PENDING'
            }])

          await supabaseAdmin
            .from('psychologists')
            .update({
              stripe_account_id: stripeAccountId,
              stripe_onboarding_completed: false
            })
            .eq('id', teacherId)
        }
      }

      // If mock account detected, bypass Stripe account sessions creation
      if (stripeAccountId.startsWith('acct_mock_')) {
        const mockRedirectUrl = source === 'onboarding'
          ? `${baseUrl}/onboarding?stripe=success_mock`
          : `${baseUrl}/dashboard/finance?stripe=success_mock`
        return res.status(200).json({ url: mockRedirectUrl, isMock: true, stripe_account_id: stripeAccountId })
      }

      // Generate account session for Embedded Onboarding
      try {
        const accountSession = await stripe.accountSessions.create({
          account: stripeAccountId,
          components: {
            account_onboarding: { 
              enabled: true,
              features: {
                external_account_collection: true,
              }
            },
            account_management: {
              enabled: true,
              features: {
                external_account_collection: true,
              }
            },
            payouts: {
              enabled: true,
              features: {
                instant_payouts: true,
              }
            },
            payments: {
              enabled: true,
              features: {
                refund_management: true,
                dispute_management: true,
              }
            },
            balances: {
              enabled: true,
            }
          },
        })

        const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51MockPublishableKey'

        return res.status(200).json({ 
          clientSecret: accountSession.client_secret, 
          publishableKey,
          stripe_account_id: stripeAccountId,
          isMock: false
        })
      } catch (err: any) {
        console.error('Stripe Account Session Creation Error:', err)
        const mockRedirectUrl = source === 'onboarding'
          ? `${baseUrl}/onboarding?stripe=success_mock`
          : `${baseUrl}/dashboard/finance?stripe=success_mock`
        return res.status(200).json({ url: mockRedirectUrl, isMock: true, stripe_account_id: stripeAccountId })
      }
    }

  } catch (err: any) {
    console.error('Stripe Connect error:', err)
    res.status(500).json({ error: err.message })
  }
}
