import { supabase } from './supabase'

export interface BrandSettings {
  app_name: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  theme_mode: 'light' | 'dark' | 'system'
  button_style: 'Rounded' | 'Pill' | 'Sharp' | 'Soft'
  card_style: 'Minimal' | 'Elevated' | 'Glass' | 'Bordered'
  design_preset: string
  login_message?: string
  dashboard_message?: string
  is_published?: boolean
  logo_url?: string | null
  favicon_url?: string | null
  banner_url?: string | null
  login_background_url?: string | null
}

// 1. Obter informações de branding publicadas do Tenant
export const getTenantBranding = async (tenantId: string): Promise<BrandSettings | null> => {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_brand_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_published', true)
      .maybeSingle()

    if (settingsError) throw settingsError
    if (!settings) return null

    const { data: assets } = await supabase
      .from('tenant_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return {
      ...settings,
      logo_url: assets?.logo_url || null,
      favicon_url: assets?.favicon_url || null,
      banner_url: assets?.banner_url || null,
      login_background_url: assets?.login_background_url || null
    }
  } catch (err) {
    console.error('Erro ao buscar branding do tenant:', err)
    return null
  }
}

// 2. Obter branding publicado pelo Slug do Tenant
export const getTenantBrandingBySlug = async (slug: string): Promise<{ tenantId: string; branding: BrandSettings } | null> => {
  try {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (tenantError) throw tenantError
    if (!tenant) return null

    const branding = await getTenantBranding(tenant.id)
    if (!branding) return null

    return {
      tenantId: tenant.id,
      branding
    }
  } catch (err) {
    console.error('Erro ao buscar branding por slug:', err)
    return null
  }
}

// 3. Obter branding (incluindo draft de rascunho) para o dono (Teacher) do Tenant
export const getTenantBrandingByOwnerId = async (
  ownerId: string
): Promise<{ tenantId: string; slug: string; branding: BrandSettings; draft: BrandSettings | null } | null> => {
  try {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('owner_user_id', ownerId)
      .maybeSingle()

    if (tenantError) throw tenantError
    if (!tenant) return null

    const branding = await getTenantBranding(tenant.id)
    
    const { data: draftData } = await supabase
      .from('tenant_brand_drafts')
      .select('draft_json')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const { data: assets } = await supabase
      .from('tenant_assets')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const draft = draftData?.draft_json ? {
      ...draftData.draft_json,
      logo_url: assets?.logo_url || null,
      favicon_url: assets?.favicon_url || null,
      banner_url: assets?.banner_url || null,
      login_background_url: assets?.login_background_url || null
    } : null

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      branding: branding || draft || {
        app_name: 'Flowike',
        primary_color: '#22c55e',
        secondary_color: '#15803d',
        accent_color: '#D4FF59',
        background_color: '#F8F9FA',
        text_color: '#1A1A1A',
        theme_mode: 'light',
        button_style: 'Rounded',
        card_style: 'Minimal',
        design_preset: 'Minimal'
      },
      draft
    }
  } catch (err) {
    console.error('Erro ao buscar branding por owner:', err)
    return null
  }
}

// 3.5 Atualizar slug do Tenant
export const updateTenantSlug = async (tenantId: string, slug: string): Promise<string> => {
  // Validação básica do slug: minúsculas, números e hifens
  const cleanSlug = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9-]/g, '-') // remove especiais
    .replace(/-+/g, '-') // remove hifens duplicados
    .replace(/^-|-$/g, '') // remove hifen nas pontas

  if (!cleanSlug) {
    throw new Error('O link da academia não pode ser vazio.')
  }
  
  // Verificar duplicidade
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', cleanSlug)
    .neq('id', tenantId)
    .maybeSingle()
    
  if (existing) {
    throw new Error('Este link de academia já está em uso por outro professor.')
  }

  const { error } = await supabase
    .from('tenants')
    .update({ slug: cleanSlug })
    .eq('id', tenantId)

  if (error) {
    throw new Error('Falha ao atualizar o link: ' + error.message)
  }

  return cleanSlug
}

// 4. Salvar Rascunho do Branding
export const saveTenantBrandDraft = async (tenantId: string, draft: BrandSettings): Promise<void> => {
  const cleanDraft = {
    app_name: draft.app_name,
    primary_color: draft.primary_color,
    secondary_color: draft.secondary_color,
    accent_color: draft.accent_color,
    background_color: draft.background_color,
    text_color: draft.text_color,
    theme_mode: draft.theme_mode,
    button_style: draft.button_style,
    card_style: draft.card_style,
    design_preset: draft.design_preset,
    login_message: draft.login_message,
    dashboard_message: draft.dashboard_message
  }

  const { error } = await supabase
    .from('tenant_brand_drafts')
    .upsert({
      tenant_id: tenantId,
      draft_json: cleanDraft
    }, { onConflict: 'tenant_id' })

  if (error) {
    throw new Error('Falha ao salvar rascunho: ' + error.message)
  }
}

