-- Migration: Fix RLS policies on homework_results and homework_plans for teachers/psychologists
-- Date: 2026-06-27

-- 1. Redefine policies for public.homework_results to ensure psychologists can view and update
DROP POLICY IF EXISTS "Psychologist gerencia seus homework_results" ON public.homework_results;
DROP POLICY IF EXISTS "Psychologists podem ver resultados de seus pacientes" ON public.homework_results;
DROP POLICY IF EXISTS "Psychologists podem atualizar resultados de seus pacientes" ON public.homework_results;

-- Allow SELECT for the linked psychologist
CREATE POLICY "Psychologists podem ver resultados de seus pacientes" ON public.homework_results 
FOR SELECT USING (
  psychologist_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = homework_results.patient_id AND patients.psychologist_id = auth.uid()
  )
);

-- Allow UPDATE for the linked psychologist
CREATE POLICY "Psychologists podem atualizar resultados de seus pacientes" ON public.homework_results 
FOR UPDATE USING (
  psychologist_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = homework_results.patient_id AND patients.psychologist_id = auth.uid()
  )
);

-- 2. Redefine policies for public.homework_plans to ensure psychologists can view and update
DROP POLICY IF EXISTS "Psychologist gerencia seus homework_plans" ON public.homework_plans;
DROP POLICY IF EXISTS "Psychologists podem ver planos de seus pacientes" ON public.homework_plans;

-- Allow ALL operations for the linked psychologist
CREATE POLICY "Psychologists podem gerenciar planos de seus pacientes" ON public.homework_plans 
FOR ALL USING (
  psychologist_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.id = homework_plans.patient_id AND patients.psychologist_id = auth.uid()
  )
);
