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
  app_name: 'Flowike',
  primary_color: '#6366f1',
  secondary_color: '#4f46e5',
  accent_color: '#D4FF59',
  background_color: '#F8F9FA',
  text_color: '#1A1A1A',
  theme_mode: 'light',
  button_style: 'Rounded',
  card_style: 'Minimal',
  design_preset: 'Minimal',
  login_message: 'Teaching. Organized. Effortless.',
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

// Helper to determine the best text color (black or white) for readability on a given background
export function getContrastColor(hex: string): string {
  try {
    const cleanHex = hex.replace('#', '')
    let r = 0, g = 0, b = 0
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex.substring(0, 1).repeat(2), 16)
      g = parseInt(cleanHex.substring(1, 2).repeat(2), 16)
      b = parseInt(cleanHex.substring(2, 3).repeat(2), 16)
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16)
      g = parseInt(cleanHex.substring(2, 4), 16)
      b = parseInt(cleanHex.substring(4, 6), 16)
    } else {
      return '#FFFFFF'
    }
    const yiq = (r * 299 + g * 587 + b * 114) / 1000
    return yiq >= 180 ? '#1A1A1A' : '#FFFFFF'
  } catch {
    return '#FFFFFF'
  }
}

// Function to lighten hex colors by a percentage
export function lightenColor(hex: string, percent: number): string {
  try {
    const cleanHex = hex.replace('#', '')
    let num = parseInt(cleanHex, 16)
    if (isNaN(num)) return hex
    
    let amt = Math.round(2.55 * percent)
    let R = (num >> 16) + amt
    let G = ((num >> 8) & 0x00ff) + amt
    let B = (num & 0x0000ff) + amt

    R = Math.max(0, Math.min(255, R))
    G = Math.max(0, Math.min(255, G))
    B = Math.max(0, Math.min(255, B))

    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  } catch {
    return hex
  }
}

// Convert a hex color code to a comma-separated RGB string
export function hexToRgb(hex: string): string {
  try {
    const cleanHex = hex.replace('#', '')
    let r = 0, g = 0, b = 0
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex.substring(0, 1).repeat(2), 16)
      g = parseInt(cleanHex.substring(1, 2).repeat(2), 16)
      b = parseInt(cleanHex.substring(2, 3).repeat(2), 16)
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16)
      g = parseInt(cleanHex.substring(2, 4), 16)
      b = parseInt(cleanHex.substring(4, 6), 16)
    } else {
      return '255, 255, 255'
    }
    return `${r}, ${g}, ${b}`
  } catch {
    return '255, 255, 255'
  }
}

