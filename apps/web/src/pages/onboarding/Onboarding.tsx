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
  Upload, Rocket, Compass, Heart, Award, Loader2 
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

const STEPS_ORDER: OnboardingStep[] = [
  'welcome',
  'identity',
  'personality',
  'preset',
  'colors',
  'logo',
  'preview',
  'launch'
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
    await supabase.from('academy_profiles').upsert({
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

    await supabase.from('onboarding_progress').upsert({
      teacher_id: user.id,
      step: nextIdx + 1,
      completed: false
    }, { onConflict: 'teacher_id' })

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
      await supabase.from('academy_profiles').upsert({
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

      // 2. Marcar progresso concluído
      await supabase.from('onboarding_progress').upsert({
        teacher_id: user.id,
        step: 8,
        completed: true
      }, { onConflict: 'teacher_id' })

      // 3. Atualizar context global de branding
      await refreshBranding()

      // Redireciona com reload para forçar aplicação total do CSS customizado
      window.location.href = '/dashboard'
    } catch (err: any) {
      alert('Erro ao publicar academia: ' + err.message)
      setPublishing(false)
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Onboarding Header / Progress */}
      <header className="bg-slate-900/40 border-b border-slate-900 px-6 py-4 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-lime-400 text-slate-950 w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm">F</div>
          <span className="font-extrabold text-sm tracking-tight text-white">Flowike <span className="text-lime-400">Onboarding</span></span>
        </div>
        <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
          <div className="bg-lime-400 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">
          {/* Form Side */}
          <div className={`h-full overflow-y-auto p-6 sm:p-10 flex items-center justify-center transition-all ${
            isSplitLayout ? 'lg:col-span-7 border-r border-slate-900' : 'lg:col-span-12'
          }`}>
            <div className={`w-full max-w-xl mx-auto space-y-6 ${!isSplitLayout ? 'max-w-2xl' : ''}`}>
              <AnimatePresence mode="wait">
                {currentStep === 'welcome' && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6 text-center"
                  >
                    <div className="inline-flex bg-lime-400/10 text-lime-400 w-16 h-16 rounded-[24px] items-center justify-center border border-lime-400/20 shadow-lg">
                      <Rocket className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">Welcome to Flowike 👋</h1>
                      <p className="text-slate-400 text-sm font-semibold sm:text-base">Let's build your AI-powered academy.</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-[24px] text-left max-w-md mx-auto relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-lime-400/5 rounded-full blur-2xl" />
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-lime-400" />
                        O que faremos juntos:
                      </h4>
                      <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-lime-400 shrink-0" /> Definir a personalidade da academia</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-lime-400 shrink-0" /> Configurar tema de cores personalizado</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-lime-400 shrink-0" /> Fazer upload de logos e assets</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-lime-400 shrink-0" /> Visualizar e testar antes de lançar</li>
                      </ul>
                    </div>

                    <button
                      onClick={handleNext}
                      className="bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-4 px-8 rounded-2xl text-xs transition-all shadow-lg shadow-lime-400/10 inline-flex items-center gap-2 hover:-translate-y-0.5"
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Qual o nome da sua Academia?</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Escreva os detalhes básicos da sua plataforma.</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-slate-500" />
                          Nome da Academia
                        </label>
                        <input
                          type="text"
                          placeholder="Sarah AI English Academy"
                          className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/25 transition-all text-sm font-semibold placeholder-slate-650"
                          value={academyName}
                          onChange={(e) => setAcademyName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-slate-500" />
                          Slogan Curto / Tagline
                        </label>
                        <input
                          type="text"
                          placeholder="Business English para profissionais modernos"
                          className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/25 transition-all text-sm font-semibold placeholder-slate-650"
                          value={academyTagline}
                          onChange={(e) => setAcademyTagline(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2 px-1 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-slate-500" />
                          Breve Descrição
                        </label>
                        <textarea
                          placeholder="Foco em conversação prática, acelerando o desenvolvimento corporativo..."
                          className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/25 transition-all text-sm font-semibold placeholder-slate-650 h-24 resize-none"
                          value={academyDescription}
                          onChange={(e) => setAcademyDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Qual sua personalidade de ensino?</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Isso influenciará a sugestão de paletas, tom do chat de IA e estilo visual.</p>
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
                                ? 'border-lime-400 bg-lime-400/5 ring-1 ring-lime-400/25' 
                                : 'border-slate-850 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/60'
                            }`}
                          >
                            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-125" style={{ backgroundColor: p.color }} />
                            
                            <div className="flex justify-between items-start w-full">
                              <span className="text-xs font-bold text-white">{p.label}</span>
                              <Heart className="w-3.5 h-3.5" style={{ color: p.color }} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2 pr-2">{p.description}</p>
                            
                            {isSelected && (
                              <span className="absolute top-2 right-2 bg-lime-400 text-slate-950 rounded-full p-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Estilo Visual Base</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Escolha um preset recomendado. Você poderá customizar as cores e estilos em seguida.</p>
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
                                ? 'border-lime-400 bg-lime-400/5 ring-1 ring-lime-400/20' 
                                : 'border-slate-850 hover:border-slate-800 hover:bg-slate-900/40'
                            }`}
                          >
                            <div>
                              <span className="text-[11px] font-bold text-slate-200">{p.label}</span>
                              <div className="flex gap-1 mt-1.5">
                                <span className="w-3.5 h-3.5 rounded-full border border-white/5 inline-block" style={{ backgroundColor: p.primary_color }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-white/5 inline-block" style={{ backgroundColor: p.accent_color }} />
                                <span className="w-3.5 h-3.5 rounded-full border border-white/5 inline-block animate-pulse" style={{ backgroundColor: p.background_color }} />
                              </div>
                            </div>

                            {isSelected && (
                              <span className="absolute top-2 right-2 bg-lime-400 text-slate-950 rounded-full p-0.5">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Defina a Paleta da Academia</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Altere as cores principais para refletir a sua marca. Veja o resultado em tempo real no painel à direita.</p>
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
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-850 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold text-slate-300"
                          >
                            <span className="flex gap-0.5">
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: combo.primary }} />
                              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: combo.accent }} />
                            </span>
                            {combo.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Pickers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-900 pt-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor Primária</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.primary_color}
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-white uppercase text-center"
                            value={settings.primary_color}
                            onChange={(e) => handleColorChange('primary_color', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor Secundária</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.secondary_color}
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-white uppercase text-center"
                            value={settings.secondary_color}
                            onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor de Destaque</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
                          <input
                            type="color"
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                            value={settings.accent_color}
                            onChange={(e) => handleColorChange('accent_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-white uppercase text-center"
                            value={settings.accent_color}
                            onChange={(e) => handleColorChange('accent_color', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Identidade & Logos</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Faça upload da logomarca e ícone da sua academia. Suporta PNG, SVG e WEBP de até 2MB.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Logo Upload */}
                      <div className="border border-dashed border-slate-850 hover:border-slate-750 bg-slate-900/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative min-h-[160px] overflow-hidden">
                        {logoUploading ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
                            <span className="text-[10px] font-bold text-slate-400">Enviando Logo...</span>
                          </div>
                        ) : logoPreview ? (
                          <div className="flex flex-col items-center gap-2.5">
                            <img src={logoPreview} alt="Logo Preview" className="max-h-12 object-contain" />
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded">Logo Ativo</span>
                            <label className="text-[10px] font-bold text-lime-400 cursor-pointer hover:underline mt-1">
                              Alterar Logo
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logo')} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <Upload className="w-6 h-6 text-slate-500 mb-2" />
                            <span className="text-xs font-bold text-white">Upload Logomarca</span>
                            <span className="text-[9px] text-slate-550 mt-1 font-semibold">Recomendado: Fundo transparente</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'logo')} />
                          </label>
                        )}
                      </div>

                      {/* Favicon Upload */}
                      <div className="border border-dashed border-slate-850 hover:border-slate-750 bg-slate-900/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative min-h-[160px] overflow-hidden">
                        {faviconUploading ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
                            <span className="text-[10px] font-bold text-slate-400">Enviando Favicon...</span>
                          </div>
                        ) : faviconPreview ? (
                          <div className="flex flex-col items-center gap-2.5">
                            <img src={faviconPreview} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded">Favicon Ativo</span>
                            <label className="text-[10px] font-bold text-lime-400 cursor-pointer hover:underline mt-1">
                              Alterar Favicon
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'favicon')} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                            <Upload className="w-6 h-6 text-slate-500 mb-2" />
                            <span className="text-xs font-bold text-white">Upload Favicon / Ícone</span>
                            <span className="text-[9px] text-slate-550 mt-1 font-semibold">Proporção 1:1 quadrada</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'favicon')} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight">Veja sua Criação! 😍</h2>
                      <p className="text-slate-400 text-xs mt-1.5 font-semibold">Use os controles do painel ao lado para testar a responsividade e visualizar o Login, Dashboard e a Página de Agendamento.</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850 p-5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                        <Award className="w-4 h-4 text-lime-400" />
                        Seu Portal White-label:
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        Toda a experiência de aprendizagem dos seus alunos já está personalizada com as suas cores. Ao clicar em lançar, os temas serão publicados imediatamente.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-900">
                      <button onClick={handlePrev} className="px-5 py-3.5 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0">Voltar</button>
                      <button onClick={handleNext} className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5">
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
                    className="space-y-6 text-center py-6 flex flex-col items-center"
                  >
                    <div className="relative mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                        className="absolute inset-0 bg-lime-400/20 rounded-full scale-110 blur-xl pointer-events-none"
                      />
                      <div className="bg-lime-400 text-slate-950 w-20 h-20 rounded-[28px] flex items-center justify-center relative z-10 border border-lime-400/40">
                        <Rocket className="w-10 h-10 animate-bounce" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-white tracking-tight">Sua academia está pronta! 🚀</h2>
                      <p className="text-slate-400 text-sm font-semibold max-w-sm">Branding configurado com sucesso e pronto para deploy.</p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl w-full max-w-md text-left space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Nome da Academia</span>
                        <span className="text-white font-extrabold">{academyName}</span>
                      </div>
                      <div className="h-[1px] bg-slate-850" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Preset de Estilo</span>
                        <span className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">{designPreset}</span>
                      </div>
                      <div className="h-[1px] bg-slate-850" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Paleta de Cores</span>
                        <span className="flex gap-1">
                          <span className="w-3.5 h-3.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: settings.primary_color }} />
                          <span className="w-3.5 h-3.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: settings.accent_color }} />
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full max-w-md pt-4 border-t border-slate-900">
                      <button 
                        onClick={handlePrev} 
                        disabled={publishing}
                        className="px-5 py-4 border border-slate-850 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition-all shrink-0"
                      >
                        Ajustar Detalhes
                      </button>
                      
                      <button
                        onClick={handleLaunch}
                        disabled={publishing}
                        className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-950 font-black py-4 rounded-xl text-xs transition-all shadow-xl shadow-lime-400/10 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:scale-95"
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
              </AnimatePresence>
            </div>
          </div>

          {/* Live Preview Side (Visible in split layouts) */}
          {isSplitLayout && (
            <div className="hidden lg:col-span-5 lg:flex bg-slate-950 p-8 items-center justify-center overflow-hidden">
              <div className="w-full max-w-md shrink-0">
                <div className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-3 text-center">Live Preview Simulador</div>
                <BrandingPreviewPanel settings={settings} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
