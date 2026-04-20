-- Adição de colunas na tabela patients para suportar Alunos
alter table public.patients 
  add column if not exists client_type text default 'PACIENTE',
  add column if not exists student_level text,
  add column if not exists student_goal text;
