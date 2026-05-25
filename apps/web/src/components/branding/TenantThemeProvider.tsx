import React, { createContext, useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getTenantBrandingBySlug, getTenantBrandingByOwnerId, BrandSettings } from '../../lib/brandingService'

interface TenantBrandingContextType {
  tenantId: string | null
  appName: string
  logoUrl: string | null
  faviconUrl: string | null
  bannerUrl: string | null
  loginBackgroundUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  themeMode: 'light' | 'dark' | 'system'
  buttonStyle: 'Rounded' | 'Pill' | 'Sharp' | 'Soft'
  cardStyle: 'Minimal' | 'Elevated' | 'Glass' | 'Bordered'
  loginMessage: string
  dashboardMessage: string
  designPreset: string
  loading: boolean
  error: string | null
  refreshBranding: () => Promise<void>
}

const defaultBrandSettings: BrandSettings = {
  app_name: 'Clinica.ia',
  primary_color: '#22c55e',
  secondary_color: '#15803d',
  accent_color: '#D4FF59',
  background_color: '#F8F9FA',
  text_color: '#1A1A1A',
  theme_mode: 'light',
  button_style: 'Rounded',
  card_style: 'Minimal',
  design_preset: 'Minimal',
  login_message: 'Bem-vindo ao Portal de Ensino',
  dashboard_message: 'Pronto para a aula de hoje?'
}

export const TenantBrandingContext = createContext<TenantBrandingContextType | undefined>(undefined)

// Função auxiliar para escurecer cores hex
export function darkenColor(hex: string, percent: number): string {
  try {
    const cleanHex = hex.replace('#', '')
    let num = parseInt(cleanHex, 16)
    if (isNaN(num)) return hex
    
    let amt = Math.round(2.55 * percent)
    let R = (num >> 16) - amt
    let G = ((num >> 8) & 0x00ff) - amt
    let B = (num & 0x0000ff) - amt

    R = Math.max(0, Math.min(255, R))
    G = Math.max(0, Math.min(255, G))
    B = Math.max(0, Math.min(255, B))

    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  } catch {
    return hex
  }
}

export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuthStore()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [branding, setBranding] = useState<BrandSettings>(defaultBrandSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyThemeToDOM = (settings: BrandSettings) => {
    try {
      const root = document.documentElement
      
      // Aplicar cores
      root.style.setProperty('--tenant-primary', settings.primary_color)
      root.style.setProperty('--tenant-primary-hover', darkenColor(settings.primary_color, 10))
      root.style.setProperty('--tenant-secondary', settings.secondary_color)
      root.style.setProperty('--tenant-accent', settings.accent_color)
      root.style.setProperty('--tenant-background', settings.background_color)
      
      const isDark = settings.theme_mode === 'dark' || 
        (settings.theme_mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      root.style.setProperty('--tenant-surface', isDark ? '#1e293b' : '#ffffff')
      root.style.setProperty('--tenant-text', settings.text_color)
      root.style.setProperty('--tenant-border', isDark ? '#334155' : '#e2e8f0')

      // Aplicar border-radius para botões
      let btnRadius = '12px'
      if (settings.button_style === 'Pill') btnRadius = '9999px'
      else if (settings.button_style === 'Sharp') btnRadius = '0px'
      else if (settings.button_style === 'Soft') btnRadius = '16px'
      root.style.setProperty('--tenant-button-radius', btnRadius)

      // Aplicar border-radius para cards
      let cardRadius = '24px'
      if (settings.card_style === 'Minimal') cardRadius = '16px'
      else if (settings.card_style === 'Elevated') cardRadius = '24px'
      else if (settings.card_style === 'Glass') cardRadius = '24px'
      else if (settings.card_style === 'Bordered') cardRadius = '12px'
      root.style.setProperty('--tenant-card-radius', cardRadius)

      // Atualizar Favicon
      if (settings.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = settings.favicon_url
      }
      
      // Atualizar título da página se houver App Name customizado
      if (settings.app_name) {
        document.title = settings.app_name
      }
    } catch (err) {
      console.error('Falha ao aplicar tema no DOM:', err)
    }
  }

  const resolveAndLoadBranding = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Verificar se há slug do Tenant na URL ou rota (ex: /academy/sarahenglish/login ou ?tenant=sarahenglish)
      let tenantSlug = searchParams.get('tenant')
      
      if (!tenantSlug) {
        const pathParts = location.pathname.split('/')
        const academyIndex = pathParts.indexOf('academy')
        if (academyIndex !== -1 && pathParts[academyIndex + 1]) {
          tenantSlug = pathParts[academyIndex + 1]
        }
      }

      if (tenantSlug) {
        const result = await getTenantBrandingBySlug(tenantSlug)
        if (result) {
          setTenantId(result.tenantId)
          setBranding(result.branding)
          applyThemeToDOM(result.branding)
          setLoading(false)
          return
        }
      }

      // 2. Se o usuário estiver logado, resolve com base na sua role
      if (user) {
        if (role === 'TEACHER' || role === 'PSYCHOLOGIST') {
          // Professor/Psicólogo: obter por owner_user_id
          const result = await getTenantBrandingByOwnerId(user.id)
          if (result) {
            setTenantId(result.tenantId)
            // Priorizar rascunho de rascunhos para o professor ver em tempo real no estúdio
            const activeBranding = result.draft || result.branding
            setBranding(activeBranding)
            applyThemeToDOM(activeBranding)
            setLoading(false)
            return
          }
        } else if (role === 'STUDENT' || role === 'PATIENT') {
          // Aluno/Paciente: primeiro obter o psychologist_id atrelado ao registro do aluno
          const { data: patient } = await supabase
            .from('patients')
            .select('psychologist_id')
            .eq('user_id', user.id)
            .maybeSingle()

          if (patient?.psychologist_id) {
            const result = await getTenantBrandingByOwnerId(patient.psychologist_id)
            if (result) {
              setTenantId(result.tenantId)
              setBranding(result.branding)
              applyThemeToDOM(result.branding)
              setLoading(false)
              return
            }
          }
        }
      }

      // 3. Fallback se não encontrar nada (Plataforma Clinica.ia padrão)
      setBranding(defaultBrandSettings)
      applyThemeToDOM(defaultBrandSettings)
    } catch (err: any) {
      console.error('Erro na resolução de branding:', err)
      setError(err.message || 'Erro desconhecido')
      setBranding(defaultBrandSettings)
      applyThemeToDOM(defaultBrandSettings)
    } finally {
      setLoading(false)
    }
  }

  // Executar ao carregar ou quando o usuário/rota mudar
  useEffect(() => {
    resolveAndLoadBranding()
  }, [user, role, location.pathname, searchParams])

  const contextValue: TenantBrandingContextType = {
    tenantId,
    appName: branding.app_name,
    logoUrl: branding.logo_url || null,
    faviconUrl: branding.favicon_url || null,
    bannerUrl: branding.banner_url || null,
    loginBackgroundUrl: branding.login_background_url || null,
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
    accentColor: branding.accent_color,
    backgroundColor: branding.background_color,
    textColor: branding.text_color,
    themeMode: branding.theme_mode,
    buttonStyle: branding.button_style,
    cardStyle: branding.card_style,
    loginMessage: branding.login_message || 'Bem-vindo ao Portal de Ensino',
    dashboardMessage: branding.dashboard_message || 'Pronto para a aula de hoje?',
    designPreset: branding.design_preset,
    loading,
    error,
    refreshBranding: resolveAndLoadBranding
  }

  return (
    <TenantBrandingContext.Provider value={contextValue}>
      {children}
    </TenantBrandingContext.Provider>
  )
}
