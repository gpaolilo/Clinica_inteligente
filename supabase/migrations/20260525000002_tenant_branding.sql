-- Migration: Sistema de Branding White-Label Multitenant

-- 1. Tabela public.tenants (Core Identity)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  status text DEFAULT 'ACTIVE'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexação para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON public.tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- 2. Tabela public.tenant_brand_settings (Published settings)
CREATE TABLE IF NOT EXISTS public.tenant_brand_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  app_name text NOT NULL,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  accent_color text NOT NULL,
  background_color text NOT NULL,
  text_color text NOT NULL,
  theme_mode text DEFAULT 'light'::text NOT NULL,
  button_style text DEFAULT 'Rounded'::text NOT NULL,
  card_style text DEFAULT 'Minimal'::text NOT NULL,
  design_preset text DEFAULT 'Minimal'::text NOT NULL,
  login_message text,
  dashboard_message text,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_brand_settings_tenant_id ON public.tenant_brand_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_brand_settings_is_published ON public.tenant_brand_settings(is_published);

-- 3. Tabela public.tenant_assets (Branding Assets)
CREATE TABLE IF NOT EXISTS public.tenant_assets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url text,
  favicon_url text,
  banner_url text,
  login_background_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_assets_tenant_id ON public.tenant_assets(tenant_id);

-- 4. Tabela public.tenant_brand_drafts (Drafs settings before publishing)
CREATE TABLE IF NOT EXISTS public.tenant_brand_drafts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  draft_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_brand_drafts_tenant_id ON public.tenant_brand_drafts(tenant_id);

-- 5. Trigger e Função de atualizacao de updated_at para todas as tabelas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trigger_tenant_brand_settings_updated_at BEFORE UPDATE ON public.tenant_brand_settings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trigger_tenant_assets_updated_at BEFORE UPDATE ON public.tenant_assets FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trigger_tenant_brand_drafts_updated_at BEFORE UPDATE ON public.tenant_brand_drafts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 6. Trigger para auto-provisionar Tenant e Configurações padrões quando um novo psicólogo/professor se cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_psychologist_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
  v_tenant_id UUID;
