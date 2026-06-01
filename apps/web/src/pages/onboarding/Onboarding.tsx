import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useTenantBranding } from '../../hooks/useTenantBranding'
import { supabase } from '../../lib/supabase'
import { uploadTenantAsset, BrandSettings } from '../../lib/brandingService'
import { brandingPresets } from '../../components/branding/DesignPresetSelector'
import { BrandingPreviewPanel } from '../../components/branding/BrandingPreviewPanel'
import { 
  Check, GraduationCap, Tag, FileText, ArrowRight, 
  Upload, Rocket, Compass, Heart, Award, Loader2,
  CreditCard
} from 'lucide-react'

type OnboardingStep = 
  | 'welcome' 
  | 'identity' 
  | 'personality' 
  | 'preset' 
  | 'colors' 
  | 'logo' 
  | 'preview' 
  | 'launch'
  | 'connect_payments'

const STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  'identity',
  'personality',
  'preset',
  'colors',
  'logo',
  'preview',
  'launch',
  'connect_payments'
]

const STEPS_META = [
  { id: 'welcome', label: 'Início' },
  { id: 'identity', label: 'Nome' },
  { id: 'personality', label: 'Estilo' },
  { id: 'preset', label: 'Preset' },
  { id: 'colors', label: 'Cores' },
  { id: 'logo', label: 'Logos' },
  { id: 'preview', label: 'Preview' },
  { id: 'launch', label: 'Lançar' },
  { id: 'connect_payments', label: 'Pagamentos' }
]

const TEACHING_PERSONALITIES = [
  { value: 'Friendly & Casual', label: 'Amigável & Casual', description: 'Mais próximo e informal, ideal para tutoria e línguas.', color: '#ec4899', preset: 'Modern' },
  { value: 'Professional & Structured', label: 'Profissional & Estruturado', description: 'Foco corporativo, seriedade e cronogramas claros.', color: '#1e3a8a', preset: 'Corporate' },
  { value: 'Modern & Dynamic', label: 'Moderno & Dinâmico', description: 'Ágil, focado em tecnologia e metodologias ativas.', color: '#8b5cf6', preset: 'Modern' },
  { value: 'Motivational & Energetic', label: 'Motivador & Enérgico', description: 'Foco em superação de limites e alta energia.', color: '#f59e0b', preset: 'Playful' },
  { value: 'Luxury & Premium', label: 'Luxo & Premium', description: 'Visual requintado, alta exclusividade e preço premium.', color: '#d97706', preset: 'Luxury' },
  { value: 'Academic & Serious', label: 'Acadêmico & Sério', description: 'Cursos formais, certificações e rigor metodológico.', color: '#22c55e', preset: 'Education' }
]

