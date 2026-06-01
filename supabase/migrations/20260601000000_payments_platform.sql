-- Migration: Flowike Payments Platform Schema
-- Created At: 2026-06-01

-- 1. Alter public.psychologists table to include Stripe Connect fields
ALTER TABLE public.psychologists ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.psychologists ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false;
ALTER TABLE public.psychologists ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
ALTER TABLE public.psychologists ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;

-- 2. Create table: stripe_customers
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON public.stripe_customers(user_id);

-- 3. Create table: stripe_subscriptions
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL,
  plan_type text NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user ON public.stripe_subscriptions(user_id);

-- 4. Create table: stripe_connected_accounts
CREATE TABLE IF NOT EXISTS public.stripe_connected_accounts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_account_id text NOT NULL UNIQUE,
  status text DEFAULT 'NOT_CONNECTED'::text, -- NOT_CONNECTED, PENDING, ACTIVE, RESTRICTED
  details_submitted boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_connected_accounts_teacher ON public.stripe_connected_accounts(teacher_id);

-- 5. Create table: teacher_products
CREATE TABLE IF NOT EXISTS public.teacher_products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('SINGLE_CLASS', 'PACKAGE', 'MONTHLY_SUBSCRIPTION')),
  price numeric(10, 2) NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  classes_included integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_products_teacher ON public.teacher_products(teacher_id);

-- 6. Create table: teacher_product_prices
CREATE TABLE IF NOT EXISTS public.teacher_product_prices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES public.teacher_products(id) ON DELETE CASCADE NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  price numeric(10, 2) NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_product_prices_product ON public.teacher_product_prices(product_id);

-- 7. Create table: student_subscriptions
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON public.student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_teacher ON public.student_subscriptions(teacher_id);

-- 8. Create table: payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL, -- SUCCEEDED, FAILED, PENDING
  type text NOT NULL CHECK (type IN ('SAAS', 'PRODUCT', 'CREDITS')),
  stripe_payment_intent_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON public.payments(payee_id);

-- 9. Create table: payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  gross_amount numeric(10, 2) NOT NULL,
  net_amount numeric(10, 2) NOT NULL,
  platform_fee numeric(10, 2) NOT NULL,
  stripe_fee numeric(10, 2) NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment ON public.payment_transactions(payment_id);

-- 10. Create table: payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  status text NOT NULL, -- PAID, FAILED, PENDING
  stripe_payout_id text NOT NULL UNIQUE,
  estimated_arrival timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payouts_teacher ON public.payouts(teacher_id);

-- 11. Create table: revenue_share_rules
CREATE TABLE IF NOT EXISTS public.revenue_share_rules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type text NOT NULL UNIQUE, -- STARTER, PRO, ACADEMY, BASIC
  percentage numeric(5, 2) NOT NULL
);

-- Seed revenue share rules
INSERT INTO public.revenue_share_rules (plan_type, percentage) VALUES
('STARTER', 15.00),
('PRO', 10.00),
('ACADEMY', 5.00),
('BASIC', 15.00)
ON CONFLICT (plan_type) DO UPDATE SET percentage = EXCLUDED.percentage;

-- 12. Create table: ai_wallets
CREATE TABLE IF NOT EXISTS public.ai_wallets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_wallets_teacher ON public.ai_wallets(teacher_id);

-- 13. Create table: ai_transactions
CREATE TABLE IF NOT EXISTS public.ai_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- HOMEWORK, INSIGHTS, SESSION, VOCABULARY, SCENARIO, REPORT, PURCHASE
  credits_used integer NOT NULL, -- Positive for usage, negative for purchases/adding credits
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_transactions_teacher ON public.ai_transactions(teacher_id);

-- 14. Create table: platform_revenue
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('SAAS', 'REVSHARE', 'AI_CREDITS')),
  amount numeric(10, 2) NOT NULL,
  stripe_payment_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. Create table: platform_subscriptions
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('STARTER', 'PRO', 'ACADEMY', 'BASIC')),
  status text NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_teacher ON public.platform_subscriptions(teacher_id);

