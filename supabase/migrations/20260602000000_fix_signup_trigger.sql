-- Migration: Fix signup trigger error by splitting plan sync (BEFORE) and wallet provisioning (AFTER)
-- Created At: 2026-06-02

-- 1. Redefine sync function to ONLY sync plan fields, with no side-effects (runs BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.sync_psychologist_plan_type_and_id()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If plan_id is provided, sync plan_type
    IF NEW.plan_id IS NOT NULL THEN
      SELECT name INTO v_plan_name FROM public.plans WHERE id = NEW.plan_id;
      IF v_plan_name IS NOT NULL THEN
        NEW.plan_type := v_plan_name;
      END IF;
    -- If plan_type is provided, sync plan_id
    ELSIF NEW.plan_type IS NOT NULL THEN
      SELECT id INTO v_plan_id FROM public.plans WHERE name = UPPER(NEW.plan_type);
      IF v_plan_id IS NOT NULL THEN
        NEW.plan_id := v_plan_id;
      END IF;
    -- Fallback to default Starter plan if nothing is provided
    ELSE
      SELECT id INTO v_plan_id FROM public.plans WHERE name = 'STARTER';
      IF v_plan_id IS NOT NULL THEN
        NEW.plan_id := v_plan_id;
        NEW.plan_type := 'STARTER';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If plan_id is changed, sync plan_type name
    IF NEW.plan_id IS DISTINCT FROM OLD.plan_id AND NEW.plan_id IS NOT NULL THEN
      SELECT name INTO v_plan_name FROM public.plans WHERE id = NEW.plan_id;
      IF v_plan_name IS NOT NULL THEN
        NEW.plan_type := v_plan_name;
      END IF;
    -- If plan_type is changed, sync plan_id
    ELSIF NEW.plan_type IS DISTINCT FROM OLD.plan_type AND NEW.plan_type IS NOT NULL THEN
      SELECT id INTO v_plan_id FROM public.plans WHERE name = UPPER(NEW.plan_type);
      IF v_plan_id IS NOT NULL THEN
        NEW.plan_id := v_plan_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the wallet provisioning function (runs AFTER INSERT/UPDATE)
CREATE OR REPLACE FUNCTION public.provision_psychologist_wallet()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_plan_name TEXT;
  v_wallet_exists BOOLEAN;
  v_initial_credits INTEGER := 8000;
BEGIN
  -- Check if wallet already exists
  SELECT EXISTS(SELECT 1 FROM public.teacher_wallets WHERE teacher_id = NEW.id) INTO v_wallet_exists;
  
  IF NOT v_wallet_exists THEN
    -- Determine the plan's initial credits based on the psychologist's plan_id or plan_type
    IF NEW.plan_id IS NOT NULL THEN
      SELECT name, included_credits INTO v_plan_name, v_initial_credits FROM public.plans WHERE id = NEW.plan_id;
    ELSIF NEW.plan_type IS NOT NULL THEN
      SELECT id, name, included_credits INTO v_plan_id, v_plan_name, v_initial_credits FROM public.plans WHERE name = UPPER(NEW.plan_type);
    ELSE
      SELECT id, name, included_credits INTO v_plan_id, v_plan_name, v_initial_credits FROM public.plans WHERE name = 'STARTER';
    END IF;
    
    -- Fallbacks
    IF v_initial_credits IS NULL THEN
      v_initial_credits := 8000;
    END IF;
    IF v_plan_name IS NULL THEN
      v_plan_name := COALESCE(NEW.plan_type, 'STARTER');
    END IF;

    -- Insert wallet
    INSERT INTO public.teacher_wallets (teacher_id, current_balance, monthly_allocation)
    VALUES (NEW.id, v_initial_credits, v_initial_credits)
    ON CONFLICT (teacher_id) DO NOTHING;
    
    -- Log transaction
    INSERT INTO public.credit_transactions (teacher_id, type, amount, source, description)
    VALUES (NEW.id, 'allocation', v_initial_credits, 'starter_plan', 'Alocação inicial de créditos do plano ' || v_plan_name)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the triggers to match the new split execution order
DROP TRIGGER IF EXISTS trigger_sync_psychologist_plan ON public.psychologists;
CREATE TRIGGER trigger_sync_psychologist_plan
  BEFORE INSERT OR UPDATE OF plan_type, plan_id ON public.psychologists
  FOR EACH ROW EXECUTE FUNCTION public.sync_psychologist_plan_type_and_id();

DROP TRIGGER IF EXISTS trigger_provision_psychologist_wallet ON public.psychologists;
CREATE TRIGGER trigger_provision_psychologist_wallet
  AFTER INSERT OR UPDATE ON public.psychologists
  FOR EACH ROW EXECUTE FUNCTION public.provision_psychologist_wallet();
