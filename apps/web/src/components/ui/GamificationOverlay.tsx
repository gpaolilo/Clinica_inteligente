import { motion, AnimatePresence } from 'framer-motion'
import { useGamificationStore } from '../../stores/gamificationStore'
import { Trophy, Flame, Star, X } from 'lucide-react'

export default function GamificationOverlay() {
  const { events, removeEvent } = useGamificationStore()

  const getIcon = (type: string) => {
    switch (type) {
      case 'badge': return <Trophy className="w-8 h-8 text-emerald-500" />
      case 'streak': return <Flame className="w-8 h-8 text-orange-500" />
      case 'xp': return <Star className="w-8 h-8 text-amber-400" />
      default: return <Star className="w-8 h-8 text-primary-500" />
    }
  }

  const getBg = (type: string) => {
    switch (type) {
      case 'badge': return 'bg-emerald-50 border-emerald-200'
      case 'streak': return 'bg-orange-50 border-orange-200'
      case 'xp': return 'bg-amber-50 border-amber-200'
      default: return 'bg-primary-50 border-primary-200'
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className={`pointer-events-auto flex items-center gap-4 p-4 rounded-2xl border shadow-xl w-80 bg-white/90 backdrop-blur-md ${getBg(event.type)}`}
          >
            <div className="shrink-0 bg-white p-2 rounded-xl shadow-sm">
              {getIcon(event.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800 text-sm flex items-center justify-between">
                {event.title}
                {event.value && <span className="text-lg text-primary-600">+{event.value}</span>}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>
            </div>
            <button 
              onClick={() => removeEvent(event.id)}
              className="text-slate-400 hover:text-slate-600 shrink-0 self-start"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
