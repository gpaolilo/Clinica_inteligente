-- Migration: Add select policies on achievements and gamification_profiles for psychologists/teachers
-- Date: 2026-06-08

-- Allow psychologists/teachers to select achievements of their patients
DROP POLICY IF EXISTS "Psychologists podem ver conquistas de seus pacientes" ON public.achievements;
CREATE POLICY "Psychologists podem ver conquistas de seus pacientes" ON public.achievements FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = achievements.patient_id AND patients.psychologist_id = auth.uid()
    )
);

-- Allow psychologists/teachers to select gamification profiles of their patients
DROP POLICY IF EXISTS "Psychologists podem ver gamificacao de seus pacientes" ON public.gamification_profiles;
CREATE POLICY "Psychologists podem ver gamificacao de seus pacientes" ON public.gamification_profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = gamification_profiles.patient_id AND patients.psychologist_id = auth.uid()
    )
);
