import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Book, Play, Check, X, RotateCcw, Volume2 } from 'lucide-react'

const GlassCard = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm transition-all duration-300 rounded-[24px] ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${className}`}
  >
    {children}
  </div>
)

export default function VocabularyBank() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [vocabList, setVocabList] = useState<any[]>([])
  const [reviewMode, setReviewMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  // Confetti / Gamification triggers
  const [showConfetti, setShowConfetti] = useState(false)

  const fetchVocabulary = async () => {
    if (!session) return
    setLoading(true)
    
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!patient) return

    const { data: vocab } = await supabase
      .from('vocabulary_bank')
      .select('*')
      .eq('patient_id', patient.id)
      .order('next_review_date', { ascending: true })

    if (vocab) setVocabList(vocab)
    setLoading(false)
  }

  useEffect(() => {
    fetchVocabulary()
  }, [session])

  const pendingReview = vocabList.filter(v => new Date(v.next_review_date) <= new Date())

  const handleStartReview = () => {
    if (pendingReview.length === 0) return
    setVocabList(pendingReview)
    setCurrentIndex(0)
    setIsFlipped(false)
    setReviewMode(true)
  }

  const handleScore = async (score: number) => {
    const currentWord = vocabList[currentIndex]
    
    // Spaced Repetition Logic (simplified)
    // score: 1 = forgot, 2 = hard, 3 = easy
    let newMastery = currentWord.mastery_score
    let daysToAdd = 1

    if (score === 1) {
      newMastery = Math.max(0, newMastery - 20)
      daysToAdd = 1
    } else if (score === 2) {
      newMastery = Math.min(100, newMastery + 10)
      daysToAdd = 3
    } else {
      newMastery = Math.min(100, newMastery + 25)
      daysToAdd = 7
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + daysToAdd)

    // Update DB
    await supabase.from('vocabulary_bank').update({
      mastery_score: newMastery,
      next_review_date: nextReview.toISOString()
    }).eq('id', currentWord.id)

    // Next Card
    if (currentIndex < vocabList.length - 1) {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300)
    } else {
      // Finished Review
      setShowConfetti(true)
      setTimeout(() => {
        setReviewMode(false)
        setShowConfetti(false)
        fetchVocabulary()
      }, 3000)
    }
  }

  const playPronunciation = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  if (reviewMode) {
    const currentWord = vocabList[currentIndex]
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] md:min-h-screen bg-slate-50 p-4">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="text-4xl animate-bounce">🎉 Sessão Concluída! +50 XP 🎉</div>
          </div>
        )}
        
        <div className="max-w-md w-full">
          <div className="flex justify-between items-center mb-6 px-4">
            <span className="text-slate-500 font-bold">Cartão {currentIndex + 1} de {vocabList.length}</span>
            <button onClick={() => {setReviewMode(false); fetchVocabulary();}} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative h-96 perspective-1000 mb-8">
            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div 
                  key="front"
                  initial={{ rotateY: -180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 180, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={() => setIsFlipped(true)}
                  className="absolute inset-0 bg-white border border-slate-200 rounded-[32px] shadow-lg flex flex-col items-center justify-center p-8 cursor-pointer backface-hidden"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); playPronunciation(currentWord.word); }}
                    className="absolute top-6 right-6 p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <h2 className="text-5xl font-black text-slate-800 mb-4">{currentWord.word}</h2>
                  {currentWord.pronunciation && (
                    <p className="text-lg text-slate-400 font-medium font-mono">{currentWord.pronunciation}</p>
                  )}
                  <p className="absolute bottom-8 text-slate-400 text-sm font-bold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Toque para virar
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="back"
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -180, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-[32px] shadow-lg flex flex-col items-center justify-center p-8 text-center backface-hidden"
                >
                  <h3 className="text-2xl font-bold text-white mb-6">Tradução / Significado</h3>
                  <p className="text-xl text-slate-300 mb-8 leading-relaxed">{currentWord.definition}</p>
                  
                  {currentWord.example_sentence && (
                    <div className="bg-white/10 p-4 rounded-xl w-full">
                      <p className="text-sm font-bold text-primary-400 mb-1">Exemplo:</p>
                      <p className="text-slate-200 italic">"{currentWord.example_sentence}"</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isFlipped && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => handleScore(1)}
                  className="bg-white border-2 border-rose-200 text-rose-600 font-bold py-4 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-colors"
                >
                  Esqueci
                </button>
                <button 
                  onClick={() => handleScore(2)}
                  className="bg-white border-2 border-amber-200 text-amber-600 font-bold py-4 rounded-2xl hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  Difícil
                </button>
                <button 
                  onClick={() => handleScore(3)}
                  className="bg-white border-2 border-emerald-200 text-emerald-600 font-bold py-4 rounded-2xl hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  Fácil
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Book className="w-8 h-8 text-primary-500" /> Banco de Vocabulário
          </h1>
          <p className="text-slate-500 mt-1">Sua coleção pessoal de palavras com revisão espaçada por IA.</p>
        </div>

        <button 
          onClick={handleStartReview}
          disabled={pendingReview.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md ${pendingReview.length > 0 ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          <Play className="w-5 h-5" />
          Revisar ({pendingReview.length})
        </button>
      </motion.div>

      {vocabList.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Book className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Seu banco está vazio</h2>
          <p className="text-slate-500 mt-2">A IA adicionará palavras automaticamente baseadas nas suas aulas.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vocabList.map((vocab) => {
            const isPending = new Date(vocab.next_review_date) <= new Date()
            return (
              <motion.div key={vocab.id} variants={itemVariants}>
                <GlassCard className="p-5 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-black text-slate-800">{vocab.word}</h3>
                    <button 
                      onClick={() => playPronunciation(vocab.word)}
                      className="text-slate-300 hover:text-primary-500 transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{vocab.definition}</p>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 mr-4">
                      <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${vocab.mastery_score}%` }}></div>
                    </div>
                    {isPending ? (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider">Revisar</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider"><Check className="w-3 h-3" /> Em dia</span>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

    </motion.div>
  )
}
