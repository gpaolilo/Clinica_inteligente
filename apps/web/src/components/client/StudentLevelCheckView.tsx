import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Sparkles, CheckCircle2, ArrowRight, Clock, 
  Mic, Brain, BookOpen, ShieldCheck, LogOut
} from 'lucide-react'
import { useTenantBranding } from '../../hooks/useTenantBranding'
import PlacementTestModal from '../assessment/PlacementTestModal'

interface StudentLevelCheckViewProps {
  patient: any
  onSkip: () => void
  onCompleted: () => void
  onSignOut: () => void
}

export default function StudentLevelCheckView({
  patient,
  onSkip,
  onCompleted,
  onSignOut
}: StudentLevelCheckViewProps) {
  const { appName, logoUrl } = useTenantBranding()
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)

  const firstName = patient?.name?.split(' ')[0] || 'Aluno'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <div className="bg-indigo-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
                {appName?.charAt(0) || 'F'}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base flex items-center gap-2">
                {appName}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Contrato Assinado
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Passo 2 • Diagnóstico de Nivelamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white rounded-[32px] p-7 sm:p-10 shadow-2xl relative overflow-hidden border border-indigo-500/25 mb-8"
        >
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -top-12 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Diagnóstico de Nivelamento CEFR
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                1º Passo Concluído
              </span>
            </div>

            <h2 
              style={{ color: '#ffffff' }}
              className="text-2xl sm:text-4xl font-black text-white !text-white tracking-tight leading-tight"
            >
              Parabéns, {firstName}! Vamos calibrar seu nível de inglês?
            </h2>

            <p className="text-sm sm:text-base text-indigo-200/90 leading-relaxed font-medium max-w-2xl">
              Seu contrato foi formalizado com sucesso. Agora, preparamos um teste diagnóstico interativo de <strong>apenas 5 minutos</strong> para conhecermos seu nível no padrão internacional CEFR (A1 a C2) e calibrarmos seus exercícios com IA.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Duração estimada: ~5 minutos • Rápido, leve e intuitivo</span>
            </div>
          </div>
        </motion.div>

        {/* 3 Pillars Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Mic className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Etapa 1
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2">
                Leitura em Voz Alta
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Você gravará um parágrafo guiado. Seu áudio fica salvo como registro histórico para compararmos seu progresso de dicção e fluência!
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <span>Gravação via microfone</span>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full">
                Etapa 2
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2">
                Desafio Gramatical
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                5 perguntas rápidas de múltipla escolha para identificar com precisão seu domínio sobre tempos verbais e conectivos.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <span>Múltipla escolha adaptativa</span>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">
                Etapa 3
              </span>
              <h3 className="text-base font-black text-slate-900 mt-2">
                Compreensão de Texto
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Um pequeno texto contextual para avaliar sua assimilação de vocabulário e capacidade de inferência semântica.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <span>Interpretação e vocabulário</span>
            </div>
          </motion.div>
        </div>

        {/* Action Choice Box */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-1.5 text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-black text-slate-900">
              Pronto para começar seu teste agora?
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg">
              Você pode iniciar imediatamente ou, se preferir, <strong>pular por agora</strong> e realizá-lo mais tarde diretamente pelo seu painel de aluno.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
            {/* OPTION 2: SKIP FOR NOW */}
            <button
              type="button"
              onClick={onSkip}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Pular por agora</span>
            </button>

            {/* OPTION 1: START LEVEL TEST */}
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Fazer Teste de Nível</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Placement Test Modal */}
      {patient && (
        <PlacementTestModal
          isOpen={isTestModalOpen}
          onClose={() => {
            setIsTestModalOpen(false)
          }}
          studentId={patient.id}
          studentName={firstName}
          teacherId={patient.psychologist_id}
          onCompleted={(result: any) => {
            setIsTestModalOpen(false)
            if (result?.assigned_level) {
              localStorage.setItem(`flowike_student_level_${patient.id}`, result.assigned_level)
              if (patient.user_id) {
                localStorage.setItem(`flowike_student_level_${patient.user_id}`, result.assigned_level)
              }
            }
            onCompleted()
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400 font-medium">
        {appName} • Sistema de Ensino & Plataforma Inteligente • Todos os direitos reservados.
      </footer>
    </div>
  )
}
