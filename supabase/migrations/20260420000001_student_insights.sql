-- 1. Tabela: student_insights (Armazena as analises pós-aula para Alunos)
create table public.student_insights (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  summary text,
  fluency_score integer,
  confidence_score integer,
  grammar_errors jsonb default '[]'::jsonb,
  vocabulary_suggestions jsonb default '[]'::jsonb,
  main_weaknesses jsonb default '[]'::jsonb,
  recommended_topics jsonb default '[]'::jsonb,
  next_actions jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.student_insights enable row level security;
create policy "Psychologist gerencia seus student_insights" on public.student_insights for all using (auth.uid() = psychologist_id);

-- 2. Tabela: student_exercises (Armazena os exercicios gerados)
create table public.student_exercises (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  exercises jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.student_exercises enable row level security;
create policy "Psychologist gerencia seus student_exercises" on public.student_exercises for all using (auth.uid() = psychologist_id);
