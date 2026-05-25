import React from 'react'
import { AssetUploader } from './AssetUploader'

interface IdentitySectionProps {
  tenantId: string | null
  appName: string
  logoUrl: string | null
  faviconUrl: string | null
  bannerUrl: string | null
  loginBackgroundUrl: string | null
  onChange: (fields: Partial<{
    app_name: string
    logo_url: string | null
    favicon_url: string | null
    banner_url: string | null
    login_background_url: string | null
  }>) => void
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  tenantId,
  appName,
  logoUrl,
  faviconUrl,
  bannerUrl,
  loginBackgroundUrl,
  onChange
}) => {
  const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.substring(0, 40)
    onChange({ app_name: val })
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">Identidade Básica</h3>
        <p className="text-xs text-slate-400">Configure o nome e os principais assets visuais da sua academia.</p>
      </div>

      {/* Nome do App */}
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-700">Nome da Academia / Aplicativo</label>
        <div className="relative">
          <input
            type="text"
            value={appName}
            onChange={handleAppNameChange}
            placeholder="Minha Academia de Idiomas"
            maxLength={40}
            className="w-full px-4 py-2.5 border border-slate-200 focus:border-primary-500 rounded-xl text-sm outline-none shadow-sm"
          />
          <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400">
            {appName.length}/40
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Upload de Logo */}
        <AssetUploader
          tenantId={tenantId}
          assetType="logo"
          currentUrl={logoUrl}
          label="Logotipo da Academia"
          recommendation="PNG, JPG, WEBP ou SVG (2MB máx). Recomendado fundo transparente."
          onUploadSuccess={(url) => onChange({ logo_url: url })}
          onDeleteSuccess={() => onChange({ logo_url: null })}
        />

        {/* Upload de Favicon */}
        <AssetUploader
          tenantId={tenantId}
          assetType="favicon"
          currentUrl={faviconUrl}
          label="Ícone da Aba (Favicon)"
          recommendation="PNG ou ICO de formato quadrado (512x512px recomendado). Max 2MB."
          onUploadSuccess={(url) => onChange({ favicon_url: url })}
          onDeleteSuccess={() => onChange({ favicon_url: null })}
        />

        {/* Upload de Banner do Professor */}
        <AssetUploader
          tenantId={tenantId}
          assetType="banner"
          currentUrl={bannerUrl}
          label="Imagem do Banner (Dashboard)"
          recommendation="JPG, PNG ou WEBP em formato paisagem largo (1200x400px). Max 2MB."
          onUploadSuccess={(url) => onChange({ banner_url: url })}
          onDeleteSuccess={() => onChange({ banner_url: null })}
        />

        {/* Upload de Login Background */}
        <AssetUploader
          tenantId={tenantId}
          assetType="login-background"
          currentUrl={loginBackgroundUrl}
          label="Fundo da Tela de Login"
          recommendation="Imagem de alta qualidade ou textura (1920x1080px). Deixe vazio para usar degradê padrão."
          onUploadSuccess={(url) => onChange({ login_background_url: url })}
          onDeleteSuccess={() => onChange({ login_background_url: null })}
        />
      </div>
    </div>
  )
}
