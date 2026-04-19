-- Migration Inicial: Tabelas core do SaaS Clínica Inteligente

-- 0. Habilitar extensões
create extension if not exists "uuid-ossp";

-- 1. Tabela: psychologists (Os assinantes/tenants)
create table public.psychologists (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text not null,
  email text not null unique,
  crp_number text,
  stripe_customer_id text,
  plan_type text default 'BASIC'::text,
  ia_minutes_used integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS no Tenant
alter table public.psychologists enable row level security;
create policy "Psychologist pode ler seu próprio perfil" on public.psychologists for select using (auth.uid() = id);
create policy "Psychologist pode atualizar seu próprio perfil" on public.psychologists for update using (auth.uid() = id);

-- 2. Tabela: patients (Pacientes atrelados rigorosamente ao psicólogo)
create table public.patients (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  name text not null,
  email text,
  phone text not null,
  lgpd_consent boolean default false,
  status text default 'ACTIVE'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.patients enable row level security;
create policy "Psychologist gerencia apenas seus pacientes" on public.patients for all using (auth.uid() = psychologist_id);

-- 3. Tabela: sessions (As consultas)
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  scheduled_date timestamp with time zone not null,
  status text default 'SCHEDULED'::text, -- SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
  price numeric(10, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sessions enable row level security;
create policy "Psychologist gerencia apenas suas consultas" on public.sessions for all using (auth.uid() = psychologist_id);

-- 4. Tabela: clinical_notes (Prontuário gerado por IA com restrição estrita)
create table public.clinical_notes (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null unique,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  template_type text default 'LIVRE'::text,
  ai_evolution text,
  final_note text,
  is_signed boolean default false,
  signed_at timestamp with time zone,
  status text default 'AWAITING_AUDIO'::text, -- AWAITING_AUDIO, PROCESSING_AUDIO, AWAITING_REVIEW, SIGNED
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clinical_notes enable row level security;
create policy "Psychologist gerencia apenas seus prontuários" on public.clinical_notes for all using (auth.uid() = psychologist_id);

-- 5. Trigger para criar o tenant (Psychologist) automaticamente após Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.psychologists (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Sem Nome'), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
