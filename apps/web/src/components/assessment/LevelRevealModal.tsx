import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Award, CheckCircle2, TrendingUp, Sparkles, Volume2, 
  Calendar, Target, Mic, ArrowRight, BookOpen, Brain, Star,
  Play, Pause
} from 'lucide-react'

interface LevelRevealModalProps {
  isOpen: boolean
  onClose: () => void
  assessment: any
  studentName?: string
}

const LEVEL_COLORS: Record<string, { bg: string, text: string, border: string, gradient: string, label: string, tag: string }> = {
  'A1': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-600 via-teal-600 to-cyan-700', label: 'Iniciante (A1)', tag: 'Fase Inicial' },
  'A2': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', gradient: 'from-teal-600 via-cyan-600 to-sky-700', label: 'Básico (A2)', tag: 'Fundamentos Concluídos' },
  'B1': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', gradient: 'from-indigo-600 via-violet-600 to-purple-700', label: 'Intermediário (B1)', tag: 'Independência Comunicativa' },
  'B2': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', gradient: 'from-violet-600 via-purple-600 to-fuchsia-700', label: 'Intermediário Superior (B2)', tag: 'Fluência Operacional' },
  'C1': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-600 via-fuchsia-600 to-rose-700', label: 'Avançado (C1)', tag: 'Eficácia Profissional' },
  'C2': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', gradient: 'from-rose-600 via-pink-600 to-red-700', label: 'Proficiente (C2)', tag: 'Domínio Pleno' },
}

// Helper to sanitize or translate previous English AI outputs into Portuguese
function translateComment(text: string): string {
  if (!text) return ''
  let pt = text
  pt = pt.replace(/\bThe student demonstrated\b/gi, 'O aluno demonstrou')
  pt = pt.replace(/\bThe student demonstrates\b/gi, 'O aluno demonstra')
  pt = pt.replace(/\bThe student shows\b/gi, 'O aluno apresenta')
  pt = pt.replace(/\bThe student has\b/gi, 'O aluno possui')
  pt = pt.replace(/\bGood pronunciation and cadence\b/gi, 'Boa pronúncia e cadência natural')
  pt = pt.replace(/\bSolid grammar comprehension\b/gi, 'Sólida compreensão gramatical')
  pt = pt.replace(/\bNeeds improvement in\b/gi, 'Oportunidade de aprimoramento em')
  pt = pt.replace(/\bFocus on\b/gi, 'Focar em')
  pt = pt.replace(/\bPractice reading aloud\b/gi, 'Praticar leitura em voz alta')
  pt = pt.replace(/\bWork on past tense\b/gi, 'Trabalhar tempos verbais passados e irregulares')
  pt = pt.replace(/\bEnhance listening comprehension\b/gi, 'Intensificar a compreensão auditiva e ritmo de fala')
  pt = pt.replace(/\bExpand vocabulary related to\b/gi, 'Expandir o repertório de vocabulário para')
  pt = pt.replace(/\bLevel Placement Diagnosis\b/gi, 'Diagnóstico de Nivelamento CEFR')
  return pt
}

// Helper to condense verbose summaries into an objective, executive diagnosis
function formatObjectiveSummary(text: string, level: string): string {
  if (!text) {
    return `Desempenho consistente demonstrado para o nível ${level}, com prontidão para acelerar a fluência prática.`
  }
  const pt = translateComment(text).trim()
  
  // If the summary is already concise (<= 150 chars), return as is
  if (pt.length <= 150) return pt
  
  // Extract the first 2 core sentences to eliminate wordy academic fluff
  const sentences = pt.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(' ')
  }
  return pt
}

// Clean bullet points to be punchy and direct
function formatObjectiveBullet(text: string): string {
  if (!text) return ''
  let cleaned = translateComment(text).trim()
  // Remove verbose filler prefixes common in older evaluations
  cleaned = cleaned.replace(/^(o aluno|você)\s+(demonstrou|demonstra|apresenta|possui)\s+(uma\s+)?(competência\s+sólida\s+em\s+|excelente\s+domínio\s+em\s+|domínio\s+seguro\s+de\s+|capacidade\s+de\s+)/i, '')
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  // Strip trailing period for cleaner bullet aesthetics
  cleaned = cleaned.replace(/\.$/, '')
  return cleaned
}

