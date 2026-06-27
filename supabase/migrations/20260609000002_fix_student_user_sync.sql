-- Migration: Fix case sensitivity issue on student email sync and backfill existing unlinked students
-- Date: 2026-06-27

-- 1. Redefine the sync function to use case-insensitive email comparison
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- 1. Cria ou atualiza o perfil em public.profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sem Nome'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  -- 2. Vincula o paciente/aluno existente por correspondência de e-mail (case-insensitive)
  UPDATE public.patients
  SET user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL
  RETURNING id INTO v_patient_id;

  -- 3. Se um aluno foi vinculado, assegura que ele possua o perfil de gamificação ativo
  IF v_patient_id IS NOT NULL THEN
    INSERT INTO public.gamification_profiles (patient_id)
    VALUES (v_patient_id)
    ON CONFLICT (patient_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Run a one-time backfill to link existing patients/students where user_id is null but auth user email matches (case-insensitive)
UPDATE public.patients p
SET user_id = u.id
FROM auth.users u
WHERE LOWER(p.email) = LOWER(u.email) AND p.user_id IS NULL;

-- 3. Make sure any linked patients have gamification profiles
INSERT INTO public.gamification_profiles (patient_id)
SELECT id FROM public.patients
WHERE user_id IS NOT NULL
ON CONFLICT (patient_id) DO NOTHING;