// 5. Publicar Rascunho
export const publishTenantBranding = async (tenantId: string): Promise<void> => {
  const { data: draftData, error: draftError } = await supabase
    .from('tenant_brand_drafts')
    .select('draft_json')
    .eq('tenant_id', tenantId)
    .single()

  if (draftError || !draftData) {
    throw new Error('Rascunho não encontrado: ' + (draftError?.message || ''))
  }

  const draft = draftData.draft_json

  const { error: settingsError } = await supabase
    .from('tenant_brand_settings')
    .upsert({
      tenant_id: tenantId,
      app_name: draft.app_name,
      primary_color: draft.primary_color,
      secondary_color: draft.secondary_color,
      accent_color: draft.accent_color,
      background_color: draft.background_color,
      text_color: draft.text_color,
      theme_mode: draft.theme_mode,
      button_style: draft.button_style,
      card_style: draft.card_style,
      design_preset: draft.design_preset,
      login_message: draft.login_message,
      dashboard_message: draft.dashboard_message,
      is_published: true
    }, { onConflict: 'tenant_id' })

  if (settingsError) {
    throw new Error('Falha ao publicar branding: ' + settingsError.message)
  }
}

// 6. Upload de Assets
export const uploadTenantAsset = async (
  tenantId: string,
  file: File,
  assetType: 'logo' | 'favicon' | 'banner' | 'login-background'
): Promise<string> => {
  // Limitação de tamanho de arquivo (2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('O arquivo excede o limite máximo de 2MB')
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${tenantId}/${assetType}_${Date.now()}.${fileExt}`

  // Upload no storage do Supabase
  const { error: uploadError } = await supabase.storage
    .from('tenant-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    throw new Error('Erro ao fazer upload: ' + uploadError.message)
  }

  // Obter URL pública
  const { data: publicUrlData } = supabase.storage
    .from('tenant-assets')
    .getPublicUrl(filePath)

  const publicUrl = publicUrlData.publicUrl

  // Atualizar registro no banco
  const updatePayload: any = {}
  if (assetType === 'logo') updatePayload.logo_url = publicUrl
  else if (assetType === 'favicon') updatePayload.favicon_url = publicUrl
  else if (assetType === 'banner') updatePayload.banner_url = publicUrl
  else if (assetType === 'login-background') updatePayload.login_background_url = publicUrl

  const { error: dbError } = await supabase
    .from('tenant_assets')
    .update(updatePayload)
    .eq('tenant_id', tenantId)

  if (dbError) {
    throw new Error('Erro ao atualizar asset no banco: ' + dbError.message)
  }

  return publicUrl
}

// 7. Deletar Assets
export const deleteTenantAsset = async (
  tenantId: string,
  assetType: 'logo' | 'favicon' | 'banner' | 'login-background'
): Promise<void> => {
  const { data: assetData, error: fetchError } = await supabase
    .from('tenant_assets')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !assetData) {
    throw new Error('Asset não encontrado no banco')
  }

  let urlToDelete = ''
  if (assetType === 'logo') urlToDelete = assetData.logo_url
  if (assetType === 'favicon') urlToDelete = assetData.favicon_url
  if (assetType === 'banner') urlToDelete = assetData.banner_url
  if (assetType === 'login-background') urlToDelete = assetData.login_background_url

  if (urlToDelete) {
    const pathParts = urlToDelete.split('/tenant-assets/')
    if (pathParts.length > 1) {
      const filePath = pathParts[1]
      await supabase.storage.from('tenant-assets').remove([filePath])
    }
  }

  const updatePayload: any = {}
  if (assetType === 'logo') updatePayload.logo_url = null
  else if (assetType === 'favicon') updatePayload.favicon_url = null
  else if (assetType === 'banner') updatePayload.banner_url = null
  else if (assetType === 'login-background') updatePayload.login_background_url = null

  const { error: dbError } = await supabase
    .from('tenant_assets')
    .update(updatePayload)
    .eq('tenant_id', tenantId)

  if (dbError) {
    throw new Error('Erro ao remover asset no banco: ' + dbError.message)
  }
}