export default function Onboarding() {
  const { user } = useAuthStore()
  const { tenantId, refreshBranding } = useTenantBranding()

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = STEPS_ORDER[currentStepIndex]

  // Onboarding states mapping to academy_profiles
  const [academyName, setAcademyName] = useState('')
  const [academyTagline, setAcademyTagline] = useState('')
  const [academyDescription, setAcademyDescription] = useState('')
  const [teachingStyle, setTeachingStyle] = useState('')
  const [designPreset, setDesignPreset] = useState('Minimal')
  
  // Branding settings matching BrandSettings
  const [settings, setSettings] = useState<BrandSettings>({
    app_name: 'Minha Academia',
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    accent_color: '#D4FF59',
    background_color: '#F8F9FA',
    text_color: '#1A1A1A',
    theme_mode: 'light',
    button_style: 'Rounded',
    card_style: 'Minimal',
    design_preset: 'Minimal'
  })

  // Logo / Favicon Upload
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconUploading, setFaviconUploading] = useState(false)

  const [publishing, setPublishing] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)

  // Sync academyName to settings.app_name
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      app_name: academyName || 'Minha Academia'
    }))
  }, [academyName])

  // Load existing onboarding draft if it exists
  useEffect(() => {
    const loadExistingDraft = async () => {
      if (!user) return
      const { data: profile } = await supabase
        .from('academy_profiles')
        .select('*')
        .eq('teacher_id', user.id)
        .maybeSingle()

      if (profile) {
        setAcademyName(profile.academy_name)
        setAcademyTagline(profile.academy_tagline || '')
        setAcademyDescription(profile.academy_description || '')
        setTeachingStyle(profile.teaching_style || '')
        setDesignPreset(profile.design_preset || 'Minimal')
        setLogoPreview(profile.logo_url)
        setFaviconPreview(profile.favicon_url)
        
        setSettings(prev => ({
          ...prev,
          primary_color: profile.primary_color,
          secondary_color: profile.secondary_color,
          accent_color: profile.accent_color,
          card_style: profile.card_style || 'Minimal',
          design_preset: profile.design_preset || 'Minimal',
          logo_url: profile.logo_url,
          favicon_url: profile.favicon_url
        }))

        // Load progress if any
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('step')
          .eq('teacher_id', user.id)
          .maybeSingle()

        if (progress?.step) {
          const stepIndex = Math.min(progress.step - 1, STEPS_ORDER.length - 1)
          setCurrentStepIndex(stepIndex)
        }
      }
    }
    loadExistingDraft()
  }, [user])

  const saveProgress = async (nextIdx: number) => {
    if (!user) return
    
    // Save state temporarily in the database
    const { error: profileError } = await supabase.from('academy_profiles').upsert({
      teacher_id: user.id,
      academy_name: academyName || 'Minha Academia',
      academy_tagline: academyTagline || null,
      academy_description: academyDescription || null,
      teaching_style: teachingStyle || null,
      design_preset: designPreset,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      accent_color: settings.accent_color,
      logo_url: logoPreview,
      favicon_url: faviconPreview,
      is_published: false
    }, { onConflict: 'teacher_id' })

    if (profileError) {
      console.error('Error saving academy profile:', profileError)
      alert('Erro ao salvar rascunho do perfil: ' + profileError.message)
      return
    }

    const { error: progressError } = await supabase.from('onboarding_progress').upsert({
      teacher_id: user.id,
      step: nextIdx + 1,
      completed: false
    }, { onConflict: 'teacher_id' })

    if (progressError) {
      console.error('Error saving onboarding progress:', progressError)
      alert('Erro ao salvar progresso: ' + progressError.message)
      return
    }

    setCurrentStepIndex(nextIdx)
  }

  const handleNext = () => {
    if (currentStep === 'identity' && !academyName) {
      alert('Nome da academia é obrigatório.')
      return
    }
    if (currentStep === 'personality' && !teachingStyle) {
      alert('Selecione uma personalidade de ensino.')
      return
    }
    
    if (currentStepIndex < STEPS_ORDER.length - 1) {
      saveProgress(currentStepIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handlePersonalitySelect = (personality: typeof TEACHING_PERSONALITIES[0]) => {
    setTeachingStyle(personality.value)
    
    // Auto preset recommendation
    const recommendedPreset = brandingPresets[personality.preset]
    if (recommendedPreset) {
      setDesignPreset(recommendedPreset.name)
      setSettings(prev => ({
        ...prev,
        design_preset: recommendedPreset.name,
        primary_color: recommendedPreset.primary_color,
        secondary_color: recommendedPreset.secondary_color,
        accent_color: recommendedPreset.accent_color,
        button_style: recommendedPreset.button_style,
        card_style: recommendedPreset.card_style,
        theme_mode: recommendedPreset.theme_mode
      }))
    }
  }

  const handleSelectPreset = (presetName: string) => {
    const preset = brandingPresets[presetName]
    if (!preset) return
    setDesignPreset(presetName)
    setSettings(prev => ({
      ...prev,
      design_preset: presetName,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      button_style: preset.button_style,
      card_style: preset.card_style,
      theme_mode: preset.theme_mode
    }))
  }

  const handleColorChange = (key: 'primary_color' | 'secondary_color' | 'accent_color', value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (event) => {
      if (type === 'logo') setLogoPreview(event.target?.result as string)
      else setFaviconPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    if (!tenantId) return
    
    if (type === 'logo') {
      setLogoUploading(true)
    } else {
      setFaviconUploading(true)
    }

    try {
      const url = await uploadTenantAsset(tenantId, file, type)
      if (type === 'logo') {
        setLogoPreview(url)
        setSettings(prev => ({ ...prev, logo_url: url }))
      } else {
        setFaviconPreview(url)
        setSettings(prev => ({ ...prev, favicon_url: url }))
      }
    } catch (err: any) {
      alert('Erro no upload: ' + err.message)
    } finally {
      setLogoUploading(false)
      setFaviconUploading(false)
    }
  }

  const handleLaunch = async () => {
    if (!user || !tenantId) return
    setPublishing(true)

    try {
      // 1. Salvar perfil como publicado
      const { error: profileError } = await supabase.from('academy_profiles').upsert({
        teacher_id: user.id,
        academy_name: academyName,
        academy_tagline: academyTagline || null,
        academy_description: academyDescription || null,
        teaching_style: teachingStyle,
        design_preset: designPreset,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        logo_url: logoPreview,
        favicon_url: faviconPreview,
        is_published: true
      }, { onConflict: 'teacher_id' })

      if (profileError) {
        throw new Error('Erro ao salvar perfil: ' + profileError.message)
      }

      // 2. Marcar progresso concluído na etapa 8
      const { error: progressError } = await supabase.from('onboarding_progress').upsert({
        teacher_id: user.id,
        step: 8,
        completed: false
      }, { onConflict: 'teacher_id' })

      if (progressError) {
        throw new Error('Erro ao salvar progresso de onboarding: ' + progressError.message)
      }

      // 3. Atualizar context global de branding
      await refreshBranding()
      setPublishing(false)
      setCurrentStepIndex(8)
    } catch (err: any) {
      alert('Erro ao publicar academia: ' + err.message)
      setPublishing(false)
    }
  }

  const handleStripeConnect = async () => {
    setConnectingStripe(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          if (data.isMock) {
            alert('Simulando Stripe Express Onboarding...')
          }
          window.location.href = data.url
        } else {
          alert('Erro ao obter link de onboarding do Stripe.')
        }
      } else {
        const err = await res.json()
        alert('Erro: ' + (err.error || 'Erro desconhecido'))
      }
    } catch (err: any) {
      alert('Erro ao conectar ao Stripe: ' + err.message)
    } finally {
      setConnectingStripe(false)
    }
  }

  const handleSkipPayments = async () => {
    if (!user) return
    try {
      await supabase.from('onboarding_progress').upsert({
        teacher_id: user.id,
        step: 9,
        completed: true
      }, { onConflict: 'teacher_id' })
      
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error(err)
      window.location.href = '/dashboard'
    }
  }

  // Pre-configured color combinations for easy selection
  const colorSuggestions = [
    { label: 'Royal Gold', primary: '#d97706', secondary: '#111827', accent: '#fbbf24' },
    { label: 'Cyber Lime', primary: '#10b981', secondary: '#06b6d4', accent: '#d4ff59' },
    { label: 'Vibrant Lavender', primary: '#8b5cf6', secondary: '#ec4899', accent: '#10b981' },
    { label: 'Forest Mint', primary: '#22c55e', secondary: '#15803d', accent: '#d4ff59' },
    { label: 'Classic Blue', primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' }
  ]

  // Steps indicator progress percentage
  const progressPercent = ((currentStepIndex + 1) / STEPS_ORDER.length) * 100

  // Check if current step splits the layout (showing live preview)
  const isSplitLayout = ['preset', 'colors', 'logo', 'preview'].includes(currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#F5F3FF] text-slate-800 flex flex-col font-sans select-none overflow-x-hidden relative">
      {/* Background dotted grid pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Onboarding Header / Progress */}
      <header className="bg-white/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/Flowike_icon.png" alt="Flowike" className="w-9 h-9 object-contain" />
          <img src="/Flowike_logo_name_only.png" alt="Flowike Logo Name" className="h-5.5 object-contain" />
          <span className="bg-indigo-50 text-indigo-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-100/60 ml-1">Onboarding</span>
        </div>

        {/* Desktop Stepper */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          {STEPS_META.map((step, idx) => {
            const isCompleted = idx < currentStepIndex
            const isActive = idx === currentStepIndex
            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`h-0.5 w-4 lg:w-8 transition-colors duration-300 ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' 
                      : isCompleted 
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                        : 'bg-slate-100 text-slate-450 border border-slate-200'
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                    isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Mobile progress fallback */}
        <div className="md:hidden flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-slate-450">
            Passo {currentStepIndex + 1} de {STEPS_ORDER.length}
          </span>
          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden shrink-0">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">
          {/* Form Side */}
          <div className={`h-full overflow-y-auto p-6 sm:p-10 flex items-center justify-center transition-all ${
            isSplitLayout ? 'lg:col-span-7 border-r border-slate-200' : 'lg:col-span-12'
          }`}>
            <div className={`w-full max-w-xl mx-auto space-y-6 ${!isSplitLayout ? 'max-w-2xl' : ''}`}>
              <AnimatePresence mode="wait">
                {currentStep === 'welcome' && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col items-center text-center max-w-md mx-auto space-y-6"
                  >
                    <div className="inline-flex bg-indigo-50 text-indigo-600 w-16 h-16 rounded-[24px] items-center justify-center border border-indigo-100 shadow-md">
                      <Rocket className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome to Flowike 👋</h1>
                      <p className="text-slate-500 text-sm font-semibold">Let's build your AI-powered academy.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-[24px] text-left w-full relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl" />
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        O que faremos juntos:
                      </h4>
                      <ul className="space-y-2.5 text-xs text-slate-600 font-semibold">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600 shrink-0" /> Definir a personalidade da academia</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600 shrink-0" /> Configurar tema de cores personalizado</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600 shrink-0" /> Fazer upload de logos e assets</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600 shrink-0" /> Visualizar e testar antes de lançar</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-4 px-8 rounded-2xl text-xs transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <span>Iniciar Configuração</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {currentStep === 'identity' && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Qual o nome da sua Academia?</h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-semibold">Escreva os detalhes básicos da sua plataforma.</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          Nome da Academia
                        </label>
                        <input
                          type="text"
                          placeholder="Sarah AI English Academy"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-semibold placeholder-slate-400"
                          value={academyName}
                          onChange={(e) => setAcademyName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-slate-400" />
                          Slogan Curto / Tagline
                        </label>
                        <input
                          type="text"
                          placeholder="Business English para profissionais modernos"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-semibold placeholder-slate-400"
                          value={academyTagline}
                          onChange={(e) => setAcademyTagline(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-400" />
                          Breve Descrição
                        </label>
                        <textarea
                          placeholder="Foco em conversação prática, acelerando o desenvolvimento corporativo..."
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-semibold placeholder-slate-400 h-24 resize-none"
                          value={academyDescription}
                          onChange={(e) => setAcademyDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Avançar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'personality' && (
                  <motion.div
                    key="personality"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Qual sua personalidade de ensino?</h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-semibold">Isso influenciará a sugestão de paletas, tom do chat de IA e estilo visual.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                      {TEACHING_PERSONALITIES.map((p) => {
                        const isSelected = teachingStyle === p.value
                        return (
                          <button
                            type="button"
                            key={p.value}
                            onClick={() => handlePersonalitySelect(p)}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 relative overflow-hidden group ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/10' 
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-125" style={{ backgroundColor: p.color }} />
                            
                            <div className="flex justify-between items-start w-full">
                              <span className="text-xs font-bold text-slate-800">{p.label}</span>
                              <Heart className="w-3.5 h-3.5" style={{ color: p.color }} />
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-2 pr-2">{p.description}</p>
                            
                            {isSelected && (
                              <span className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Recomendar Tema</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'preset' && (
                  <motion.div
                    key="preset"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estilo Visual Base</h2>
                      <p className="text-slate-550 text-xs mt-1.5 font-semibold">Escolha um preset recomendado. Você poderá customizar as cores e estilos em seguida.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {Object.values(brandingPresets).map((p) => {
                        const isSelected = designPreset === p.name
                        return (
                          <button
                            type="button"
                            key={p.name}
                            onClick={() => handleSelectPreset(p.name)}
                            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-20 group ${
                              isSelected 
                                ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/10' 
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div>
                              <span className="text-[11px] font-extrabold text-slate-700">{p.label}</span>
                              <div className="flex gap-1 mt-1.5">
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200/50 inline-block shadow-sm" style={{ backgroundColor: p.primary_color }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200/50 inline-block shadow-sm" style={{ backgroundColor: p.accent_color }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200/50 inline-block shadow-sm animate-pulse" style={{ backgroundColor: p.background_color }} />
                              </div>
                            </div>

                            {isSelected && (
                              <span className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Avançar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'colors' && (
                  <motion.div
                    key="colors"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Defina a Paleta da Academia</h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-semibold">Altere as cores principais para refletir a sua marca. Veja o resultado em tempo real no painel à direita.</p>
                    </div>

                    {/* Sugestões Rápidas */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Combinações Sugeridas</span>
                      <div className="flex gap-2 flex-wrap">
                        {colorSuggestions.map((combo) => (
                          <button
                            type="button"
                            key={combo.label}
                            onClick={() => {
                              setSettings(prev => ({
                                ...prev,
                                primary_color: combo.primary,
                                secondary_color: combo.secondary,
                                accent_color: combo.accent
                              }))
                            }}
                            className="bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold text-slate-600 shadow-sm"
                          >
                            <span className="flex gap-0.5">
                              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-200" style={{ backgroundColor: combo.primary }} />
                              <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-200" style={{ backgroundColor: combo.accent }} />
                            </span>
                            {combo.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor Primária</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.primary_color}
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 uppercase text-center"
                            value={settings.primary_color}
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor Secundária</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.secondary_color}
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 uppercase text-center"
                            value={settings.secondary_color}
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor de Destaque</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.accent_color}
                            onChange={(e) => handleColorChange('accent_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-800 uppercase text-center"
                            value={settings.accent_color}
                            onChange={(e) => handleColorChange('accent_color', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Avançar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'logo' && (
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identidade & Logos</h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-semibold">Faça upload da logomarca e ícone da sua academia. Suporta PNG, SVG e WEBP de até 2MB.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Logo Upload */}
                      <div className="border border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative min-h-[160px] overflow-hidden">
                        {logoUploading ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-400">Enviando Logo...</span>
                          </div>
                        ) : logoPreview ? (
                          <div className="flex flex-col items-center gap-2.5">
                            <img src={logoPreview} alt="Logo Preview" className="max-h-12 object-contain" />
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Logo Ativo</span>
                            <label className="text-[10px] font-bold text-indigo-600 cursor-pointer hover:underline mt-1">
                              Alterar Logo
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logo')} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <Upload className="w-6 h-6 text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-700">Upload Logomarca</span>
                            <span className="text-[9px] text-slate-400 mt-1 font-semibold">Recomendado: Fundo transparente</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logo')} />
                          </label>
                        )}
                      </div>

                      {/* Favicon Upload */}
                      <div className="border border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative min-h-[160px] overflow-hidden">
                        {faviconUploading ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-[10px] font-bold text-slate-400">Enviando Favicon...</span>
                          </div>
                        ) : faviconPreview ? (
                          <div className="flex flex-col items-center gap-2.5">
                            <img src={faviconPreview} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Favicon Ativo</span>
                            <label className="text-[10px] font-bold text-indigo-600 cursor-pointer hover:underline mt-1">
                              Alterar Favicon
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'favicon')} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <Upload className="w-6 h-6 text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-700">Upload Favicon / Ícone</span>
                            <span className="text-[9px] text-slate-400 mt-1 font-semibold">Proporção 1:1 quadrada</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'favicon')} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Avançar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'preview' && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col space-y-6 w-full text-slate-800"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Veja sua Criação! 😍</h2>
                      <p className="text-slate-550 text-xs mt-1.5 font-semibold">Use os controls do painel ao lado para testar a responsividade e visualizar o Login, Dashboard e a Página de Agendamento.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                        <Award className="w-4 h-4 text-indigo-600 animate-bounce" />
                        Seu Portal White-label:
                      </h4>
                      <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                        Toda a experiência de aprendizagem dos seus alunos já está personalizada com as suas cores. Ao clicar em lançar, os temas serão publicados imediatamente.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                        <span>Revisão Final</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'launch' && (
                  <motion.div
                    key="launch"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-12 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col items-center text-center space-y-6 w-full text-slate-800"
                  >
                    <div className="relative mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                        className="absolute inset-0 bg-indigo-600/10 rounded-full scale-110 blur-xl pointer-events-none"
                      />
                      <div className="bg-indigo-50 text-indigo-600 w-20 h-20 rounded-[28px] flex items-center justify-center relative z-10 border border-indigo-150">
                        <Rocket className="w-10 h-10 animate-bounce" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sua academia está pronta! 🚀</h2>
                      <p className="text-slate-550 text-xs mt-1.5 font-semibold max-w-sm">Branding configurado com sucesso e pronto para deploy.</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl w-full max-w-md text-left space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Nome da Academia</span>
                        <span className="text-slate-800 font-extrabold">{academyName}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Preset de Estilo</span>
                        <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">{designPreset}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Paleta de Cores</span>
                        <span className="flex gap-1">
                          <span className="w-3.5 h-3.5 rounded-full inline-block border border-slate-200" style={{ backgroundColor: settings.primary_color }} />
                          <span className="w-3.5 h-3.5 rounded-full inline-block border border-slate-200" style={{ backgroundColor: settings.accent_color }} />
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full max-w-md pt-4 border-t border-slate-100">
                      <button 
                        onClick={handlePrev} 
                        disabled={publishing}
                        className="px-5 py-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all shrink-0"
                      >
                        Ajustar Detalhes
                      </button>
                      
                      <button
                        onClick={handleLaunch}
                        disabled={publishing}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-4 rounded-xl text-xs transition-all shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:scale-95"
                      >
                        {publishing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Publicando Academia...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4" />
                            <span>Lançar Minha Academia</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 'connect_payments' && (
                  <motion.div
                    key="connect_payments"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-10 rounded-[32px] shadow-2xl shadow-slate-100/50 flex flex-col items-center text-center space-y-6 w-full text-slate-800"
                  >
                    <div className="inline-flex bg-emerald-50 text-emerald-600 w-16 h-16 rounded-[24px] items-center justify-center border border-emerald-100 shadow-md">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">Conectar Recebimentos 💳</h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-semibold max-w-sm font-sans">
                        Conecte sua conta Stripe Express para cobrar seus alunos por aulas, pacotes de aulas e planos recorrentes.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl w-full max-w-md text-left space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Benefícios do Stripe Connect:
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-600 font-semibold">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Recebimentos automatizados direto na sua conta bancária</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Divisão de taxas automatizada via Stripe Connect</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Aceite Cartões de Crédito, Apple/Google Pay e PIX (Brasil)</li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-md pt-4 border-t border-slate-100">
                      <button
                        onClick={handleStripeConnect}
                        disabled={connectingStripe}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-xs transition-all shadow-xl shadow-emerald-650/10 flex items-center justify-center gap-1.5 hover:-translate-y-0.5"
                      >
                        {connectingStripe ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Redirecionando para o Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Conectar Conta Stripe</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={handleSkipPayments} 
                        disabled={connectingStripe}
                        className="w-full px-5 py-4 border border-slate-205 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all"
                      >
                        Pular e Ir para o Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Live Preview Side (Visible in split layouts) */}
          {isSplitLayout && (
            <div className="hidden lg:col-span-5 lg:flex bg-[#F8FAFC] border-l border-slate-200 p-8 items-center justify-center overflow-hidden relative">
              {/* Dotted Grid Pattern */}
              <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="w-full max-w-md shrink-0 z-10">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Live Preview Simulador</div>
                <BrandingPreviewPanel settings={settings} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
