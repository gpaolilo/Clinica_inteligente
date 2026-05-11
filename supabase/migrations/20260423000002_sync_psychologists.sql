-- Migration: Sincronizar usuários na tabela psychologists
-- Garante que todos os usuários existentes no Auth tenham um registro na tabela psychologists (que atua como a tabela de tenants/profissionais).
-- Se um professor/psicólogo não tiver esse registro, ele não consegue criar pacientes (falha de Foreign Key).

INSERT INTO public.psychologists (id, full_name, email)
SELECT id, coalesce(raw_user_meta_data->>'full_name', 'Sem Nome'), email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.psychologists);
