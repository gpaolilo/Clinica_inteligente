-- 1. Table: session_transcripts (Stores the raw text and word-level timestamps)
create table public.session_transcripts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  transcript text,
  words jsonb default '[]'::jsonb, -- [{ word, start, end }]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.session_transcripts enable row level security;
create policy "Psychologist gerencia seus session_transcripts" on public.session_transcripts for all using (auth.uid() = psychologist_id);


-- 2. Table: learning_events (Stores granular errors and gaps extracted by AI)
create table public.learning_events (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  event_type text not null, -- 'grammar_error', 'vocabulary_gap', 'pronunciation_issue', 'context_need', 'learning_pattern'
  details jsonb not null, -- Stores the specific JSON for the event type
  severity text, -- 'low', 'medium', 'high'
  frequency integer default 1,
  confidence numeric default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.learning_events enable row level security;
create policy "Psychologist gerencia seus learning_events" on public.learning_events for all using (auth.uid() = psychologist_id);


-- 3. Table: student_profiles (Persistent profile for adaptive logic)
create table public.student_profiles (
  student_id uuid references public.patients(id) on delete cascade not null primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  level text default 'Beginner',
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  learning_patterns jsonb default '[]'::jsonb,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.student_profiles enable row level security;
create policy "Psychologist gerencia seus student_profiles" on public.student_profiles for all using (auth.uid() = psychologist_id);


-- 4. Table: homework_plans (The dynamically generated plan)
create table public.homework_plans (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  exercises jsonb default '[]'::jsonb,
  status text default 'DRAFT'::text, -- DRAFT, PUBLISHED
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.homework_plans enable row level security;
create policy "Psychologist gerencia seus homework_plans" on public.homework_plans for all using (auth.uid() = psychologist_id);


-- 5. Table: homework_results (To track completion)
create table public.homework_results (
  id uuid default uuid_generate_v4() primary key,
  homework_plan_id uuid references public.homework_plans(id) on delete cascade not null,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  exercises_results jsonb default '[]'::jsonb,
  score numeric,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.homework_results enable row level security;
create policy "Psychologist gerencia seus homework_results" on public.homework_results for all using (auth.uid() = psychologist_id);
