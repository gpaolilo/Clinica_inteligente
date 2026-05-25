-- Migration: Persistir credenciais do Google Calendar
-- Adiciona colunas para armazenar access_token, refresh_token e expiração do Google Calendar no registro do psicólogo

ALTER TABLE public.psychologists 
ADD COLUMN IF NOT EXISTS google_access_token text,
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS google_token_expires_at timestamp with time zone;
