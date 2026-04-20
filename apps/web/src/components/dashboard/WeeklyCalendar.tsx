import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Session {
  session_id: string
  student_name: string
  start_time: string
  end_time: string
  price: number
  status: string
}

export default function WeeklyCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()))
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  // Função para pegar a segunda-feira da semana
  function getStartOfWeek(date: Date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // ajusta pra Monday
    return new Date(d.setDate(diff))
  }

  const fetchWeek = async (date: Date) => {
    setLoading(true)
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      // Na Vercel, /api/dashboard/calendar vai bater na Serverless Function
      let apiSuccess = false
      try {
        const res = await fetch(`/api/dashboard/calendar?week=${year}-${month}-${day}`)
        
        // Verifica content-type para ter certeza de que não é o HTML do Vite fallback
        const isJson = res.headers.get('content-type')?.includes('application/json')
        if (res.ok && isJson) {
          const data = await res.json()
          setSessions(data.sessions || [])
          apiSuccess = true
        }
      } catch (err) {
        console.warn('Vercel API route not available or failed. Falling back to direct Supabase query.')
      }

      if (!apiSuccess) {
        // FALLBACK LOCAL: Buscar as sessões em join explícito direto pelo front-end para ambiente local (Vite)
        const startDate = new Date(`${year}-${month}-${day}T00:00:00Z`)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7)

        const { data: dbSessions, error } = await supabase
          .from('sessions')
          .select(`
            id, 
            scheduled_date, 
            status, 
            price, 
            patient:patients (id, name)
          `)
          .gte('scheduled_date', startDate.toISOString())
          .lt('scheduled_date', endDate.toISOString())

        if (error) throw error

        const fallbackSessions = dbSessions?.map((s: any) => ({
          session_id: s.id,
          student_name: Array.isArray(s.patient) ? s.patient[0]?.name : s.patient?.name || 'Sem nome',
          start_time: s.scheduled_date,
          // Assumimos 1 hora de duração p/ exibir no bloco
          end_time: new Date(new Date(s.scheduled_date).getTime() + 60 * 60000).toISOString(),
          price: s.price,
          status: s.status,
        })) || []

        setSessions(fallbackSessions)
      }

    } catch (e) {
      console.error('Error fetching week:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWeek(currentWeekStart)
  }, [currentWeekStart])

  const nextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(next.getDate() + 7)
    setCurrentWeekStart(next)
  }

  const prevWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(prev.getDate() - 7)
    setCurrentWeekStart(prev)
  }

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-surface rounded-[32px] shadow-sm border border-slate-100 p-8 flex flex-col mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-dark tracking-wide">Sua Agenda</h3>
          <p className="text-sm text-slate-500 font-medium">Controle de Horários Ocupados e Livres</p>
        </div>
        <div className="flex items-center space-x-4 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          <button onClick={prevWeek} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
            {currentWeekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - 
            {new Date(currentWeekStart.getTime() + 6 * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] border border-slate-200 rounded-2xl bg-white overflow-hidden flex relative">
          
          {/* Eixo Y - Horas */}
          <div className="w-16 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
             <div className="h-12 border-b border-slate-200"></div> {/* Espaço vazio do corner */}
             {hours.map(h => (
               <div key={`h-${h}`} className="h-16 flex items-start justify-end pr-2 pt-1 border-b border-slate-100 relative">
                 <span className="text-[10px] sm:text-xs font-bold text-slate-400 capitalize">
                   {String(h).padStart(2, '0')}:00
                 </span>
               </div>
             ))}
          </div>

          {/* Eixo X - Dias */}
          <div className="flex-1 flex relative">
            {/* Lançamento Render de Background Grid */}
            <div className="absolute inset-0 grid grid-cols-7 w-full pointer-events-none">
              {days.map((_, i) => (
                <div key={`grid-col-${i}`} className="border-r border-slate-100 last:border-r-0 h-full w-full">
                  {hours.map(h => (
                     <div key={`grid-h-${h}`} className="h-16 border-b border-slate-100/50 w-full"></div>
                  ))}
                </div>
              ))}
            </div>

            {/* Colunas Reais de Eventos e Header */}
            {days.map((d, i) => {
              const currentDayDate = new Date(currentWeekStart.getTime() + i * 86400000)
              
              // Filtrar blocos deste dia específico
              const daySessions = sessions.filter(s => {
                const sDate = new Date(s.start_time)
                return sDate.getDate() === currentDayDate.getDate() && sDate.getMonth() === currentDayDate.getMonth()
              })

              return (
                <div key={`day-${d}`} className="flex-1 flex flex-col w-full relative z-10 border-r border-slate-200 last:border-r-0">
                  {/* Day Header */}
                  <div className="h-12 border-b border-slate-200 bg-white flex flex-col items-center justify-center sticky top-0 z-20">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{d}</span>
                    <span className="text-sm font-black text-slate-800">{currentDayDate.getDate()}</span>
                  </div>

                  {/* Day Body */}
                  <div className="relative h-[1536px]"> {/* 24h * 64px = 1536 */}
                    {daySessions.map(s => {
                      const startTime = new Date(s.start_time)
                      const endTime = new Date(s.end_time)
                      
                      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
                      const durationMins = (endTime.getTime() - startTime.getTime()) / 60000
                      
                      const top = (startMinutes / 60) * 64 // 64px is height of 1 hour (h-16)
                      const height = (durationMins / 60) * 64
                      
                      let bgTheme = "bg-primary-100 border-primary-200 text-primary-800"
                      if (s.status === 'COMPLETED') bgTheme = "bg-green-100 border-green-200 text-green-800"
                      // Neon approach for completed maybe instead of dark red
                      if (s.status === 'CANCELLED') bgTheme = "bg-rose-50 border-rose-100 text-rose-700"

                      return (
                        <div 
                          key={s.session_id}
                          className={`absolute w-full px-1 py-1 group overflow-hidden`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className={`w-full h-full p-2 border-l-4 rounded-md shadow-sm transition-all hover:shadow-md cursor-pointer ${bgTheme} overflow-hidden text-xs`}>
                             <div className="font-bold truncate">{s.student_name}</div>
                             <div className="opacity-80 flex justify-between mt-1">
                               <span>R$ {s.price?.toFixed(2) || '0.00'}</span>
                               <span className="uppercase font-semibold text-[9px]">{s.status === 'SCHEDULED' ? 'AGEN' : s.status}</span>
                             </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
      
      {loading && (
        <div className="mt-4 text-center text-sm font-bold text-slate-400 flex items-center justify-center">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Sincronizando...
        </div>
      )}
    </div>
  )
}