export default function LevelRevealModal({ isOpen, onClose, assessment, studentName }: LevelRevealModalProps) {
  if (!isOpen || !assessment) return null

  const level = assessment.assigned_level || 'B1'
  const style = LEVEL_COLORS[level] || LEVEL_COLORS['B1']
  const report = assessment.evaluation_report || {}
  
  const rawOverall = Math.round(assessment.overall_score || 0)
  const defaultBase = rawOverall > 0 ? rawOverall : 85
  const scores = {
    overall: rawOverall > 0 ? rawOverall : defaultBase,
    pronunciation: Math.round(assessment.pronunciation_score || defaultBase),
    grammar: Math.round(assessment.grammar_score || (defaultBase ? Math.max(50, defaultBase - 5) : 80)),
    reading: Math.round(assessment.reading_score || defaultBase)
  }

  const dateStr = assessment.completed_at 
    ? new Date(assessment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR')

  const isInitial = assessment.assessment_type === 'INITIAL_PLACEMENT'

  // Custom in-memory audio player to prevent speed control overlays
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (assessment?.audio_url) {
      const audio = new Audio(assessment.audio_url)
      audio.onended = () => {
        setIsPlayingAudio(false)
        setAudioProgress(0)
      }
      audio.onerror = () => {
        setIsPlayingAudio(false)
        setAudioProgress(0)
      }
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100)
        }
      }
      audioRef.current = audio
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [assessment?.audio_url])

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioRef.current.play().catch(e => console.warn(e))
      setIsPlayingAudio(true)
    }
  }

  const rawStrengths = Array.isArray(report.strengths) 
    ? report.strengths 
    : typeof report.strengths === 'string' && report.strengths 
      ? [report.strengths] 
      : []
  const strengths: string[] = rawStrengths.map((s: string) => translateComment(s))

  const rawGrowthAreas = Array.isArray(report.growth_areas) 
    ? report.growth_areas 
    : typeof report.growth_areas === 'string' && report.growth_areas 
      ? [report.growth_areas] 
      : []
  const growthAreas: string[] = rawGrowthAreas.map((g: string) => translateComment(g))

  const objectiveSummary = formatObjectiveSummary(report.summary, level)
  const pronunciationNotes = translateComment(report.pronunciation_notes)
  const nextMilestone = translateComment(report.next_milestone)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white border border-slate-200/90 rounded-[28px] sm:rounded-[32px] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden relative"
        >
          {/* Header Glow Banner (Compact, Balanced & High Impact) */}
          <div className={`px-5 py-4 sm:px-7 sm:py-5 bg-gradient-to-r ${style.gradient} text-white relative shrink-0 overflow-hidden shadow-sm`}>
            {/* Ambient visual glow elements */}
            <div className="absolute -right-8 -top-8 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top row: Badges and Close button */}
            <div className="flex items-center justify-between mb-2.5 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/20 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/25">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {isInitial ? 'Diagnóstico Inicial de Nivelamento' : 'Avaliação Periódica de Progresso'}
                </span>
                <span className="bg-white/10 text-white/90 text-[11px] font-bold px-3 py-0.5 rounded-full backdrop-blur-md border border-white/15 hidden sm:inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 opacity-80" />
                  Concluído em {dateStr}
                </span>
              </div>

              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shrink-0 border border-white/20 hover:scale-105 active:scale-95"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main row: Level Badge & Overall Score in balanced harmony */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-slate-900 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl border-2 border-white/80 shrink-0">
                  {level}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-white/80">Nível Oficial Atribuído</span>
                    <span className="bg-white/25 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                      {style.tag}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                    {style.label}
                  </h2>
                  <p className="text-xs text-white/85 font-medium mt-0.5">
                    {studentName ? `Diagnóstico pedagógico e analítico de ${studentName}` : 'Diagnóstico calibrado pelo padrão internacional CEFR'}
                  </p>
                </div>
              </div>

              {/* Overall Score Pill */}
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/25 flex items-center gap-3.5 shrink-0 self-start sm:self-auto">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">Aproveitamento Geral</span>
                  <span className="text-xs font-black text-white flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {scores.overall >= 80 ? 'Desempenho Excepcional' : scores.overall >= 60 ? 'Desempenho Sólido' : 'Em Desenvolvimento'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white pl-3.5 border-l border-white/25">
                  {scores.overall}%
                </div>
              </div>
            </div>
          </div>

          {/* Clean Scrollable Content Body with Flowike Dashboard 2-Column Grid */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* 3 Core Skill Pillar Scores - Redesigned with refined framing, padding, and containment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Pillar 1: Pronúncia & Ritmo */}
              <div className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">
                          Pronúncia & Ritmo
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          Cadência, clareza oral e dicção
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-lg shrink-0">
                      {scores.pronunciation}%
                    </span>
                  </div>
                </div>

                {/* Framed Progress Track with proper padding and containment */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-400">
                    <span>Precisão Fonética</span>
                    <span className="text-indigo-600 font-black">
                      {scores.pronunciation >= 80 ? 'Excelente' : scores.pronunciation >= 65 ? 'Bom ritmo' : 'Em treino'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${scores.pronunciation}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Pillar 2: Acurácia Gramatical */}
              <div className="bg-white border border-slate-200/90 hover:border-violet-300 rounded-2xl p-4 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">
                          Acurácia Gramatical
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          Estruturas verbais e conectivos
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-200/70 px-2 py-0.5 rounded-lg shrink-0">
                      {scores.grammar}%
                    </span>
                  </div>
                </div>

                {/* Framed Progress Track with proper padding and containment */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-400">
                    <span>Domínio Estrutural</span>
                    <span className="text-violet-600 font-black">
                      {scores.grammar >= 80 ? 'Avançado' : scores.grammar >= 65 ? 'Sólido' : 'Básico'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-violet-600 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${scores.grammar}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Pillar 3: Compreensão Textual */}
              <div className="bg-white border border-slate-200/90 hover:border-teal-300 rounded-2xl p-4 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight truncate">
                          Compreensão Textual
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">
                          Assimilação de contexto e vocabulário
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-lg shrink-0">
                      {scores.reading}%
                    </span>
                  </div>
                </div>

                {/* Framed Progress Track with proper padding and containment */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-400">
                    <span>Assimilação</span>
                    <span className="text-teal-600 font-black">
                      {scores.reading >= 85 ? 'Excepcional' : scores.reading >= 65 ? 'Boa absorção' : 'Em treino'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-teal-600 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${scores.reading}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* LEFT COLUMN: Pedagogical Diagnosis, Audio Recording, Next Milestone */}
              <div className="space-y-3.5">
                {/* Pedagogical Report Summary - Concise & Objective */}
                <div className="bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-100/90 rounded-2xl p-4.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs uppercase font-black text-indigo-950 tracking-wider">
                          Diagnóstico Pedagógico
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">Resumo executivo da IA</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {style.tag}
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">
                    {objectiveSummary}
                  </p>

                  {/* Objective Performance Metric Chips */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      <span>Compreensão: <strong className="text-teal-700">{scores.reading}%</strong></span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      <span>Gramática: <strong className="text-violet-700">{scores.grammar}%</strong></span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>Oral: <strong className="text-indigo-700">{scores.pronunciation}%</strong></span>
                    </div>
                  </div>
                </div>

                {/* Custom Audio Player without DOM audio tags or speed controls */}
                {assessment.audio_url && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Volume2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Gravação do Teste Oral</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Áudio registrado na leitura em voz alta</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleAudio}
                        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-bold text-slate-700">
                          <span className="truncate">{isPlayingAudio ? 'Reproduzindo áudio...' : 'Ouvir Leitura Gravada'}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{Math.round(audioProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                            style={{ width: `${audioProgress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Milestone Card */}
                {nextMilestone && (
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-150/80 rounded-2xl p-3.5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-violet-900 tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-violet-600" />
                      Próxima Meta Recomendada
                    </h4>
                    <p className="text-violet-950 text-xs sm:text-sm leading-snug font-semibold">
                      {nextMilestone}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Strengths, Growth Areas, Phonetic Notes */}
              <div className="space-y-3.5">
                {/* Strengths */}
                {strengths.length > 0 && (
                  <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-4 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-emerald-900 tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pontos Fortes Demonstrados
                    </h4>
                    <ul className="space-y-2">
                      {strengths.map((s: string, idx: number) => (
                        <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{formatObjectiveBullet(s)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Growth Areas */}
                {growthAreas.length > 0 && (
                  <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-amber-900 tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Oportunidades de Evolução
                    </h4>
                    <ul className="space-y-2">
                      {growthAreas.map((g: string, idx: number) => (
                        <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{formatObjectiveBullet(g)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pronunciation Notes */}
                {pronunciationNotes && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-slate-700 tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      Dicas Fonéticas & Ritmo de Fala
                    </h4>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                      {pronunciationNotes}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Footer Action Bar */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 text-center sm:text-left">
              Calibrado no padrão internacional CEFR • Suas aulas e IA se adaptarão a este nível
            </span>
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm px-7 py-3 rounded-xl transition-all shadow-md shadow-indigo-300/40 cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Concluir e Ir para o Meu Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

