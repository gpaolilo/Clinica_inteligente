-- Migration: Teacher Approval System and White-Label Onboarding
-- Created At: 2026-05-28

-- 1. Table: teacher_signup_requests
CREATE TABLE IF NOT EXISTS public.teacher_signup_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  academy_name text NOT NULL,
  country text NOT NULL,
  teaching_area text NOT NULL,
  student_count integer NOT NULL,
  website text,
  challenge text,
  current_tools text,
  status text DEFAULT 'PENDING'::text CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_signup_requests_email ON public.teacher_signup_requests(email);
CREATE INDEX IF NOT EXISTS idx_teacher_signup_requests_status ON public.teacher_signup_requests(status);

-- 2. Table: onboarding_progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  step integer DEFAULT 1 NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_teacher ON public.onboarding_progress(teacher_id);

-- 3. Table: academy_profiles
CREATE TABLE IF NOT EXISTS public.academy_profiles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  academy_name text NOT NULL,
  academy_tagline text,
  academy_description text,
  teaching_style text,
  design_preset text DEFAULT 'Minimal'::text,
  primary_color text DEFAULT '#22c55e'::text,
  secondary_color text DEFAULT '#15803d'::text,
  accent_color text DEFAULT '#D4FF59'::text,
  logo_url text,
  favicon_url text,
  banner_url text,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_academy_profiles_teacher ON public.academy_profiles(teacher_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.teacher_signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- teacher_signup_requests Policies:
-- Public can submit requests (insert)
CREATE POLICY "Leitura e inserção pública de solicitações" ON public.teacher_signup_requests
  FOR INSERT WITH CHECK (true);

-- Users can check their own request status by email match or exact auth.uid()
CREATE POLICY "Usuários leem suas próprias solicitações" ON public.teacher_signup_requests
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admin has full access to requests
CREATE POLICY "Admins controlam solicitações de professores" ON public.teacher_signup_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- onboarding_progress Policies:
-- Teachers can manage their own onboarding progress
CREATE POLICY "Professores gerenciam seu progresso de onboarding" ON public.onboarding_progress
  FOR ALL USING (auth.uid() = teacher_id);

-- academy_profiles Policies:
-- Anyone can view published academy profiles (needed for public brand loading)
CREATE POLICY "Leitura pública de perfis publicados" ON public.academy_profiles
  FOR SELECT USING (is_published = true OR auth.uid() = teacher_id);

-- Teachers can manage their own profile
CREATE POLICY "Professores gerenciam seu próprio perfil" ON public.academy_profiles
  FOR ALL USING (auth.uid() = teacher_id);

-- 6. Trigger update updated_at on onboarding_progress and academy_profiles
CREATE OR REPLACE TRIGGER trigger_onboarding_progress_updated_at 
  BEFORE UPDATE ON public.onboarding_progress 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_academy_profiles_updated_at 
  BEFORE UPDATE ON public.academy_profiles 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 7. Redeclare public.handle_new_psychologist_tenant()
-- Updates status to 'PENDING' if user role is 'TEACHER'
CREATE OR REPLACE FUNCTION public.handle_new_psychologist_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
  v_tenant_id UUID;
  v_role TEXT;
  v_tenant_status TEXT := 'ACTIVE';
BEGIN
  -- Cria slug único a partir do nome
  v_slug := lower(regexp_replace(regexp_replace(NEW.full_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'academy-' || substring(NEW.id::text, 1, 8);
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substring(NEW.id::text, 1, 6);
  END IF;

  -- Determina papel do usuário para ajustar status do Tenant
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.id;
  IF v_role = 'TEACHER' THEN
    v_tenant_status := 'PENDING';
  END IF;

  -- Insere o Tenant
  INSERT INTO public.tenants (owner_user_id, name, slug, status)
  VALUES (NEW.id, NEW.full_name, v_slug, v_tenant_status)
  RETURNING id INTO v_tenant_id;

  -- Insere as configurações padrão de branding (não publicadas por padrão para professores)
  INSERT INTO public.tenant_brand_settings (
    tenant_id, app_name, primary_color, secondary_color, accent_color, background_color, text_color, 
    theme_mode, button_style, card_style, design_preset, login_message, dashboard_message, is_published
  ) VALUES (
    v_tenant_id, NEW.full_name || ' Academy', '#22c55e', '#15803d', '#D4FF59', '#F8F9FA', '#1A1A1A',
    'light', 'Rounded', 'Minimal', 'Minimal', 'Bem-vindo ao Portal de Ensino', 'Pronto para a aula de hoje?', (v_role != 'TEACHER')
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

-- Reassociar trigger à tabela psychologists
DROP TRIGGER IF EXISTS on_psychologist_created ON public.psychologists;
CREATE TRIGGER on_psychologist_created
  AFTER INSERT ON public.psychologists
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_psychologist_tenant();

-- 8. Trigger sync: Sync from public.academy_profiles to public.tenant_brand_settings, public.tenant_assets, and public.tenant_brand_drafts
CREATE OR REPLACE FUNCTION public.sync_academy_profile_to_branding()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Obter o ID do tenant
  SELECT id INTO v_tenant_id FROM public.tenants WHERE owner_user_id = NEW.teacher_id;

  IF v_tenant_id IS NOT NULL THEN
    -- 1. Sincronizar tenant_brand_settings
    INSERT INTO public.tenant_brand_settings (
      tenant_id, app_name, primary_color, secondary_color, accent_color, background_color, text_color, 
      theme_mode, button_style, card_style, design_preset, login_message, dashboard_message, is_published
    ) VALUES (
      v_tenant_id, NEW.academy_name, NEW.primary_color, NEW.secondary_color, NEW.accent_color, '#F8F9FA', '#1A1A1A',
      'light', 'Rounded', NEW.card_style, NEW.design_preset, COALESCE(NEW.academy_tagline, 'Bem-vindo ao Portal de Ensino'), 'Pronto para a aula de hoje?', NEW.is_published
    )
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      app_name = EXCLUDED.app_name,
      primary_color = EXCLUDED.primary_color,
      secondary_color = EXCLUDED.secondary_color,
      accent_color = EXCLUDED.accent_color,
      card_style = EXCLUDED.card_style,
      design_preset = EXCLUDED.design_preset,
      login_message = EXCLUDED.login_message,
      is_published = EXCLUDED.is_published,
      updated_at = now();

    -- 2. Sincronizar tenant_assets
    UPDATE public.tenant_assets
    SET
      logo_url = NEW.logo_url,
      favicon_url = NEW.favicon_url,
      banner_url = NEW.banner_url,
      updated_at = now()
    WHERE tenant_id = v_tenant_id;

    -- 3. Sincronizar tenant_brand_drafts
    INSERT INTO public.tenant_brand_drafts (tenant_id, draft_json)
    VALUES (
      v_tenant_id, 
      json_build_object(
        'app_name', NEW.academy_name,
        'primary_color', NEW.primary_color,
        'secondary_color', NEW.secondary_color,
        'accent_color', NEW.accent_color,
        'background_color', '#F8F9FA',
        'text_color', '#1A1A1A',
        'theme_mode', 'light',
        'button_style', 'Rounded',
        'card_style', NEW.card_style,
        'design_preset', NEW.design_preset,
        'login_message', COALESCE(NEW.academy_tagline, 'Bem-vindo ao Portal de Ensino'),
        'dashboard_message', 'Pronto para a aula de hoje?'
      )
    )
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      draft_json = EXCLUDED.draft_json,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_sync_academy_profile_to_branding
  AFTER INSERT OR UPDATE ON public.academy_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_academy_profile_to_branding();
