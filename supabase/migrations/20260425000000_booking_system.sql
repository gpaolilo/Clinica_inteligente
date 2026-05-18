-- Migration: Sistema de Agendamento do Aluno (Student Booking System)

-- 1. Tabela: booking_settings
create table public.booking_settings (
  psychologist_id uuid primary key references public.psychologists(id) on delete cascade,
  minimum_notice_hours int default 12,
  cancellation_limit_hours int default 12,
  default_class_duration int default 50,
  auto_accept_bookings boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.booking_settings enable row level security;
create policy "Psychologist gerencia suas configurações" on public.booking_settings for all using (auth.uid() = psychologist_id);
create policy "Pacientes podem ler configurações do seu psicólogo" on public.booking_settings for select using (
  psychologist_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
);

-- Inserir configurações padrão para psicólogos existentes
insert into public.booking_settings (psychologist_id)
select id from public.psychologists on conflict do nothing;

-- 2. Tabela: teacher_availability
create table public.teacher_availability (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Domingo, 6=Sábado
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.teacher_availability enable row level security;
create policy "Psychologist gerencia sua disponibilidade" on public.teacher_availability for all using (auth.uid() = psychologist_id);
create policy "Pacientes podem ler disponibilidade do seu psicólogo" on public.teacher_availability for select using (
  psychologist_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
);

-- 3. Tabela: teacher_extra_slots
create table public.teacher_extra_slots (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.teacher_extra_slots enable row level security;
create policy "Psychologist gerencia slots extras" on public.teacher_extra_slots for all using (auth.uid() = psychologist_id);
create policy "Pacientes podem ler slots extras do seu psicólogo" on public.teacher_extra_slots for select using (
  psychologist_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
);

-- 4. Tabela: teacher_blocked_slots
create table public.teacher_blocked_slots (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.teacher_blocked_slots enable row level security;
create policy "Psychologist gerencia bloqueios" on public.teacher_blocked_slots for all using (auth.uid() = psychologist_id);
create policy "Pacientes podem ler bloqueios do seu psicólogo" on public.teacher_blocked_slots for select using (
  psychologist_id IN (SELECT psychologist_id FROM public.patients WHERE user_id = auth.uid())
);

-- 5. Atualizar tabela: patients (adicionar saldo de aulas)
alter table public.patients add column if not exists class_balance numeric(10, 2) default 0;

-- 6. Atualizar tabela: sessions (adicionar duração e motivo de cancelamento)
alter table public.sessions add column if not exists duration int default 50;
alter table public.sessions add column if not exists cancellation_reason text;
alter table public.sessions add column if not exists booking_type text default 'SINGLE'; -- SINGLE, WEEKLY

-- 7. Função RPC para Booking Seguro (Debita Saldo e Cria Sessão)
create or replace function public.book_session(
    p_psychologist_id uuid,
    p_patient_id uuid,
    p_scheduled_date timestamptz,
    p_duration int
) returns uuid language plpgsql security definer as $$
declare
    v_session_id uuid;
    v_balance numeric;
    v_credits_needed numeric;
    v_price numeric;
begin
    -- Verificar se o usuário autenticado é o paciente (opcional, segurança adicional)
    -- ...

    -- Calcular créditos necessários (50 min = 1 crédito)
    v_credits_needed := p_duration / 50.0;

    -- Obter saldo atual do paciente
    select class_balance into v_balance from public.patients where id = p_patient_id;
    
    if v_balance < v_credits_needed then
        raise exception 'Saldo de aulas insuficiente';
    end if;
    
    -- Deduzir saldo (Atualizar paciente)
    update public.patients 
    set class_balance = class_balance - v_credits_needed 
    where id = p_patient_id;
    
    -- Definir um preço padrão (pode vir de uma config no futuro)
    v_price := 0; 
    
    -- Criar sessão
    insert into public.sessions (psychologist_id, patient_id, scheduled_date, duration, status, price, booking_type)
    values (p_psychologist_id, p_patient_id, p_scheduled_date, p_duration, 'SCHEDULED', v_price, 'SINGLE')
    returning id into v_session_id;
    
    return v_session_id;
end;
$$;

-- 8. Função RPC para Cancelamento Seguro (Estorna Saldo e Atualiza Status)
create or replace function public.cancel_session(
    p_session_id uuid,
    p_reason text
) returns void language plpgsql security definer as $$
declare
    v_patient_id uuid;
    v_duration int;
    v_credits_to_return numeric;
    v_status text;
begin
    -- Buscar dados da sessão
    select patient_id, duration, status into v_patient_id, v_duration, v_status
    from public.sessions
    where id = p_session_id;
    
    if v_status = 'CANCELLED' then
        raise exception 'Sessão já está cancelada';
    end if;

    -- Calcular créditos para estornar
    v_credits_to_return := v_duration / 50.0;

    -- Atualizar paciente (estorno)
    update public.patients 
    set class_balance = class_balance + v_credits_to_return 
    where id = v_patient_id;
    
    -- Atualizar sessão
    update public.sessions 
    set status = 'CANCELLED', cancellation_reason = p_reason
    where id = p_session_id;
end;
$$;
