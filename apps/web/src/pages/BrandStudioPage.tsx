import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getTenantBrandingByOwnerId, saveTenantBrandDraft, BrandSettings, updateTenantSlug } from '../lib/brandingService'
import { brandingPresets } from '../components/branding/DesignPresetSelector'
import { IdentitySection } from '../components/branding/IdentitySection'
import { ColorSection } from '../components/branding/ColorSection'
import { AppearanceSection } from '../components/branding/AppearanceSection'
import { MessagesSection } from '../components/branding/MessagesSection'
import { BrandingPreviewPanel } from '../components/branding/BrandingPreviewPanel'
import { PublishBrandingModal } from '../components/branding/PublishBrandingModal'
import { useTenantBranding } from '../hooks/useTenantBranding'
import { Paintbrush, Check, Save, Sparkles, Loader2 } from 'lucide-react'

type SectionTab = 'identity' | 'colors' | 'appearance' | 'messages'

export default function BrandStudioPage() {
  const { user } = useAuthStore()
  const { refreshBranding } = useTenantBranding()
  
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>('')
  const [draftSettings, setDraftSettings] = useState<BrandSettings>({
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
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SectionTab>('identity')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Carregar dados de branding do banco
  const fetchBrandingData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await getTenantBrandingByOwnerId(user.id)
      if (result) {
        setTenantId(result.tenantId)
        setSlug(result.slug)
        // Carrega rascunho de draft se houver, senão as configurações atuais
        setDraftSettings(result.draft || result.branding)
      }
    } catch (err) {
      console.error('Erro ao buscar dados do Brand Studio:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSlug = async (newSlug: string) => {
    if (!tenantId) return
    const updated = await updateTenantSlug(tenantId, newSlug)
    setSlug(updated)
    await refreshBranding()
  }

  useEffect(() => {
    fetchBrandingData()
  }, [user])

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const handleFieldChange = (fields: Partial<BrandSettings>) => {
    setDraftSettings((prev) => ({
      ...prev,
      ...fields
    }))
  }

  const handleSelectPreset = (presetName: string) => {
    const preset = brandingPresets[presetName]
    if (!preset) return
    handleFieldChange({
      design_preset: presetName,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      background_color: preset.background_color,
      text_color: preset.text_color,
      theme_mode: preset.theme_mode,
      button_style: preset.button_style,
      card_style: preset.card_style
    })
    showNotification('success', `Tema "${preset.label}" selecionado!`)
  }

  const handleSaveDraft = async () => {
    if (!tenantId) return
    setSaving(true)
    try {
      await saveTenantBrandDraft(tenantId, draftSettings)
      showNotification('success', 'Rascunho salvo com sucesso!')
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao salvar rascunho')
    } finally {
      setSaving(false)
    }
  }

  const handlePublishConfirm = async () => {
    if (!tenantId) return
    setPublishing(true)
    setIsPublishModalOpen(false)
    try {
      // 1. Salvar rascunho atual antes de publicar
      await saveTenantBrandDraft(tenantId, draftSettings)
      // 2. Publicar rascunho
      const { publishTenantBranding } = await import('../lib/brandingService')
      await publishTenantBranding(tenantId)
      
      // 3. Atualizar context de branding ativo
      await refreshBranding()
      
      showNotification('success', 'Branding publicado com sucesso para todos os alunos!')
    } catch (err: any) {
      showNotification('error', err.message || 'Erro ao publicar configurações')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        <span className="text-sm font-semibold text-slate-500">Carregando Estúdio de Marca...</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notificação Toast */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white transition-all duration-300 animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <Check className="w-4 h-4" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header do Estúdio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] border border-slate-200/50 shadow-sm shrink-0">
        <div>
          <div className="flex items-center gap-2 text-primary-600">
            <Paintbrush className="w-5 h-5" />
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estúdio de Marca</h2>
          </div>
          <p className="text-slate-500 mt-1 text-xs font-medium">Personalize a identidade visual e crie uma experiência própria de ensino.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Botão Salvar Rascunho */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Rascunho
          </button>

          {/* Botão Publicar */}
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={saving || publishing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Publicar Marca
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulário - Esquerda */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] border border-slate-200/60 shadow-sm space-y-6 flex flex-col min-h-[550px]">
          {/* Tabs Menu */}
          <div className="flex border-b border-slate-100 pb-3 gap-1 overflow-x-auto no-scrollbar shrink-0">
            {(['identity', 'colors', 'appearance', 'messages'] as const).map((tab) => {
              const tabLabels = {
                identity: 'Identidade',
                colors: 'Cores',
                appearance: 'Aparência',
                messages: 'Mensagens'
              }
              const isActive = activeTab === tab
              
              return (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    isActive 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              )
            })}
          </div>

          {/* Formulários Correspondentes */}
          <div className="flex-1">
            {activeTab === 'identity' && (
              <IdentitySection
                tenantId={tenantId}
                appName={draftSettings.app_name}
                logoUrl={draftSettings.logo_url || null}
                faviconUrl={draftSettings.favicon_url || null}
                bannerUrl={draftSettings.banner_url || null}
                loginBackgroundUrl={draftSettings.login_background_url || null}
                slug={slug}
                onChange={handleFieldChange}
                onUpdateSlug={handleUpdateSlug}
              />
            )}

            {activeTab === 'colors' && (
              <ColorSection
                primaryColor={draftSettings.primary_color}
                secondaryColor={draftSettings.secondary_color}
                accentColor={draftSettings.accent_color}
                backgroundColor={draftSettings.background_color}
                textColor={draftSettings.text_color}
                onChange={handleFieldChange}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSection
                designPreset={draftSettings.design_preset}
                themeMode={draftSettings.theme_mode}
                buttonStyle={draftSettings.button_style}
                cardStyle={draftSettings.card_style}
                onChange={handleFieldChange}
                onSelectPreset={handleSelectPreset}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesSection
                loginMessage={draftSettings.login_message || ''}
                dashboardMessage={draftSettings.dashboard_message || ''}
                onChange={handleFieldChange}
              />
            )}
          </div>
        </div>

        {/* Live Preview Panel - Direita */}
        <div className="lg:col-span-5">
          <BrandingPreviewPanel settings={draftSettings} />
        </div>
      </div>

      {/* Confirmação de Publicação */}
      <PublishBrandingModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        publishing={publishing}
      />
    </div>
  )
}
