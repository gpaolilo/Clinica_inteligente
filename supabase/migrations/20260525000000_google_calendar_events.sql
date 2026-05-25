-- Migration: Tabela para integração bidirecional com o Google Calendar

create table public.google_calendar_events (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  google_event_id text not null,
  summary text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garantir que não existam duplicatas do mesmo evento para o mesmo psicólogo
create unique index idx_google_calendar_events_unique on public.google_calendar_events (psychologist_id, google_event_id);

alter table public.google_calendar_events enable row level security;

-- O psicólogo tem acesso total aos seus eventos
create policy "Psychologist manage their own google events" on public.google_calendar_events 
  for all using (auth.uid() = psychologist_id);

-- Os pacientes podem visualizar os eventos (necessário para calcular a disponibilidade do motor de agendamento)
create policy "Patients can read psychologist google events" on public.google_calendar_events 
  for select using (
    psychologist_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
  );
