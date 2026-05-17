import { create } from 'zustand'

interface GamificationEvent {
  id: string
  type: 'xp' | 'badge' | 'streak'
  title: string
  description: string
  value?: number
  icon?: string
}

interface GamificationState {
  events: GamificationEvent[]
  addEvent: (event: Omit<GamificationEvent, 'id'>) => void
  removeEvent: (id: string) => void
}

export const useGamificationStore = create<GamificationState>((set) => ({
  events: [],
  addEvent: (event) => set((state) => {
    const newEvent = { ...event, id: Math.random().toString(36).substring(7) }
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      set((s) => ({ events: s.events.filter(e => e.id !== newEvent.id) }))
    }, 4000)

    return { events: [...state.events, newEvent] }
  }),
  removeEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  }))
}))
