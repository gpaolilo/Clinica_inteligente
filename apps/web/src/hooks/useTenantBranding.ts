import { useContext } from 'react'
import { TenantBrandingContext } from '../components/branding/TenantThemeProvider'

export const useTenantBranding = () => {
  const context = useContext(TenantBrandingContext)
  if (context === undefined) {
    throw new Error('useTenantBranding deve ser usado dentro de um TenantThemeProvider')
  }
  return context
}