export const TenantThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuthStore()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  const [tenantId, setTenantId] = useState<string | null>(() => {
    return localStorage.getItem('current-tenant-id')
  })
  const [branding, setBranding] = useState<BrandSettings>(() => {
    try {
      const cached = localStorage.getItem('current-tenant-branding')
      if (cached) {
        return JSON.parse(cached)
      }
    } catch {}
    return defaultBrandSettings
  })
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('current-tenant-branding')
  })
  const [error, setError] = useState<string | null>(null)

  // Synchronously apply cached styles on render to avoid default green theme flashes
  useEffect(() => {
    try {
      const cached = localStorage.getItem('current-tenant-branding')
      if (cached) {
        applyThemeToDOM(JSON.parse(cached))
      } else {
        applyThemeToDOM(defaultBrandSettings)
      }
    } catch {}
  }, [])

  // Invalidate cache and reset to default styles if user logs out and there is no URL slug
  useEffect(() => {
    if (!user) {
      let tenantSlug = searchParams.get('tenant')
      if (!tenantSlug) {
        const pathParts = location.pathname.split('/')
        const academyIndex = pathParts.indexOf('academy')
        if (academyIndex !== -1 && pathParts[academyIndex + 1]) {
          tenantSlug = pathParts[academyIndex + 1]
        }
      }
      
      if (!tenantSlug) {
        localStorage.removeItem('current-tenant-branding')
        localStorage.removeItem('current-tenant-id')
        setBranding(defaultBrandSettings)
        applyThemeToDOM(defaultBrandSettings)
      }
    }
  }, [user, location.pathname, searchParams])

  const applyThemeToDOM = (settings: BrandSettings) => {
    try {
      const root = document.documentElement
      
      // Aplicar cores
      root.style.setProperty('--tenant-primary', settings.primary_color)
      root.style.setProperty('--tenant-primary-hover', darkenColor(settings.primary_color, 10))
      root.style.setProperty('--tenant-primary-dark', darkenColor(settings.primary_color, 20))
      root.style.setProperty('--tenant-primary-50', settings.primary_color + '1a') // 10% opacity
      root.style.setProperty('--tenant-primary-100', settings.primary_color + '33') // 20% opacity
      root.style.setProperty('--tenant-primary-contrast', getContrastColor(settings.primary_color))
      root.style.setProperty('--tenant-secondary', settings.secondary_color)
      root.style.setProperty('--tenant-accent', settings.accent_color)
      root.style.setProperty('--tenant-background', settings.background_color)
      
      const isDark = settings.theme_mode === 'dark' || 
        (settings.theme_mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      const surfaceColor = isDark ? lightenColor(settings.background_color, 8) : '#ffffff'
      const borderColor = isDark ? lightenColor(settings.background_color, 16) : '#e2e8f0'
      
      root.style.setProperty('--tenant-surface', surfaceColor)
      root.style.setProperty('--tenant-text', settings.text_color)
      root.style.setProperty('--tenant-border', borderColor)

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

      // Compute card styles based on settings.card_style
      let cardShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      let cardBorderColor = isDark ? borderColor : '#e2e8f0'
      let cardBorderWidth = '1px'
      let cardBg = isDark ? surfaceColor : '#ffffff'
      let cardBackdropBlur = '0px'

      if (settings.card_style === 'Minimal') {
        cardShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        cardBorderWidth = '1px'
      } else if (settings.card_style === 'Elevated') {
        cardShadow = isDark 
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
        cardBorderWidth = '0px'
      } else if (settings.card_style === 'Glass') {
        cardShadow = isDark 
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' 
          : '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
        cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)'
        cardBorderWidth = '1px'
        cardBg = isDark ? `rgba(${hexToRgb(surfaceColor)}, 0.75)` : 'rgba(255, 255, 255, 0.65)'
        cardBackdropBlur = '16px'
      } else if (settings.card_style === 'Bordered') {
        cardShadow = 'none'
        cardBorderColor = settings.primary_color
        cardBorderWidth = '2px'
      }

      root.style.setProperty('--tenant-card-shadow', cardShadow)
      root.style.setProperty('--tenant-card-border-color', cardBorderColor)
      root.style.setProperty('--tenant-card-border-width', cardBorderWidth)
      root.style.setProperty('--tenant-card-bg', cardBg)
      root.style.setProperty('--tenant-card-backdrop-blur', cardBackdropBlur)

      // Set global DOM attributes representing the branding identity and style selectors
      root.setAttribute('data-tenant-preset', settings.design_preset || 'Minimal')
      root.setAttribute('data-tenant-card-style', settings.card_style || 'Minimal')
      root.setAttribute('data-tenant-button-style', settings.button_style || 'Rounded')

      // Aplicar estilo de ícones
      let iconStroke = '2px'
      if (settings.design_preset === 'Minimal') iconStroke = '1.5px'
      else if (settings.design_preset === 'Luxury') iconStroke = '1.3px'
      else if (settings.design_preset === 'Modern') iconStroke = '1.7px'
      else if (settings.design_preset === 'Playful') iconStroke = '2.5px'
      else if (settings.design_preset === 'Corporate') iconStroke = '2.0px'
      else if (settings.design_preset === 'Dark') iconStroke = '1.7px'
      else if (settings.design_preset === 'Education') iconStroke = '2.0px'
      root.style.setProperty('--tenant-icon-stroke', iconStroke)

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
    const hasCache = !!localStorage.getItem('current-tenant-branding')
    if (!hasCache) {
      setLoading(true)
    }
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
          localStorage.setItem('current-tenant-branding', JSON.stringify(result.branding))
          localStorage.setItem('current-tenant-id', result.tenantId || '')
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
            localStorage.setItem('current-tenant-branding', JSON.stringify(activeBranding))
            localStorage.setItem('current-tenant-id', result.tenantId || '')
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
              localStorage.setItem('current-tenant-branding', JSON.stringify(result.branding))
              localStorage.setItem('current-tenant-id', result.tenantId || '')
              setLoading(false)
              return
            }
          }
        }
      }

      // 3. Fallback se não encontrar nada (Plataforma Flowike padrão)
      setBranding(defaultBrandSettings)
      applyThemeToDOM(defaultBrandSettings)
      localStorage.removeItem('current-tenant-branding')
      localStorage.removeItem('current-tenant-id')
    } catch (err: any) {
      console.error('Erro na resolução de branding:', err)
      setError(err.message || 'Erro desconhecido')
      setBranding(defaultBrandSettings)
      applyThemeToDOM(defaultBrandSettings)
      localStorage.removeItem('current-tenant-branding')
      localStorage.removeItem('current-tenant-id')
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
