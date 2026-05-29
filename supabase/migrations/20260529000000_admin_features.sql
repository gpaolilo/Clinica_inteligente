-- Migration: Admin Features (Profiles Email, Email Logs, and Student Enrollment Requests)
-- Created At: 2026-05-29

-- 1. Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill email for existing profiles from psychologists and patients
UPDATE public.profiles p
SET email = psy.email
FROM public.psychologists psy
WHERE p.id = psy.id AND p.email IS NULL;

UPDATE public.profiles p
SET email = pat.email
FROM public.patients pat
WHERE p.id = pat.user_id AND pat.email IS NOT NULL AND p.email IS NULL;

-- 3. Update handle_new_user_profile_sync to include email sync
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
BEGIN
  -- Cria ou atualiza o perfil em public.profiles (incluindo e-mail)
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sem Nome'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  -- Vincula o paciente/aluno existente por correspondência de e-mail
  UPDATE public.patients
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL
  RETURNING id INTO v_patient_id;

  -- Se um aluno foi vinculado, assegura que ele possua o perfil de gamificação ativo
  IF v_patient_id IS NOT NULL THEN
    INSERT INTO public.gamification_profiles (patient_id)
    VALUES (v_patient_id)
    ON CONFLICT (patient_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create table: system_email_logs
CREATE TABLE IF NOT EXISTS public.system_email_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'SENT'
);

CREATE INDEX IF NOT EXISTS idx_system_email_logs_recipient ON public.system_email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_system_email_logs_sent_at ON public.system_email_logs(sent_at);

-- Enable RLS for system_email_logs
ALTER TABLE public.system_email_logs ENABLE ROW LEVEL SECURITY;

-- Admins control system_email_logs
DROP POLICY IF EXISTS "Admins controlam logs de e-mail" ON public.system_email_logs;
CREATE POLICY "Admins controlam logs de e-mail" ON public.system_email_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- 5. Create table: student_enrollment_requests
CREATE TABLE IF NOT EXISTS public.student_enrollment_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_name text NOT NULL,
  student_email text NOT NULL,
  student_phone text NOT NULL,
  teacher_id uuid REFERENCES public.psychologists(id) ON DELETE CASCADE NOT NULL,
  student_level text,
  student_goal text,
  status text DEFAULT 'PENDING'::text CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollment_requests_email ON public.student_enrollment_requests(student_email);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_requests_status ON public.student_enrollment_requests(status);

-- Enable RLS for student_enrollment_requests
ALTER TABLE public.student_enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Admins control student_enrollment_requests
DROP POLICY IF EXISTS "Admins controlam solicitações de alunos" ON public.student_enrollment_requests;
CREATE POLICY "Admins controlam solicitações de alunos" ON public.student_enrollment_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Public can insert (allows prospective students to enroll)
DROP POLICY IF EXISTS "Leitura e inserção pública de solicitações de alunos" ON public.student_enrollment_requests;
CREATE POLICY "Leitura e inserção pública de solicitações de alunos" ON public.student_enrollment_requests
  FOR ALL USING (true);

-- Teachers can read requests assigned to them
DROP POLICY IF EXISTS "Professores leem solicitações atreladas a eles" ON public.student_enrollment_requests;
CREATE POLICY "Professores leem solicitações atreladas a eles" ON public.student_enrollment_requests
  FOR SELECT USING (
    teacher_id = auth.uid()
  );

-- 6. Correct teacher_signup_requests RLS Select policy to avoid permission denied on auth.users table
DROP POLICY IF EXISTS "Usuários leem suas próprias solicitações" ON public.teacher_signup_requests;
CREATE POLICY "Usuários leem suas próprias solicitações" ON public.teacher_signup_requests
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
  );

-- 7. Trigger to automatically log teacher signup receipt email
CREATE OR REPLACE FUNCTION public.log_teacher_signup_request_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.system_email_logs (recipient, subject, body, status)
  VALUES (
    NEW.email,
    'Recebemos sua solicitação de acesso ao Flowike! 🚀',
    'Olá ' || NEW.full_name || ',' || chr(10) || chr(10) ||
    'Obrigado pelo seu interesse no Flowike. Recebemos sua solicitação de acesso para a academia "' || NEW.academy_name || '".' || chr(10) || chr(10) ||
    'Nossa equipe está revisando suas informações e você receberá uma atualização por e-mail assim que for aprovado.' || chr(10) || chr(10) ||
    'Acesse o portal para acompanhar o status:' || chr(10) ||
    'https://clinica-inteligente-web-chi.vercel.app/login' || chr(10) || chr(10) ||
    'Atenciosamente,' || chr(10) ||
    'Equipe Flowike',
    'SENT'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_teacher_signup_request_email ON public.teacher_signup_requests;
CREATE TRIGGER trigger_log_teacher_signup_request_email
  AFTER INSERT ON public.teacher_signup_requests
  FOR EACH ROW EXECUTE PROCEDURE public.log_teacher_signup_request_email();

-- 8. Trigger to automatically log student enrollment receipt email
CREATE OR REPLACE FUNCTION public.log_student_enrollment_request_email()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_name TEXT;
BEGIN
  SELECT full_name INTO v_teacher_name FROM public.psychologists WHERE id = NEW.teacher_id;
  
  INSERT INTO public.system_email_logs (recipient, subject, body, status)
  VALUES (
    NEW.student_email,
    'Sua solicitação de matrícula foi recebida! 🎓',
    'Olá ' || NEW.student_name || ',' || chr(10) || chr(10) ||
    'Sua solicitação de matrícula para a academia do professor ' || COALESCE(v_teacher_name, 'parceiro') || ' foi recebida com sucesso.' || chr(10) || chr(10) ||
    'A solicitação está aguardando revisão e confirmação da nossa equipe e do professor. Você receberá uma atualização assim que a matrícula for confirmada.' || chr(10) || chr(10) ||
    'Atenciosamente,' || chr(10) ||
    'Equipe Flowike',
    'SENT'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_student_enrollment_request_email ON public.student_enrollment_requests;
CREATE TRIGGER trigger_log_student_enrollment_request_email
  AFTER INSERT ON public.student_enrollment_requests
  FOR EACH ROW EXECUTE PROCEDURE public.log_student_enrollment_request_email();

