import { useState, useRef } from 'react'
import { Volume2, Play, Pause, Calendar, Award, Sparkles, TrendingUp } from 'lucide-react'

interface AudioBeforeAfterPlayerProps {
  initialAssessment?: any
  latestAssessment?: any
}

export default function AudioBeforeAfterPlayer({ initialAssessment, latestAssessment }: AudioBeforeAfterPlayerProps) {
  const [playingInitial, setPlayingInitial] = useState(false)
  const [playingLatest, setPlayingLatest] = useState(false)

  const initialAudioRef = useRef<HTMLAudioElement | null>(null)
  const latestAudioRef = useRef<HTMLAudioElement | null>(null)

  const hasBoth = initialAssessment && latestAssessment && initialAssessment.id !== latestAssessment.id
  const hasOnlyOne = initialAssessment || latestAssessment
  const single = initialAssessment || latestAssessment

  const toggleInitial = () => {
    if (!initialAudioRef.current) return
    if (playingInitial) {
      initialAudioRef.current.pause()
      setPlayingInitial(false)
    } else {
      if (latestAudioRef.current) {
        latestAudioRef.current.pause()
        setPlayingLatest(false)
      }
      initialAudioRef.current.play()
      setPlayingInitial(true)
    }
  }

  const toggleLatest = () => {
    if (!latestAudioRef.current) return
    if (playingLatest) {
      latestAudioRef.current.pause()
      setPlayingLatest(false)
    } else {
      if (initialAudioRef.current) {
        initialAudioRef.current.pause()
        setPlayingInitial(false)
      }
      latestAudioRef.current.play()
      setPlayingLatest(true)
    }
  }

  if (!hasOnlyOne) {
    return null
  }

  const scoreDiff = hasBoth 
    ? Math.round((latestAssessment.pronunciation_score || 0) - (initialAssessment.pronunciation_score || 0))
    : 0

  return (
    <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-100/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Comparativo de Fala
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-600" />
            Evolução de Pronúncia & Fluência
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Ouça as gravações de leitura em voz alta e compare o ritmo, acurácia e segurança vocal.
          </p>
        </div>

        {hasBoth && scoreDiff !== 0 && (
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 ${
            scoreDiff > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>{scoreDiff > 0 ? `+${scoreDiff}% de evolução` : `${scoreDiff}% de variação`}</span>
          </div>
        )}
      </div>

      {hasBoth ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card Inicial (Antes) */}
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-slate-200 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                  Antes • Teste Inicial
                </span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(initialAssessment.completed_at || initialAssessment.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-white font-black text-xl flex items-center justify-center shrink-0">
                  {initialAssessment.assigned_level || 'A2'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Pronúncia Inicial</span>
                  <span className="text-lg font-black text-slate-800">{Math.round(initialAssessment.pronunciation_score || 0)}% de acurácia</span>
                </div>
              </div>

              {initialAssessment.test_content?.reading_aloud?.text && (
                <div className="bg-white/80 rounded-xl p-3 border border-slate-200/50 my-3 text-xs text-slate-600 italic leading-relaxed max-h-24 overflow-y-auto">
                  "{initialAssessment.test_content.reading_aloud.text}"
                </div>
              )}
            </div>

            {/* Audio Controller */}
            {initialAssessment.audio_url ? (
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center gap-3">
                <audio 
                  ref={initialAudioRef} 
                  src={initialAssessment.audio_url} 
                  onEnded={() => setPlayingInitial(false)}
                  className="hidden" 
                />
                <button
                  onClick={toggleInitial}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                >
                  {playingInitial ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-700 block truncate">
                    {playingInitial ? 'Reproduzindo áudio inicial...' : 'Ouvir Áudio Inicial'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Leitura do 1º teste de nivelamento</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium italic mt-2">Áudio indisponível neste teste.</div>
            )}
          </div>

          {/* Card Recente (Depois) */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/60 border border-indigo-200/80 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-xs">
                  Depois • Teste Mais Recente
                </span>
                <span className="text-[11px] font-bold text-indigo-900/80 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(latestAssessment.completed_at || latestAssessment.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {latestAssessment.assigned_level || 'B1'}
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-800 block">Pronúncia Atual</span>
                  <span className="text-lg font-black text-indigo-950">{Math.round(latestAssessment.pronunciation_score || 0)}% de acurácia</span>
                </div>
              </div>

              {latestAssessment.test_content?.reading_aloud?.text && (
                <div className="bg-white/90 rounded-xl p-3 border border-indigo-100 my-3 text-xs text-slate-700 italic leading-relaxed max-h-24 overflow-y-auto">
                  "{latestAssessment.test_content.reading_aloud.text}"
                </div>
              )}
            </div>

            {/* Audio Controller */}
            {latestAssessment.audio_url ? (
              <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center gap-3">
                <audio 
                  ref={latestAudioRef} 
                  src={latestAssessment.audio_url} 
                  onEnded={() => setPlayingLatest(false)}
                  className="hidden" 
                />
                <button
                  onClick={toggleLatest}
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
                >
                  {playingLatest ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-indigo-900 block truncate">
                    {playingLatest ? 'Reproduzindo áudio recente...' : 'Ouvir Áudio Recente'}
                  </span>
                  <span className="text-[10px] text-indigo-700/80 font-semibold">Leitura do teste de progresso</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium italic mt-2">Áudio indisponível neste teste.</div>
            )}
          </div>
        </div>
      ) : (
        /* Caso o aluno só tenha realizado o primeiro teste */
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">Primeira Gravação Registrada</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-lg">
                O áudio de nivelamento inicial foi salvo com sucesso. Assim que o professor solicitar uma nova avaliação de progresso, este áudio será posicionado lado a lado para demonstrar o ganho de confiança e fluência!
              </p>
            </div>
          </div>

          {single.audio_url && (
            <div className="shrink-0 w-full sm:w-auto">
              <audio controls src={single.audio_url} className="h-9 w-full sm:w-56" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