BEGIN
  -- Cria slug único a partir do nome
  v_slug := lower(regexp_replace(regexp_replace(NEW.full_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'academy-' || substring(NEW.id::text, 1, 8);
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substring(NEW.id::text, 1, 6);
  END IF;

  -- Insere o Tenant
  INSERT INTO public.tenants (owner_user_id, name, slug, status)
  VALUES (NEW.id, NEW.full_name, v_slug, 'ACTIVE')
  RETURNING id INTO v_tenant_id;

  -- Insere as configurações padrão de branding (publicadas por padrão inicialmente)
  INSERT INTO public.tenant_brand_settings (
    tenant_id, app_name, primary_color, secondary_color, accent_color, background_color, text_color, 
    theme_mode, button_style, card_style, design_preset, login_message, dashboard_message, is_published
  ) VALUES (
    v_tenant_id, NEW.full_name || ' Academy', '#22c55e', '#15803d', '#D4FF59', '#F8F9FA', '#1A1A1A',
    'light', 'Rounded', 'Minimal', 'Minimal', 'Bem-vindo ao Portal de Ensino', 'Pronto para a aula de hoje?', true
  );

  -- Insere assets vazios
  INSERT INTO public.tenant_assets (tenant_id)
  VALUES (v_tenant_id);

  -- Insere o primeiro draft de rascunho
  INSERT INTO public.tenant_brand_drafts (tenant_id, draft_json)
  VALUES (v_tenant_id, json_build_object(
    'app_name', NEW.full_name || ' Academy',
    'primary_color', '#22c55e',
    'secondary_color', '#15803d',
    'accent_color', '#D4FF59',
    'background_color', '#F8F9FA',
    'text_color', '#1A1A1A',
    'theme_mode', 'light',
    'button_style', 'Rounded',
    'card_style', 'Minimal',
    'design_preset', 'Minimal',
    'login_message', 'Bem-vindo ao Portal de Ensino',
    'dashboard_message', 'Pronto para a aula de hoje?'
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associa o trigger à tabela psychologists
DROP TRIGGER IF EXISTS on_psychologist_created ON public.psychologists;
CREATE TRIGGER on_psychologist_created
  AFTER INSERT ON public.psychologists
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_psychologist_tenant();

-- 7. Backfill para psicólogos/professores atuais existentes
DO $$
DECLARE
  r RECORD;
  v_slug TEXT;
  v_tenant_id UUID;
BEGIN
  FOR r IN SELECT * FROM public.psychologists LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE owner_user_id = r.id) THEN
      v_slug := lower(regexp_replace(regexp_replace(r.full_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
      IF v_slug = '' OR v_slug IS NULL THEN
        v_slug := 'academy-' || substring(r.id::text, 1, 8);
      END IF;
      
      IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substring(r.id::text, 1, 6);
      END IF;

      INSERT INTO public.tenants (owner_user_id, name, slug, status)
      VALUES (r.id, r.full_name, v_slug, 'ACTIVE')
      RETURNING id INTO v_tenant_id;

      INSERT INTO public.tenant_brand_settings (
        tenant_id, app_name, primary_color, secondary_color, accent_color, background_color, text_color, 
        theme_mode, button_style, card_style, design_preset, login_message, dashboard_message, is_published
      ) VALUES (
        v_tenant_id, r.full_name || ' Academy', '#22c55e', '#15803d', '#D4FF59', '#F8F9FA', '#1A1A1A',
        'light', 'Rounded', 'Minimal', 'Minimal', 'Bem-vindo ao Portal de Ensino', 'Pronto para a aula de hoje?', true
      );

      INSERT INTO public.tenant_assets (tenant_id) VALUES (v_tenant_id);

      INSERT INTO public.tenant_brand_drafts (tenant_id, draft_json)
      VALUES (v_tenant_id, json_build_object(
        'app_name', r.full_name || ' Academy',
        'primary_color', '#22c55e',
        'secondary_color', '#15803d',
        'accent_color', '#D4FF59',
        'background_color', '#F8F9FA',
        'text_color', '#1A1A1A',
        'theme_mode', 'light',
        'button_style', 'Rounded',
        'card_style', 'Minimal',
        'design_preset', 'Minimal',
        'login_message', 'Bem-vindo ao Portal de Ensino',
        'dashboard_message', 'Pronto para a aula de hoje?'
      ));
    END IF;
  END FOR;
END $$;

-- 8. Configuração de Row Level Security (RLS)

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_brand_drafts ENABLE ROW LEVEL SECURITY;

-- Políticas para TENANTS
-- Qualquer um pode visualizar Tenants ativos (para carregar login/branding antes da autenticação)
CREATE POLICY "Leitura pública de Tenants ativos" ON public.tenants 
  FOR SELECT USING (status = 'ACTIVE');

-- Somente o próprio dono (Teacher) pode gerenciar o Tenant
CREATE POLICY "Professores gerenciam seu próprio Tenant" ON public.tenants 
  FOR ALL USING (auth.uid() = owner_user_id);

-- Políticas para TENANT_BRAND_SETTINGS
-- Qualquer um pode ler configurações publicadas de branding (para carregar telas de login, etc.)
CREATE POLICY "Leitura pública de configurações de branding publicadas" ON public.tenant_brand_settings 
  FOR SELECT USING (is_published = true);

-- Somente o dono do tenant pode atualizar/gerenciar as configurações do tenant
CREATE POLICY "Professores gerenciam configurações de branding de seu Tenant" ON public.tenant_brand_settings 
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid())
  );

-- Políticas para TENANT_ASSETS
-- Leitura pública das URLs de assets de branding
CREATE POLICY "Leitura pública de assets de branding" ON public.tenant_assets 
  FOR SELECT USING (true);

-- Somente o dono do tenant pode atualizar assets do seu tenant
CREATE POLICY "Professores gerenciam assets de seu Tenant" ON public.tenant_assets 
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid())
  );

-- Políticas para TENANT_BRAND_DRAFTS
-- Somente o dono do tenant pode ler, atualizar ou excluir drafts
CREATE POLICY "Professores gerenciam drafts de seu Tenant" ON public.tenant_brand_drafts 
  FOR ALL USING (
    tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid())
  );

-- 9. Criação e políticas de Storage para bucket tenant-assets
-- Insere o bucket tenant-assets se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Configura políticas do Storage para tenant-assets
-- 1. Qualquer pessoa pode visualizar assets públicos do tenant
DROP POLICY IF EXISTS "Leitura pública de Assets de Tenant" ON storage.objects;
CREATE POLICY "Leitura pública de Assets de Tenant" ON storage.objects 
  FOR SELECT USING (bucket_id = 'tenant-assets');

-- 2. Somente o dono (Teacher) pode fazer upload de assets para a sua pasta /{tenant_id}/*
DROP POLICY IF EXISTS "Upload de Assets pelo Dono do Tenant" ON storage.objects;
CREATE POLICY "Upload de Assets pelo Dono do Tenant" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-assets' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.tenants WHERE owner_user_id = auth.uid()
    )
  );

-- 3. Somente o dono (Teacher) pode atualizar/deletar assets de sua pasta
DROP POLICY IF EXISTS "Edição e exclusão de Assets pelo Dono" ON storage.objects;
CREATE POLICY "Edição e exclusão de Assets pelo Dono" ON storage.objects 
  FOR ALL USING (
    bucket_id = 'tenant-assets' 
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.tenants WHERE owner_user_id = auth.uid()
    )
  );

