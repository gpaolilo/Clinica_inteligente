-- 1. Tabela: packages (Agrupamento lógico de consultas)
create table public.packages (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  name text not null,
  total_price numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela: invoices (Faturas unitárias atreladas a pacientes ou pacotes)
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  psychologist_id uuid references public.psychologists(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete set null,
  amount numeric(10,2) not null,
  status text default 'OPEN'::text, -- OPEN, PAID, CANCELLED, OVERDUE
  due_date timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Políticas Anti-Vazamento (RLS)
alter table public.packages enable row level security;
alter table public.invoices enable row level security;

create policy "Tenant controla apenas seus pacotes" 
  on public.packages for all using (auth.uid() = psychologist_id);

create policy "Tenant controla apenas suas faturas" 
  on public.invoices for all using (auth.uid() = psychologist_id);

-- 3. Stored Procedure (RPC) para geração em massa atômica
CREATE OR REPLACE FUNCTION create_monthly_package(
  p_psychologist_id uuid,
  p_patient_id uuid,
  p_name text,
  p_total_price numeric,
  p_number_of_sessions int
) RETURNS uuid AS $$
DECLARE
  new_pkg_id uuid;
  split_amount numeric;
BEGIN
  -- Cria o Pacote Pai
  INSERT INTO public.packages (psychologist_id, patient_id, name, total_price)
  VALUES (p_psychologist_id, p_patient_id, p_name, p_total_price)
  RETURNING id INTO new_pkg_id;

  -- Insere X Faturas equivalentes ao número de sessões
  split_amount := p_total_price / p_number_of_sessions;

  FOR i IN 1..p_number_of_sessions LOOP
    INSERT INTO public.invoices (psychologist_id, patient_id, package_id, amount, status, due_date)
    VALUES (p_psychologist_id, p_patient_id, new_pkg_id, split_amount, 'OPEN', CURRENT_DATE + (i * INTERVAL '7 days'));
  END LOOP;

  RETURN new_pkg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
