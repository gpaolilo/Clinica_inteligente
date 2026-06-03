-- Migration: Add update policy for teacher_signup_requests to allow upserts/updates by email owner
-- Created At: 2026-06-03

DROP POLICY IF EXISTS "Usuários atualizam suas próprias solicitações" ON public.teacher_signup_requests;
CREATE POLICY "Usuários atualizam suas próprias solicitações" ON public.teacher_signup_requests
  FOR UPDATE USING (
    email = (auth.jwt() ->> 'email')
  );
