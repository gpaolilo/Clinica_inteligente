-- Migration: RLS para Estudantes/Pacientes lerem seus próprios dados

-- Sessões: O paciente pode ver sessões atreladas a ele
DROP POLICY IF EXISTS "Pacientes podem ler suas sessões" ON public.sessions;
CREATE POLICY "Pacientes podem ler suas sessões" ON public.sessions FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- Prontuários/Anotações: O paciente pode ler se estiverem assinados/compartilhados e atrelados à sua sessão
DROP POLICY IF EXISTS "Pacientes podem ler seus prontuários" ON public.clinical_notes;
CREATE POLICY "Pacientes podem ler seus prontuários" ON public.clinical_notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    JOIN public.patients ON patients.id = sessions.patient_id 
    WHERE sessions.id = clinical_notes.session_id AND patients.user_id = auth.uid()
  )
);

-- Planos de Tarefa (Homework): O paciente pode ler exercícios publicados atrelados a ele
DROP POLICY IF EXISTS "Pacientes podem ler seus exercícios" ON public.homework_plans;
CREATE POLICY "Pacientes podem ler seus exercícios" ON public.homework_plans FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- Tarefas Concluídas: O paciente pode criar e ver suas próprias respostas
DROP POLICY IF EXISTS "Pacientes podem gerenciar suas tarefas concluídas" ON public.homework_results;
CREATE POLICY "Pacientes podem gerenciar suas tarefas concluídas" ON public.homework_results FOR ALL USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
