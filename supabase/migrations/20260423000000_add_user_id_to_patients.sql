-- Migration: Add user_id to patients table to link Auth Users
-- This allows students/patients to log into their own portals and see their data.

ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Atualizar política de RLS para permitir que o próprio paciente leia seus dados
-- (Opcional, mas recomendado para o ClientDashboard)
DROP POLICY IF EXISTS "Paciente pode ler seu próprio perfil" ON public.patients;
CREATE POLICY "Paciente pode ler seu próprio perfil" ON public.patients FOR SELECT USING (auth.uid() = user_id OR auth.uid() = psychologist_id);
