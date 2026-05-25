import React, { useState, useEffect } from 'react'
import { AssetUploader } from './AssetUploader'
import { Link2, Sparkles } from 'lucide-react'

interface IdentitySectionProps {
  tenantId: string | null
  appName: string
  logoUrl: string | null
  faviconUrl: string | null
  bannerUrl: string | null
  loginBackgroundUrl: string | null
  slug: string
  onChange: (fields: Partial<{
    app_name: string
    logo_url: string | null
    favicon_url: string | null
    banner_url: string | null
    login_background_url: string | null
  }>) => void
  onUpdateSlug: (newSlug: string) => Promise<void>
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  tenantId,
  appName,
  logoUrl,
  faviconUrl,
  bannerUrl,
  loginBackgroundUrl,
  slug,
  onChange,
  onUpdateSlug
}) => {
  const [currentSlug, setCurrentSlug] = useState(slug)
  const [savingSlug, setSavingSlug] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugSuccess, setSlugSuccess] = useState<string | null>(null)

  useEffect(() => {
    setCurrentSlug(slug)
  }, [slug])

  const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.substring(0, 40)
    onChange({ app_name: val })
  }

  const handleSuggestSlug = () => {
    const suggested = appName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, '') // remove especiais
      .trim()
      .replace(/\s+/g, '-') // substitui espaço por hifen
      .replace(/-+/g, '-')
    setCurrentSlug(suggested)
    setSlugError(null)
    setSlugSuccess(null)
  }

  const handleSaveSlug = async () => {
    setSavingSlug(true)
    setSlugError(null)
    setSlugSuccess(null)
    try {
      await onUpdateSlug(currentSlug)
      setSlugSuccess('Link da academia atualizado com sucesso!')
    } catch (err: any) {
      setSlugError(err.message || 'Erro ao atualizar link.')
    } finally {
      setSavingSlug(false)
    }
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

      {/* Link de Acesso da Academia */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-primary-500" /> Link de Acesso dos Alunos
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Seus alunos acessarão seu portal de ensino personalizado por esta URL.</p>
          </div>
          <button
            type="button"
            onClick={handleSuggestSlug}
            className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-white border border-slate-200 py-1 px-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Gerar do Nome
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center min-w-0">
            <span className="text-xs font-bold text-slate-400 select-none bg-slate-100 px-3 py-3.5 rounded-l-xl border border-slate-200 border-r-0 truncate max-w-[200px] sm:max-w-none">
              {window.location.origin}/academy/
            </span>
            <input
              type="text"
              value={currentSlug}
              onChange={(e) => setCurrentSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="nome-da-academia"
              className="flex-1 min-w-0 px-4 py-2.5 border border-slate-200 focus:border-primary-500 rounded-r-xl text-sm outline-none shadow-sm font-bold text-slate-700 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveSlug}
            disabled={savingSlug || currentSlug === slug || !currentSlug}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center min-h-[42px]"
          >
            {savingSlug ? 'Salvando...' : 'Salvar Link'}
          </button>
        </div>
        
        {slugError && (
          <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full inline-block"></span>
            {slugError}
          </p>
        )}
        {slugSuccess && (
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block"></span>
            {slugSuccess}
          </p>
        )}
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
