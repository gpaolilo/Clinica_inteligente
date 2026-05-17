-- Upgrade of Student Module: AI Learning Intelligence

-- 1. Vocabulary Memory System (Spaced Repetition)
CREATE TABLE public.vocabulary_bank (
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

ALTER TABLE public.vocabulary_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes podem gerenciar seu vocabulário" ON public.vocabulary_bank FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
CREATE POLICY "Psychologists podem ver vocabulário de seus pacientes" ON public.vocabulary_bank FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = vocabulary_bank.patient_id AND patients.psychologist_id = auth.uid()
    )
);

-- 2. Scenario Practice (AI Conversations)
CREATE TABLE public.scenario_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    scenario_type VARCHAR(100) NOT NULL, -- 'job_interview', 'sales_pitch', etc.
    transcript JSONB DEFAULT '[]'::jsonb, -- The chat history
    fluency_score INTEGER,
    grammar_score INTEGER,
    confidence_score INTEGER,
    feedback JSONB DEFAULT '{}'::jsonb,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.scenario_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes gerenciam suas sessões de cenário" ON public.scenario_sessions FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
CREATE POLICY "Psychologists podem ver cenários de seus pacientes" ON public.scenario_sessions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.patients 
        WHERE patients.id = scenario_sessions.patient_id AND patients.psychologist_id = auth.uid()
    )
);

-- 3. Gamification Profile
CREATE TABLE public.gamification_profiles (
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes podem ver seu perfil de gamificação" ON public.gamification_profiles FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);
CREATE POLICY "Sistema pode atualizar perfil de gamificação" ON public.gamification_profiles FOR ALL USING (true); -- Usually restricted by functions

-- 4. Achievements
CREATE TABLE public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    badge_id VARCHAR(100) NOT NULL, -- e.g., '7_day_streak', 'vocab_master'
    unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes podem ver suas conquistas" ON public.achievements FOR SELECT USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
);

-- Ensure a gamification profile is created when a patient is created
CREATE OR REPLACE FUNCTION public.create_gamification_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gamification_profiles (patient_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_patient_created_gamification
  AFTER INSERT ON public.patients
  FOR EACH ROW EXECUTE PROCEDURE public.create_gamification_profile();
