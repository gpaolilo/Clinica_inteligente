-- Migration: Add ai_credits_included to teacher_products and ai_credits_balance to patients
-- Also updates the consume_teacher_credits RPC function to deduct from student's balance if present.
-- Created At: 2026-06-09

ALTER TABLE public.teacher_products ADD COLUMN IF NOT EXISTS ai_credits_included integer DEFAULT 0 NOT NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS ai_credits_balance integer DEFAULT 0;

DROP FUNCTION IF EXISTS public.consume_teacher_credits(UUID, TEXT, UUID, INTEGER, TEXT);

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
  v_student_balance INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_monthly_allocation INTEGER;
  v_alert_threshold_80 INTEGER;
  v_alert_threshold_90 INTEGER;
  v_has_student_balance BOOLEAN := false;
BEGIN
  -- 1. Get cost
  SELECT cost INTO v_cost FROM public.feature_costs WHERE id = p_feature_id;
  IF v_cost IS NULL THEN
    v_cost := 10; -- fallback cost
  END IF;
  
  credits_deducted := v_cost * p_quantity;

  -- 2. Check if student has active credit balance
  IF p_student_id IS NOT NULL THEN
    SELECT (ai_credits_balance IS NOT NULL), COALESCE(ai_credits_balance, 0)
    INTO v_has_student_balance, v_student_balance
    FROM public.patients
    WHERE id = p_student_id;
    
    IF v_has_student_balance THEN
      -- Student has their own credit pool.
      -- Check student balance
      IF v_student_balance < credits_deducted THEN
        success := FALSE;
        remaining_balance := v_student_balance;
        error_message := 'Saldo de créditos de IA do aluno insuficiente. O aluno possui apenas ' || v_student_balance || ' créditos.';
        RETURN NEXT;
        RETURN;
      END IF;
      
      -- Deduct from student balance
      UPDATE public.patients
      SET ai_credits_balance = ai_credits_balance - credits_deducted
      WHERE id = p_student_id;
      
      -- Log usage analytics
      INSERT INTO public.usage_analytics (teacher_id, student_id, feature, credits_consumed)
      VALUES (p_teacher_id, p_student_id, p_feature_id, credits_deducted);
      
      -- Log transaction reference for teacher
      INSERT INTO public.credit_transactions (teacher_id, type, amount, source, reference_id, description)
      VALUES (p_teacher_id, 'consumption', -credits_deducted, p_feature_id, p_student_id::text, p_description || ' (Consumido do saldo do aluno)');

      success := TRUE;
      remaining_balance := v_student_balance - credits_deducted;
      error_message := '';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- 3. Otherwise, lock and deduct from teacher's wallet (original logic)
  SELECT current_balance, monthly_allocation 
  INTO v_current_balance, v_monthly_allocation
  FROM public.teacher_wallets 
  WHERE teacher_id = p_teacher_id
  FOR UPDATE;
  
  -- Provision wallet if it doesn't exist yet
  IF v_current_balance IS NULL THEN
    INSERT INTO public.teacher_wallets (teacher_id, current_balance, monthly_allocation)
    VALUES (p_teacher_id, 8000, 8000)
    ON CONFLICT (teacher_id) DO NOTHING;
    
    SELECT current_balance, monthly_allocation 
    INTO v_current_balance, v_monthly_allocation
    FROM public.teacher_wallets 
    WHERE teacher_id = p_teacher_id
    FOR UPDATE;
  END IF;
  
  -- Check teacher balance
  IF v_current_balance < credits_deducted THEN
    success := FALSE;
    remaining_balance := v_current_balance;
    error_message := 'Saldo de créditos insuficiente. Você precisa de ' || credits_deducted || ' créditos, mas possui apenas ' || v_current_balance || '.';
    RETURN NEXT;
    RETURN;
  END IF;
  
  v_new_balance := v_current_balance - credits_deducted;
  
  UPDATE public.teacher_wallets
  SET 
    current_balance = v_new_balance,
    credits_consumed = credits_consumed + credits_deducted,
    lifetime_credits = lifetime_credits + credits_deducted,
    updated_at = now()
  WHERE teacher_id = p_teacher_id;
  
  INSERT INTO public.credit_transactions (teacher_id, type, amount, source, reference_id, description)
  VALUES (p_teacher_id, 'consumption', -credits_deducted, p_feature_id, COALESCE(p_student_id::text, ''), p_description);
  
  INSERT INTO public.usage_analytics (teacher_id, student_id, feature, credits_consumed)
  VALUES (p_teacher_id, p_student_id, p_feature_id, credits_deducted);
  
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
