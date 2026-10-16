import { motion, AnimatePresence } from 'framer-motion'
import { X, Award, CheckCircle2, TrendingUp, Sparkles, Volume2, Calendar, Target } from 'lucide-react'

interface LevelRevealModalProps {
  isOpen: boolean
  onClose: () => void
  assessment: any
  studentName?: string
}

const LEVEL_COLORS: Record<string, { bg: string, text: string, border: string, gradient: string, label: string }> = {
  'A1': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600', label: 'Iniciante (Beginner)' },
  'A2': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', gradient: 'from-teal-500 to-cyan-600', label: 'Básico (Elementary)' },
  'B1': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', gradient: 'from-indigo-600 to-violet-600', label: 'Intermediário (Intermediate)' },
  'B2': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', gradient: 'from-violet-600 to-purple-600', label: 'Intermediário Superior (Upper Intermediate)' },
  'C1': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-600 to-fuchsia-600', label: 'Avançado (Advanced)' },
  'C2': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', gradient: 'from-rose-600 to-pink-600', label: 'Proficiente (Proficient / Mastery)' },
}

export default function LevelRevealModal({ isOpen, onClose, assessment, studentName }: LevelRevealModalProps) {
  if (!isOpen || !assessment) return null

  const level = assessment.assigned_level || 'B1'
  const style = LEVEL_COLORS[level] || LEVEL_COLORS['B1']
  const report = assessment.evaluation_report || {}
  const scores = {
    overall: Math.round(assessment.overall_score || 0),
    pronunciation: Math.round(assessment.pronunciation_score || 0),
    grammar: Math.round(assessment.grammar_score || 0),
    reading: Math.round(assessment.reading_score || 0)
  }

  const dateStr = assessment.completed_at 
    ? new Date(assessment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR')

  const isInitial = assessment.assessment_type === 'INITIAL_PLACEMENT'

  const strengths: string[] = Array.isArray(report.strengths) 
    ? report.strengths 
    : typeof report.strengths === 'string' && report.strengths 
      ? [report.strengths] 
      : []

  const growthAreas: string[] = Array.isArray(report.growth_areas) 
    ? report.growth_areas 
    : typeof report.growth_areas === 'string' && report.growth_areas 
      ? [report.growth_areas] 
      : []

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white border border-slate-200/90 rounded-[32px] shadow-2xl max-w-3xl w-full overflow-hidden my-auto relative flex flex-col max-h-[92vh]"
        >
          {/* Header Glow Banner */}
          <div className={`p-6 sm:p-8 bg-gradient-to-br ${style.gradient} text-white relative overflow-hidden shrink-0`}>
            {/* Background elements */}
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-12 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <button 
              onClick={onClose}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {isInitial ? 'Diagnóstico Inicial de Nivelamento' : 'Avaliação Recorrente de Progresso'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {studentName ? `Diagnóstico de ${studentName}` : 'Diagnóstico de Nível CEFR'}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm font-medium mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 opacity-80" />
              <span>Concluído em {dateStr}</span>
            </p>

            {/* Level Hero Badge */}
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white text-slate-900 font-black text-3xl flex items-center justify-center shadow-lg border-2 border-white/60 shrink-0">
                  {level}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">Nível Atribuído:</span>
                  <span className="text-lg sm:text-xl font-extrabold text-white block">{style.label}</span>
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">Pontuação Geral:</span>
                <span className="text-2xl sm:text-3xl font-black text-white">{scores.overall}%</span>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
            
            {/* 3 Core Skill Pillar Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Pronúncia & Ritmo</span>
                <div className="text-2xl font-black text-slate-800">{scores.pronunciation}%</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${scores.pronunciation}%` }} />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Acurácia Gramatical</span>
                <div className="text-2xl font-black text-slate-800">{scores.grammar}%</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-violet-600 h-full rounded-full transition-all duration-500" style={{ width: `${scores.grammar}%` }} />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Compreensão Textual</span>
                <div className="text-2xl font-black text-slate-800">{scores.reading}%</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${scores.reading}%` }} />
                </div>
              </div>
            </div>

            {/* Audio Player if present */}
            {assessment.audio_url && (
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Gravação de Leitura em Voz Alta</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Áudio gravado pelo aluno durante este teste</p>
                  </div>
                </div>

                <audio 
                  controls 
                  src={assessment.audio_url} 
                  className="w-full sm:w-64 h-9 rounded-lg"
                />
              </div>
            )}

            {/* Pedagogical Report Summary */}
            {report.summary && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Diagnóstico Pedagógico
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                  {report.summary}
                </p>
              </div>
            )}

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-4">
                  <h4 className="text-xs uppercase font-extrabold text-emerald-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Pontos Fortes Demonstrados
                  </h4>
                  <ul className="space-y-1.5">
                    {strengths.map((s: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {growthAreas.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-100/80 rounded-2xl p-4">
                  <h4 className="text-xs uppercase font-extrabold text-amber-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    Oportunidades de Evolução
                  </h4>
                  <ul className="space-y-1.5">
                    {growthAreas.map((g: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pronunciation Notes & Next Milestone */}
            {report.pronunciation_notes && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
                <span className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  Dicas Fonéticas & Ritmo:
                </span>
                <p className="text-slate-600 leading-relaxed">{report.pronunciation_notes}</p>
              </div>
            )}

            {report.next_milestone && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4 text-xs">
                <span className="block font-bold text-indigo-900 mb-1 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  Próxima Meta Recomendada:
                </span>
                <p className="text-indigo-800 leading-relaxed font-medium">{report.next_milestone}</p>
              </div>
            )}

          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-bold text-slate-400">
              Nível calibrado no padrão internacional CEFR
            </span>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm px-7 py-3.5 rounded-2xl transition-all shadow-md shadow-indigo-200/50 cursor-pointer hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <span>Concluir e Ir para o Meu Portal</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
