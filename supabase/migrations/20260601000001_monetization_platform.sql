-- Migration: Flowike Monetization & Seat Licensing Platform
-- Created At: 2026-06-01

-- 1. Alter public.psychologists table to include plan_id referencing public.plans
ALTER TABLE public.psychologists ADD COLUMN IF NOT EXISTS plan_id uuid;

-- 2. Create table: plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  price numeric(10, 2) NOT NULL,
  student_limit integer NOT NULL DEFAULT 10,
  included_credits integer NOT NULL DEFAULT 8000,
  billing_cycle text DEFAULT 'monthly' NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.psychologists ADD CONSTRAINT fk_psychologists_plan FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- 3. Create table: features
CREATE TABLE IF NOT EXISTS public.features (
  id text PRIMARY KEY, -- e.g., 'booking', 'student_management', 'ai_homework'
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Create table: plan_features
CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  feature_id text REFERENCES public.features(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (plan_id, feature_id)
);

-- 5. Create table: teacher_subscriptions
CREATE TABLE IF NOT EXISTS public.teacher_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL, -- ACTIVE, INACTIVE, PAST_DUE, CANCELLED
  current_period_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_teacher ON public.teacher_subscriptions(teacher_id);

-- 6. Create table: student_seats
CREATE TABLE IF NOT EXISTS public.student_seats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  active boolean DEFAULT true NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (teacher_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_student_seats_teacher ON public.student_seats(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_seats_student ON public.student_seats(student_id);

-- 7. Create table: teacher_wallets
CREATE TABLE IF NOT EXISTS public.teacher_wallets (
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  current_balance integer DEFAULT 0 NOT NULL,
  monthly_allocation integer DEFAULT 0 NOT NULL,
  credits_purchased integer DEFAULT 0 NOT NULL,
  credits_consumed integer DEFAULT 0 NOT NULL,
  lifetime_credits integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Create table: credit_transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('allocation', 'purchase', 'consumption', 'adjustment', 'refund')),
  amount integer NOT NULL, -- Negative for deduction, Positive for addition
  source text, -- e.g., 'homework_generation', 'recharge_pack_5000'
  reference_id text, -- e.g. payment_intent_id or session_id
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_teacher ON public.credit_transactions(teacher_id);

-- 9. Create table: credit_packages
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  stripe_price_id text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. Create table: platform_invoices
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL, -- PAID, UNPAID, VOID
  pdf_url text,
  invoice_number text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_teacher ON public.platform_invoices(teacher_id);

-- 11. Create table: usage_analytics
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  feature text NOT NULL,
  credits_consumed integer NOT NULL,
  country text DEFAULT 'BR' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_teacher ON public.usage_analytics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_feature ON public.usage_analytics(feature);

-- 12. Create table: feature_costs
CREATE TABLE IF NOT EXISTS public.feature_costs (
  id text PRIMARY KEY, -- e.g. 'homework_generation'
  name text NOT NULL,
  cost integer NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. Create table: ai_cost_tracking
CREATE TABLE IF NOT EXISTS public.ai_cost_tracking (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL, -- assemblyai, openai, groq
  feature text NOT NULL,
  cost_usd numeric(10, 6) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_teacher ON public.ai_cost_tracking(teacher_id);

-- 14. Create table: platform_metrics
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  mrr numeric(10, 2) DEFAULT 0.0 NOT NULL,
  arr numeric(10, 2) DEFAULT 0.0 NOT NULL,
  active_teachers integer DEFAULT 0 NOT NULL,
  active_students integer DEFAULT 0 NOT NULL,
  seats_used integer DEFAULT 0 NOT NULL,
  credits_allocated integer DEFAULT 0 NOT NULL,
  credits_consumed integer DEFAULT 0 NOT NULL,
  credits_purchased integer DEFAULT 0 NOT NULL,
  ai_revenue numeric(10, 2) DEFAULT 0.0 NOT NULL,
  subscription_revenue numeric(10, 2) DEFAULT 0.0 NOT NULL,
  total_revenue numeric(10, 2) DEFAULT 0.0 NOT NULL,
  growth_rate numeric(5, 2) DEFAULT 0.0 NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. Create table: admin_alerts
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('cost_spike', 'negative_margin', 'abnormal_usage', 'failed_payment', 'high_consumption')),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved')) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 16. Extend teacher_products with product_type and billing_cycle if not exists
ALTER TABLE public.teacher_products ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'MONTHLY_SUBSCRIPTION'::text;
ALTER TABLE public.teacher_products ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly'::text;

-- 17. Seed initial features
INSERT INTO public.features (id, name, description) VALUES
('booking', 'Booking & Agenda', 'Allow students to schedule classes dynamically based on teacher availability.'),
('student_management', 'CRM & Student Management', 'Full dashboard for tracking student details, lesson history and timelines.'),
('homework', 'Homework Management', 'Create, send, and grade offline homework assignments.'),
('ai_homework', 'AI Homework Generator', 'Use LLMs to automatically generate custom homework based on student needs.'),
('lesson_insights', 'AI Lesson Analysis & Insights', 'Evaluate transcribed classes and generate pedagogical analysis.'),
('scenario_practice', 'AI Scenario Practice', 'Provide students with an AI roleplay partner for conversational training.'),
('vocabulary_bank', 'AI Vocabulary Bank', 'Extract and store key vocabulary, definitions, and examples from audio sessions.'),
('white_label', 'Premium White-Label Branding', 'Upload custom logos, fonts, favicons and brand colors for the academy portal.'),
('multi_teacher', 'Multi-Teacher Academies', 'Add other teachers and assign classes/tutors to different classrooms.'),
('finance_dashboard', 'Finance Center', 'Analyze revenue, average ticket, pending invoices and growth rates.'),
('advanced_analytics', 'Advanced Academy Analytics', 'Advanced cohorts, retention metrics, and lifetime value calculations.'),
('custom_domains', 'Custom Domains', 'Connect a custom domain (e.g. academy.mybrand.com) directly to the tenant portal.'),
('whatsapp_automation', 'WhatsApp Automation', 'Send class booking confirmations, homework notifications and payment links automatically.')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 18. Seed initial plans
INSERT INTO public.plans (id, name, price, student_limit, included_credits, billing_cycle, active) VALUES
('aa000000-0000-0000-0000-000000000001', 'STARTER', 59.00, 10, 8000, 'monthly', true),
('aa000000-0000-0000-0000-000000000002', 'GROWTH', 129.00, 25, 20000, 'monthly', true),
('aa000000-0000-0000-0000-000000000003', 'ACADEMY', 399.00, 100, 80000, 'monthly', true)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  student_limit = EXCLUDED.student_limit,
  included_credits = EXCLUDED.included_credits;

-- 19. Seed plan_features mapping
-- Starter features: student_management, booking, homework, finance_dashboard
INSERT INTO public.plan_features (plan_id, feature_id) VALUES
('aa000000-0000-0000-0000-000000000001', 'student_management'),
('aa000000-0000-0000-0000-000000000001', 'booking'),
('aa000000-0000-0000-0000-000000000001', 'homework'),
('aa000000-0000-0000-0000-000000000001', 'finance_dashboard'),

-- Growth features: Starter + ai_homework, lesson_insights, vocabulary_bank, scenario_practice, white_label
('aa000000-0000-0000-0000-000000000002', 'student_management'),
('aa000000-0000-0000-0000-000000000002', 'booking'),
('aa000000-0000-0000-0000-000000000002', 'homework'),
('aa000000-0000-0000-0000-000000000002', 'finance_dashboard'),
('aa000000-0000-0000-0000-000000000002', 'ai_homework'),
('aa000000-0000-0000-0000-000000000002', 'lesson_insights'),
('aa000000-0000-0000-0000-000000000002', 'vocabulary_bank'),
('aa000000-0000-0000-0000-000000000002', 'scenario_practice'),
('aa000000-0000-0000-0000-000000000002', 'white_label'),

-- Academy features: Growth + multi_teacher, advanced_analytics, custom_domains, whatsapp_automation
('aa000000-0000-0000-0000-000000000003', 'student_management'),
('aa000000-0000-0000-0000-000000000003', 'booking'),
('aa000000-0000-0000-0000-000000000003', 'homework'),
('aa000000-0000-0000-0000-000000000003', 'finance_dashboard'),
('aa000000-0000-0000-0000-000000000003', 'ai_homework'),
('aa000000-0000-0000-0000-000000000003', 'lesson_insights'),
('aa000000-0000-0000-0000-000000000003', 'vocabulary_bank'),
('aa000000-0000-0000-0000-000000000003', 'scenario_practice'),
('aa000000-0000-0000-0000-000000000003', 'white_label'),
('aa000000-0000-0000-0000-000000000003', 'multi_teacher'),
('aa000000-0000-0000-0000-000000000003', 'advanced_analytics'),
('aa000000-0000-0000-0000-000000000003', 'custom_domains'),
('aa000000-0000-0000-0000-000000000003', 'whatsapp_automation')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- 20. Seed credit packages
INSERT INTO public.credit_packages (name, credits, price) VALUES
('Starter Pack', 5000, 19.00),
('Growth Pack', 20000, 69.00),
('Academy Pack', 50000, 149.00)
ON CONFLICT DO NOTHING;

-- 21. Seed feature costs table
INSERT INTO public.feature_costs (id, name, cost) VALUES
('homework_generation', 'Homework Generation', 20),
('lesson_analysis', 'Lesson Analysis', 40),
('vocabulary_extraction', 'Vocabulary Extraction', 10),
('lesson_insights', 'Lesson Insights', 20),
('writing_evaluation', 'Writing Evaluation', 15),
('progress_report', 'Progress Report', 25),
('pronunciation_analysis', 'Pronunciation Analysis', 10),
('scenario_practice', 'AI Scenario Practice (per minute)', 5),
('audio_transcription', 'Audio Transcription (per minute)', 2)
ON CONFLICT (id) DO UPDATE SET cost = EXCLUDED.cost;

-- 22. Trigger to check student seat limits in patients (students)
CREATE OR REPLACE FUNCTION public.check_student_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id UUID;
  v_student_limit INTEGER := 10; -- default limit
  v_active_count INTEGER;
  v_plan_id UUID;
BEGIN
  v_teacher_id := NEW.psychologist_id;
  
  -- Check if a student is being activated
  IF (TG_OP = 'INSERT' AND NEW.status = 'ACTIVE') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'ACTIVE' AND OLD.status IS DISTINCT FROM 'ACTIVE') THEN
     
     -- Get teacher's plan ID
     SELECT plan_id INTO v_plan_id FROM public.psychologists WHERE id = v_teacher_id;
     
     IF v_plan_id IS NOT NULL THEN
       SELECT student_limit INTO v_student_limit FROM public.plans WHERE id = v_plan_id;
     ELSE
       -- Fallback: lookup by plan_type text matching
       SELECT student_limit INTO v_student_limit 
       FROM public.plans 
       WHERE name = UPPER(COALESCE((SELECT plan_type FROM public.psychologists WHERE id = v_teacher_id), 'STARTER'))
       LIMIT 1;
     END IF;
     
     IF v_student_limit IS NULL THEN
       v_student_limit := 10;
     END IF;
     
     -- Count current active students
     SELECT COUNT(*) INTO v_active_count 
     FROM public.patients 
     WHERE psychologist_id = v_teacher_id AND status = 'ACTIVE';
     
     IF v_active_count >= v_student_limit THEN
       RAISE EXCEPTION 'Student seat limit of % reached for your current plan. Please upgrade your plan in the Finance center to add more active students.', v_student_limit;
     END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_student_seat_limit ON public.patients;
CREATE TRIGGER trigger_check_student_seat_limit
  BEFORE INSERT OR UPDATE OF status ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.check_student_seat_limit();

-- 23. Atomic DB function for credit consumption
CREATE OR REPLACE FUNCTION public.consume_teacher_credits(
  p_teacher_id UUID,
  p_feature_id TEXT,
  p_student_id UUID,
  p_quantity INTEGER,
  p_description TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  credits_deducted INTEGER,
  remaining_balance INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_cost INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_monthly_allocation INTEGER;
  v_alert_threshold_80 INTEGER;
  v_alert_threshold_90 INTEGER;
BEGIN
  -- 1. Get cost
  SELECT cost INTO v_cost FROM public.feature_costs WHERE id = p_feature_id;
  IF v_cost IS NULL THEN
    v_cost := 10; -- fallback cost
  END IF;
  
  credits_deducted := v_cost * p_quantity;
  
  -- 2. Lock wallet
  SELECT current_balance, monthly_allocation 
  INTO v_current_balance, v_monthly_allocation
  FROM public.teacher_wallets 
  WHERE teacher_id = p_teacher_id
  FOR UPDATE;
  
  -- Provision wallet if it doesn't exist yet
  IF v_current_balance IS NULL THEN
    INSERT INTO public.teacher_wallets (teacher_id, current_balance, monthly_allocation)
    VALUES (p_teacher_id, 8000, 8000) -- Default initial Starter allocation
    ON CONFLICT (teacher_id) DO NOTHING;
    
    SELECT current_balance, monthly_allocation 
    INTO v_current_balance, v_monthly_allocation
    FROM public.teacher_wallets 
    WHERE teacher_id = p_teacher_id
    FOR UPDATE;
  END IF;
  
  -- 3. Check balance
  IF v_current_balance < credits_deducted THEN
    success := FALSE;
    remaining_balance := v_current_balance;
    error_message := 'Saldo de créditos insuficiente. Você precisa de ' || credits_deducted || ' créditos, mas possui apenas ' || v_current_balance || '.';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- 4. Deduct
  v_new_balance := v_current_balance - credits_deducted;
  
  UPDATE public.teacher_wallets
  SET 
    current_balance = v_new_balance,
    credits_consumed = credits_consumed + credits_deducted,
    lifetime_credits = lifetime_credits + credits_deducted,
    updated_at = now()
  WHERE teacher_id = p_teacher_id;
  
  -- 5. Log transaction
  INSERT INTO public.credit_transactions (teacher_id, type, amount, source, reference_id, description)
  VALUES (p_teacher_id, 'consumption', -credits_deducted, p_feature_id, COALESCE(p_student_id::text, ''), p_description);
  
  -- 6. Log usage analytics
  INSERT INTO public.usage_analytics (teacher_id, student_id, feature, credits_consumed)
  VALUES (p_teacher_id, p_student_id, p_feature_id, credits_deducted);
  
  -- 7. Process alerts
  IF v_monthly_allocation > 0 THEN
    v_alert_threshold_80 := CAST(v_monthly_allocation * 0.20 AS INTEGER);
    v_alert_threshold_90 := CAST(v_monthly_allocation * 0.10 AS INTEGER);
    
    IF v_new_balance <= v_alert_threshold_90 AND v_current_balance > v_alert_threshold_90 THEN
      INSERT INTO public.admin_alerts (type, title, description, status)
      VALUES ('high_consumption', 'Uso Crítico de Créditos IA (90%)', 'O professor ' || p_teacher_id || ' cruzou o limiar de 90% de consumo mensal de créditos. Saldo atual: ' || v_new_balance, 'active');
    ELSIF v_new_balance <= v_alert_threshold_80 AND v_current_balance > v_alert_threshold_80 THEN
      INSERT INTO public.admin_alerts (type, title, description, status)
      VALUES ('high_consumption', 'Uso Alto de Créditos IA (80%)', 'O professor ' || p_teacher_id || ' cruzou o limiar de 80% de consumo mensal de créditos. Saldo atual: ' || v_new_balance, 'active');
    END IF;
  END IF;
  
  success := TRUE;
  remaining_balance := v_new_balance;
  error_message := '';
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Sync psychologists plan_type <-> plan_id trigger
CREATE OR REPLACE FUNCTION public.sync_psychologist_plan_type_and_id()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
  v_wallet_exists BOOLEAN;
  v_initial_credits INTEGER := 8000;
BEGIN
  -- If plan_id is changed, sync plan_type name
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id AND NEW.plan_id IS NOT NULL THEN
    SELECT name INTO v_plan_name FROM public.plans WHERE id = NEW.plan_id;
    IF v_plan_name IS NOT NULL THEN
      NEW.plan_type := v_plan_name;
    END IF;
  -- If plan_type is changed, sync plan_id
  ELSIF NEW.plan_type IS DISTINCT FROM OLD.plan_type AND NEW.plan_type IS NOT NULL THEN
    SELECT id, included_credits INTO v_plan_id, v_initial_credits FROM public.plans WHERE name = UPPER(NEW.plan_type);
    IF v_plan_id IS NOT NULL THEN
      NEW.plan_id := v_plan_id;
    END IF;
  END IF;

  -- Ensure wallet is provisioned/updated
  SELECT EXISTS(SELECT 1 FROM public.teacher_wallets WHERE teacher_id = NEW.id) INTO v_wallet_exists;
  
  IF NOT v_wallet_exists THEN
    INSERT INTO public.teacher_wallets (teacher_id, current_balance, monthly_allocation)
    VALUES (NEW.id, v_initial_credits, v_initial_credits);
    
    INSERT INTO public.credit_transactions (teacher_id, type, amount, source, description)
    VALUES (NEW.id, 'allocation', v_initial_credits, 'starter_plan', 'Alocação inicial de créditos do plano ' || COALESCE(v_plan_name, NEW.plan_type));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_psychologist_plan ON public.psychologists;
CREATE TRIGGER trigger_sync_psychologist_plan
  BEFORE INSERT OR UPDATE OF plan_type, plan_id ON public.psychologists
  FOR EACH ROW EXECUTE FUNCTION public.sync_psychologist_plan_type_and_id();

-- Backfill existing psychologists to link plans & create wallets
UPDATE public.psychologists p
SET plan_id = pl.id
FROM public.plans pl
WHERE UPPER(p.plan_type) = pl.name AND p.plan_id IS NULL;

-- Backfill wallets
INSERT INTO public.teacher_wallets (teacher_id, current_balance, monthly_allocation)
SELECT p.id, COALESCE(pl.included_credits, 8000), COALESCE(pl.included_credits, 8000)
FROM public.psychologists p
LEFT JOIN public.plans pl ON p.plan_id = pl.id
ON CONFLICT (teacher_id) DO NOTHING;

-- 25. Row Level Security Policies
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Dynamic Plans / Features can be read by any authenticated user, written by Admins only
CREATE POLICY "Plans readable by authenticated users" ON public.plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Plans writeable by Admins" ON public.plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Features readable by authenticated users" ON public.features FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Features writeable by Admins" ON public.features FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Plan features readable by authenticated users" ON public.plan_features FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Plan features writeable by Admins" ON public.plan_features FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Teacher Subscription: Teacher reads own, Admin does all
CREATE POLICY "Subscriptions readable by teacher" ON public.teacher_subscriptions FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Subscriptions writeable by Admins" ON public.teacher_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Student Seats: Teacher manages, Admin does all
CREATE POLICY "Seats readable by teacher" ON public.student_seats FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Seats writeable by teacher" ON public.student_seats FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "Seats manageable by Admins" ON public.student_seats FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Teacher Wallet: Teacher reads own, Admin does all
CREATE POLICY "Wallet readable by teacher" ON public.teacher_wallets FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Wallet manageable by Admins" ON public.teacher_wallets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Credit Transactions: Teacher reads own, Admin does all
CREATE POLICY "Transactions readable by teacher" ON public.credit_transactions FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Transactions writeable by Admins" ON public.credit_transactions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Credit Packages: Readable by all authenticated, written by Admin
CREATE POLICY "Packages readable by authenticated" ON public.credit_packages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Packages writeable by Admins" ON public.credit_packages FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Invoices: Teacher reads own, Admin does all
CREATE POLICY "Invoices readable by teacher" ON public.platform_invoices FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Invoices writeable by Admins" ON public.platform_invoices FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Usage Analytics: Teacher reads own, Admin does all
CREATE POLICY "Usage analytics readable by teacher" ON public.usage_analytics FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Usage analytics writeable by Admins" ON public.usage_analytics FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Feature Costs: Readable by authenticated, written by Admin
CREATE POLICY "Feature costs readable by authenticated" ON public.feature_costs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Feature costs writeable by Admins" ON public.feature_costs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- AI Cost Tracking: Teacher reads own, Admin does all
CREATE POLICY "AI cost tracking readable by teacher" ON public.ai_cost_tracking FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "AI cost tracking writeable by Admins" ON public.ai_cost_tracking FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Platform Metrics & Admin Alerts: Admin only
CREATE POLICY "Metrics visible to Admins only" ON public.platform_metrics FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Alerts visible to Admins only" ON public.admin_alerts FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
