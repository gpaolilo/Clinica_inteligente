-- Migration: Correção de Acesso do Estudante e Tabelas de Gamificação/Vocabulário
-- Data: 2026-05-26

-- 1. Criação das tabelas ausentes de IA/Gamificação do Aluno

CREATE TABLE IF NOT EXISTS public.vocabulary_bank (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    word VARCHAR(255) NOT NULL,
    pronunciation TEXT,
    definition TEXT NOT NULL,
    example_sentence TEXT,
    origin_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    mastery_score INTEGER DEFAULT 0, -- 0 to 100
    next_review_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scenario_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    scenario_type VARCHAR(100) NOT NULL,
    transcript JSONB DEFAULT '[]'::jsonb,
    fluency_score INTEGER,
    grammar_score INTEGER,
    confidence_score INTEGER,
    feedback JSONB DEFAULT '{}'::jsonb,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.gamification_profiles (
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    badge_id VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitação de RLS em todas as tabelas criadas

ALTER TABLE public.vocabulary_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para Alunos e Professores nas tabelas criadas

-- VOCABULARY BANK
DROP POLICY IF EXISTS "Pacientes podem gerenciar seu vocabulário" ON public.vocabulary_bank;
CREATE POLICY "Pacientes podem gerenciar seu vocabulário" ON public.vocabulary_bank FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Psychologists podem ver vocabulário de seus pacientes" ON public.vocabulary_bank;
CREATE POLICY "Psychologists podem ver vocabulário de seus pacientes" ON public.vocabulary_bank FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = vocabulary_bank.patient_id AND patients.psychologist_id = auth.uid()
    )
);

-- SCENARIO SESSIONS
DROP POLICY IF EXISTS "Pacientes gerenciam suas sessões de cenário" ON public.scenario_sessions;
CREATE POLICY "Pacientes gerenciam suas sessões de cenário" ON public.scenario_sessions FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Psychologists podem ver cenários de seus pacientes" ON public.scenario_sessions;
CREATE POLICY "Psychologists podem ver cenários de seus pacientes" ON public.scenario_sessions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = scenario_sessions.patient_id AND patients.psychologist_id = auth.uid()
    )
);

-- GAMIFICATION PROFILES
DROP POLICY IF EXISTS "Pacientes podem ver seu perfil de gamificação" ON public.gamification_profiles;
CREATE POLICY "Pacientes podem ver seu perfil de gamificação" ON public.gamification_profiles FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "Sistema pode atualizar perfil de gamificação" ON public.gamification_profiles;
CREATE POLICY "Sistema pode atualizar perfil de gamificação" ON public.gamification_profiles FOR ALL USING (true);

-- ACHIEVEMENTS
DROP POLICY IF EXISTS "Pacientes podem ver suas conquistas" ON public.achievements;
CREATE POLICY "Pacientes podem ver suas conquistas" ON public.achievements FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- 4. Adição de políticas de RLS para estudantes visualizarem dados essenciais existentes

-- STUDENT INSIGHTS (Evolução & Insights)
ALTER TABLE public.student_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pacientes podem ler seus próprios insights" ON public.student_insights;
CREATE POLICY "Pacientes podem ler seus próprios insights" ON public.student_insights FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- STUDENT EXERCISES (Exercícios de Fixação)
ALTER TABLE public.student_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pacientes podem ler seus próprios exercícios de fixação" ON public.student_exercises;
CREATE POLICY "Pacientes podem ler seus próprios exercícios de fixação" ON public.student_exercises FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- STUDENT PROFILES (Nível e Objetivos)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pacientes podem ler seu próprio perfil de estudante" ON public.student_profiles;
CREATE POLICY "Pacientes podem ler seu próprio perfil de estudante" ON public.student_profiles FOR SELECT USING (
  student_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- LEARNING EVENTS (Tendências e Erros detalhados para Analytics)
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pacientes podem ler seus próprios eventos de aprendizado" ON public.learning_events;
CREATE POLICY "Pacientes podem ler seus próprios eventos de aprendizado" ON public.learning_events FOR SELECT USING (
  patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);


-- 5. Configuração e Correção de Triggers

-- Trigger para criar o perfil de gamificação automaticamente no insert de novos pacientes/alunos
CREATE OR REPLACE FUNCTION public.create_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gamification_profiles (patient_id)
  VALUES (NEW.id)
  ON CONFLICT (patient_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_patient_created_gamification ON public.patients;
CREATE TRIGGER on_patient_created_gamification
  AFTER INSERT ON public.patients
  FOR EACH ROW EXECUTE PROCEDURE public.create_gamification_profile();

-- Backfill para perfis de gamificação de alunos existentes
INSERT INTO public.gamification_profiles (patient_id)
SELECT id FROM public.patients
ON CONFLICT (patient_id) DO NOTHING;

-- Correção da função handle_new_user() de psychologists para evitar inclusão indevida de Alunos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Somente insere na tabela psychologists se a role não for STUDENT ou PATIENT
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'PSYCHOLOGIST') IN ('PSYCHOLOGIST', 'TEACHER', 'ADMIN') THEN
    INSERT INTO public.psychologists (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sem Nome'), NEW.email)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar e criar perfis em public.profiles e vincular o user_id do paciente na criação do usuário do Auth
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

  -- 2. Vincula o paciente/aluno existente por correspondência de e-mail
  UPDATE public.patients
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL
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

DROP TRIGGER IF EXISTS on_auth_user_created_profile_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_profile_sync
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile_sync();
