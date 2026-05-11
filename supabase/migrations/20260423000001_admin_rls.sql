-- Migration: RLS para Administradores
-- Permite que usuários com role 'ADMIN' na tabela profiles tenham acesso total
-- às tabelas patients e psychologists.

-- Tabela: patients
DROP POLICY IF EXISTS "Admins gerenciam todos os pacientes" ON public.patients;
CREATE POLICY "Admins gerenciam todos os pacientes" ON public.patients FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  )
);

-- Tabela: psychologists (Para garantir que os admins possam listar os profissionais no dropdown)
DROP POLICY IF EXISTS "Admins podem ler psychologists" ON public.psychologists;
CREATE POLICY "Admins podem ler psychologists" ON public.psychologists FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
  )
);
