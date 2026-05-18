import { supabase } from './supabase'

export interface Slot {
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  timestamp: Date // exact local start time
}

export async function getAvailableSlots(
  psychologistId: string,
  startDate: Date,
  endDate: Date,
  durationMinutes: number = 50,
  intervalMinutes: number = 30 // slots start every 30 mins (e.g., 9:00, 9:30)
): Promise<Slot[]> {
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // 1. Fetch Weekly Availability
  const { data: weeklyAvail } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('psychologist_id', psychologistId)

  // 2. Fetch Extra Slots
  const { data: extraSlots } = await supabase
    .from('teacher_extra_slots')
    .select('*')
    .eq('psychologist_id', psychologistId)
    .gte('slot_date', startStr)
    .lte('slot_date', endStr)

  // 3. Fetch Blocked Slots
  const { data: blockedSlots } = await supabase
    .from('teacher_blocked_slots')
    .select('*')
    .eq('psychologist_id', psychologistId)
    .gte('block_date', startStr)
    .lte('block_date', endStr)

  // 4. Fetch Existing Sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('scheduled_date, duration')
    .eq('psychologist_id', psychologistId)
    .in('status', ['SCHEDULED', 'PENDING'])
    .gte('scheduled_date', startDate.toISOString())
    .lte('scheduled_date', endDate.toISOString())

  const availableSlots: Slot[] = []
  
  // Helper to parse "HH:mm:ss" to minutes from midnight
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }
  
  // Helper to format minutes to "HH:mm"
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0')
    const m = (mins % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  // Iterate over each day in the range
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)
  const lastDate = new Date(endDate)
  lastDate.setHours(0, 0, 0, 0)

  while (currentDate <= lastDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayOfWeek = currentDate.getDay() // 0=Sun, 1=Mon

    // Collect all available windows for this day
    const dayWindows: { start: number, end: number }[] = []

    // Add weekly rules
    const rules = weeklyAvail?.filter(w => w.day_of_week === dayOfWeek) || []
    rules.forEach(r => {
      dayWindows.push({ start: parseTime(r.start_time), end: parseTime(r.end_time) })
    })

    // Add extra slots
    const extras = extraSlots?.filter(e => e.slot_date === dateStr) || []
    extras.forEach(e => {
      dayWindows.push({ start: parseTime(e.start_time), end: parseTime(e.end_time) })
    })

    // Generate possible slots from windows
    dayWindows.forEach(window => {
      let currentStart = window.start
      
      while (currentStart + durationMinutes <= window.end) {
        const slotEnd = currentStart + durationMinutes
        
        // 1. Check if overlaps with blocked slots
        const blocks = blockedSlots?.filter(b => b.block_date === dateStr) || []
        const isBlocked = blocks.some(b => {
          const bStart = parseTime(b.start_time)
          const bEnd = parseTime(b.end_time)
          // Overlap condition: slotStart < blockEnd AND slotEnd > blockStart
          return currentStart < bEnd && slotEnd > bStart
        })

        // 2. Check if overlaps with existing sessions
        const isBooked = sessions?.some(s => {
          const sDate = new Date(s.scheduled_date)
          if (sDate.toISOString().split('T')[0] !== dateStr) return false
          
          const sStart = sDate.getHours() * 60 + sDate.getMinutes()
          const sEnd = sStart + (s.duration || 50)
          return currentStart < sEnd && slotEnd > sStart
        }) || false

        // 3. Check if in the past
        const exactTime = new Date(currentDate)
        exactTime.setHours(Math.floor(currentStart/60), currentStart%60, 0, 0)
        
        // Let's enforce a minimum notice of 2 hours for safety, or grab from booking settings
        const minNoticeMs = 2 * 60 * 60 * 1000
        const isTooSoon = exactTime.getTime() < (new Date().getTime() + minNoticeMs)

        if (!isBlocked && !isBooked && !isTooSoon) {
          availableSlots.push({
            date: dateStr,
            startTime: formatTime(currentStart),
            endTime: formatTime(slotEnd),
            timestamp: exactTime
          })
        }

        currentStart += intervalMinutes
      }
    })

    // Advance 1 day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Deduplicate slots (in case weekly and extra overlap)
  const uniqueSlots = Array.from(new Set(availableSlots.map(s => s.timestamp.getTime())))
    .map(time => availableSlots.find(s => s.timestamp.getTime() === time)!)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return uniqueSlots
}
