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

  const summaryText = translateComment(report.summary) || 
    `Avaliação diagnóstica concluída com sucesso. Seu desempenho reflete sólida assimilação e prontidão para acelerar seu aprendizado no nível ${level}.`
  const pronunciationNotes = translateComment(report.pronunciation_notes)
  const nextMilestone = translateComment(report.next_milestone)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white border border-slate-200/90 rounded-[28px] sm:rounded-[36px] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden relative"
        >
          {/* Header Glow Banner (Compact, Spacious & High Impact) */}
          <div className={`px-6 py-5 sm:px-8 sm:py-6 bg-gradient-to-r ${style.gradient} text-white relative shrink-0 overflow-hidden shadow-sm`}>
            {/* Ambient visual glow elements */}
            <div className="absolute -right-8 -top-8 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top row: Badges and Close button */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/20 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 border border-white/25">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {isInitial ? 'Diagnóstico Inicial de Nivelamento' : 'Avaliação Periódica de Progresso'}
                </span>
                <span className="bg-white/10 text-white/90 text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md border border-white/15 hidden sm:inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 opacity-80" />
                  Concluído em {dateStr}
                </span>
              </div>

              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shrink-0 border border-white/20 hover:scale-105 active:scale-95"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main row: Level Badge & Overall Score in balanced harmony */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white text-slate-900 font-black text-3xl sm:text-4xl flex items-center justify-center shadow-xl border-2 border-white/80 shrink-0">
                  {level}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-white/80">Nível Oficial Atribuído</span>
                    <span className="bg-white/25 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                      {style.tag}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight mt-0.5">
                    {style.label}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5">
                    {studentName ? `Diagnóstico pedagógico e analítico de ${studentName}` : 'Diagnóstico calibrado pelo padrão internacional CEFR'}
                  </p>
                </div>
              </div>

              {/* Overall Score Pill */}
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/25 flex items-center gap-4 shrink-0 self-start sm:self-auto">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">Aproveitamento Geral</span>
                  <span className="text-xs font-black text-white flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {scores.overall >= 80 ? 'Desempenho Excepcional' : scores.overall >= 60 ? 'Desempenho Sólido' : 'Em Desenvolvimento'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white pl-4 border-l border-white/25">
                  {scores.overall}%
                </div>
              </div>
            </div>
          </div>

          {/* Clean Scrollable Content Body with Flowike Dashboard 2-Column Grid */}
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
            
            {/* 3 Core Skill Pillar Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Pillar 1: Pronúncia & Ritmo */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4.5 hover:shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-600" />
                    Pronúncia & Ritmo
                  </span>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                    {scores.pronunciation}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mb-2">Cadência, clareza oral e dicção</div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${scores.pronunciation}%` }} 
                  />
                </div>
              </div>

              {/* Pillar 2: Acurácia Gramatical */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4.5 hover:shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-600" />
                    Acurácia Gramatical
                  </span>
                  <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg">
                    {scores.grammar}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mb-2">Estruturas verbais e conectivos</div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-violet-600 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${scores.grammar}%` }} 
                  />
                </div>
              </div>

              {/* Pillar 3: Compreensão Textual */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4.5 hover:shadow-xs transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    Compreensão Textual
                  </span>
                  <span className="text-xs font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg">
                    {scores.reading}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mb-2">Assimilação de contexto e vocabulário</div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-teal-600 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${scores.reading}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Dashboard 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
              
              {/* LEFT COLUMN: Pedagogical Diagnosis, Audio Recording, Next Milestone */}
              <div className="space-y-4">
                {/* Pedagogical Report Summary */}
                <div className="bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-100/90 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs uppercase font-black text-indigo-950 tracking-wider">
                        Diagnóstico Pedagógico do Aluno
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold">Parecer emitido pela Inteligência Artificial</span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-medium">
                    {summaryText}
                  </p>
                </div>

                {/* Custom Audio Player without DOM audio tags or speed controls */}
                {assessment.audio_url && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">Gravação do Teste Oral</h4>
                          <p className="text-[10px] text-slate-500 font-medium">Áudio gravado durante a leitura em voz alta</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleAudio}
                        className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-bold text-slate-700">
                          <span>{isPlayingAudio ? 'Reproduzindo áudio do aluno...' : 'Ouvir Leitura Gravada'}</span>
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
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4.5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-violet-900 tracking-wider mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-violet-600" />
                      Próxima Meta Recomendada
                    </h4>
                    <p className="text-violet-950 text-xs sm:text-sm leading-relaxed font-semibold">
                      {nextMilestone}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Strengths, Growth Areas, Phonetic Notes */}
              <div className="space-y-4">
                {/* Strengths */}
                {strengths.length > 0 && (
                  <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-emerald-900 tracking-wider mb-2.5 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Pontos Fortes Demonstrados
                    </h4>
                    <ul className="space-y-2">
                      {strengths.map((s: string, idx: number) => (
                        <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Growth Areas */}
                {growthAreas.length > 0 && (
                  <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-amber-900 tracking-wider mb-2.5 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Oportunidades de Evolução
                    </h4>
                    <ul className="space-y-2">
                      {growthAreas.map((g: string, idx: number) => (
                        <li key={idx} className="text-xs sm:text-sm text-slate-700 flex items-start gap-2.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pronunciation Notes */}
                {pronunciationNotes && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 shadow-xs">
                    <h4 className="text-xs uppercase font-black text-slate-700 tracking-wider mb-2 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-600" />
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
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 text-center sm:text-left">
              Calibrado no padrão internacional CEFR • Suas aulas e IA se adaptarão a este nível
            </span>
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-300/40 cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
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