-- 16. Row Level Security (RLS) Configuration
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_share_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

-- 17. Policies
-- Admin Policies: Admins have full access to all payments tables
CREATE POLICY "Admins have full access to stripe_customers" ON public.stripe_customers FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to stripe_subscriptions" ON public.stripe_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to stripe_connected_accounts" ON public.stripe_connected_accounts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to teacher_products" ON public.teacher_products FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to teacher_product_prices" ON public.teacher_product_prices FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to student_subscriptions" ON public.student_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to payments" ON public.payments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to payment_transactions" ON public.payment_transactions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to payouts" ON public.payouts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to revenue_share_rules" ON public.revenue_share_rules FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to ai_wallets" ON public.ai_wallets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to ai_transactions" ON public.ai_transactions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to platform_revenue" ON public.platform_revenue FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins have full access to platform_subscriptions" ON public.platform_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

-- Teacher Policies:
-- Teachers can manage their own products, view their connected account status, wallets, and sales payouts/payments.
CREATE POLICY "Teachers read/write their own products" ON public.teacher_products 
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Teachers read/write prices of their products" ON public.teacher_product_prices 
  FOR ALL USING (product_id IN (SELECT id FROM public.teacher_products WHERE teacher_id = auth.uid()));

CREATE POLICY "Teachers view their own connected account info" ON public.stripe_connected_accounts 
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Teachers view their payments received" ON public.payments 
  FOR SELECT USING (payee_id = auth.uid() OR payer_id = auth.uid());

CREATE POLICY "Teachers view their payouts" ON public.payouts 
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers manage their AI credit wallet" ON public.ai_wallets 
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Teachers view their AI credit usage logs" ON public.ai_transactions 
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers view their platform subscription details" ON public.platform_subscriptions 
  FOR SELECT USING (teacher_id = auth.uid());

-- Student Policies:
-- Students can view active products from their teacher, and check their own payments/invoices.
CREATE POLICY "Students view products of their teacher" ON public.teacher_products 
  FOR SELECT USING (
    active = true AND 
    teacher_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Students view prices of teacher products" ON public.teacher_product_prices 
  FOR SELECT USING (
    product_id IN (SELECT id FROM public.teacher_products WHERE active = true)
  );

CREATE POLICY "Students view their own student subscriptions" ON public.student_subscriptions 
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students view their own payments made" ON public.payments 
  FOR SELECT USING (payer_id = auth.uid());

-- Public can read active revenue rules
CREATE POLICY "Read revenue rules publicly" ON public.revenue_share_rules FOR SELECT USING (true);

-- 18. Trigger for automatic AI credit wallet provisioning
CREATE OR REPLACE FUNCTION public.provision_ai_wallet_for_teacher()
RETURNS TRIGGER AS $$
DECLARE
  v_initial_balance integer := 50; -- Default Starter
BEGIN
  IF NEW.plan_type = 'PRO' THEN
    v_initial_balance := 500;
  ELSIF NEW.plan_type = 'ACADEMY' THEN
    v_initial_balance := 2000;
  END IF;

  INSERT INTO public.ai_wallets (teacher_id, balance)
  VALUES (NEW.id, v_initial_balance)
  ON CONFLICT (teacher_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_provision_ai_wallet
  AFTER INSERT ON public.psychologists
  FOR EACH ROW EXECUTE PROCEDURE public.provision_ai_wallet_for_teacher();

-- Backfill wallets for existing psychologists
INSERT INTO public.ai_wallets (teacher_id, balance)
SELECT id, 
  CASE 
    WHEN plan_type = 'PRO' THEN 500
    WHEN plan_type = 'ACADEMY' THEN 2000
    ELSE 50
  END
FROM public.psychologists
ON CONFLICT (teacher_id) DO NOTHING;
