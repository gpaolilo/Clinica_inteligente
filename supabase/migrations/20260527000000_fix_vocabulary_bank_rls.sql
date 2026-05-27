-- Migration: Corrigir RLS para permitir que Professores/Psicólogos criem e gerenciem vocabulário de seus pacientes/alunos
-- Data: 2026-05-27

DROP POLICY IF EXISTS "Psychologists podem ver vocabulário de seus pacientes" ON public.vocabulary_bank;
DROP POLICY IF EXISTS "Psychologists gerenciam vocabulário de seus pacientes" ON public.vocabulary_bank;

CREATE POLICY "Psychologists gerenciam vocabulário de seus pacientes" ON public.vocabulary_bank FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = vocabulary_bank.patient_id AND patients.psychologist_id = auth.uid()
    )
);
