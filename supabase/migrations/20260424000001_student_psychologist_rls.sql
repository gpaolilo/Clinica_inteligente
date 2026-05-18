-- Migration: Permitir que estudantes/pacientes leiam os dados de seu psicólogo/professor

DROP POLICY IF EXISTS "Pacientes podem ler perfis de seus psicólogos" ON public.psychologists;
CREATE POLICY "Pacientes podem ler perfis de seus psicólogos" ON public.psychologists FOR SELECT USING (
  id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
);
