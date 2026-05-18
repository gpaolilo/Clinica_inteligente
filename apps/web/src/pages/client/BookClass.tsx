import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getAvailableSlots, Slot } from '../../lib/booking-engine'
import { Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, User, BookOpen } from 'lucide-react'

// Util helper para datas
const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export default function BookClass() {
  const { session } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  
  const [patientData, setPatientData] = useState<any>(null)
  const [teacher, setTeacher] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  
  // Wizard State
  const [step, setStep] = useState(1) // 1: Info, 2: Date/Time, 3: Confirm
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    if (!session) return
    setLoading(true)
    
    // Buscar dados do aluno e saldo
    const { data: patient } = await supabase
      .from('patients')
      .select('*, psychologists(id, full_name, email)')
      .eq('user_id', session.user.id)
      .single()

    if (patient) {
      setPatientData(patient)
      setBalance(patient.class_balance || 0)
      setTeacher(patient.psychologists)
      
      // Ao carregar, já buscar os slots da semana atual
      await fetchSlots(patient.psychologists.id, new Date())
    }
    
    setLoading(false)
  }

  const fetchSlots = async (psychologistId: string, startDate: Date) => {
    // Buscar 7 dias a partir da startDate
    const endDate = addDays(startDate, 6)
    const slots = await getAvailableSlots(psychologistId, startDate, endDate, 50, 30)
    setAvailableSlots(slots)
  }

  const handleNextWeek = () => {
    const nextDate = addDays(selectedDate, 7)
    setSelectedDate(nextDate)
    if (teacher) fetchSlots(teacher.id, nextDate)
  }

  const handlePrevWeek = () => {
    const prevDate = addDays(selectedDate, -7)
    // Não permitir ir para o passado
    if (prevDate < new Date(new Date().setHours(0,0,0,0))) return
    setSelectedDate(prevDate)
    if (teacher) fetchSlots(teacher.id, prevDate)
  }

  const handleBookClass = async () => {
    if (!selectedSlot || !teacher || !patientData) return
    setBookingLoading(true)

    try {
      const { data, error } = await supabase.rpc('book_session', {
        p_psychologist_id: teacher.id,
        p_patient_id: patientData.id,
        p_scheduled_date: selectedSlot.timestamp.toISOString(),
        p_duration: 50
      })

      if (error) throw error

      setStep(4) // Tela de sucesso
    } catch (error: any) {
      alert(`Erro ao agendar: ${error.message}`)
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Agrupar slots por data
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)

  // Array de datas da semana atual selecionada
  const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(selectedDate, i))

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Wizard Header */}
      {step < 4 && (
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Agendar Aula</h1>
          <p className="text-slate-500 mt-1">Siga os passos para reservar seu próximo horário.</p>
          
          <div className="flex items-center mt-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <div className={`flex-1 h-1 mx-2 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
            <div className={`flex-1 h-1 mx-2 rounded-full ${step >= 3 ? 'bg-primary-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        
        {/* STEP 1: Info e Professor */}
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Professor e Saldo</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Professor</p>
                    <h3 className="text-xl font-black text-slate-800">{teacher?.full_name}</h3>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary-600 to-purple-600 p-6 rounded-2xl text-white shadow-lg flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 font-medium">Seu saldo disponível</p>
                    <h3 className="text-4xl font-black">{balance} <span className="text-xl font-medium">aulas</span></h3>
                  </div>
                  <BookOpen className="w-12 h-12 text-white/20" />
                </div>
              </div>

              {balance <= 0 ? (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium flex gap-3">
                  <ArrowRight className="w-6 h-6 shrink-0" />
                  <p>Você não tem aulas disponíveis no seu saldo. Por favor, adquira um novo pacote ou entre em contato com seu professor.</p>
                </div>
              ) : (
                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={() => setStep(2)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all"
                  >
                    Continuar <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Data e Hora */}
        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-200"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary-500" /> Escolha o Horário
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <span className="font-bold text-slate-700 min-w-[120px] text-center">
                  {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {weekDates.map(date => {
                const dateStr = date.toISOString().split('T')[0]
                const daySlots = groupedSlots[dateStr] || []
                const isToday = dateStr === new Date().toISOString().split('T')[0]

                return (
                  <div key={dateStr} className="flex flex-col">
                    <div className={`text-center py-2 mb-3 rounded-lg border ${isToday ? 'bg-primary-50 border-primary-200' : 'border-slate-100 bg-slate-50'}`}>
                      <p className="text-xs font-bold text-slate-500 uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                      <p className={`text-lg font-black ${isToday ? 'text-primary-700' : 'text-slate-800'}`}>{date.getDate()}</p>
                    </div>

                    <div className="space-y-2 flex-1">
                      {daySlots.length === 0 ? (
                        <div className="text-center text-xs text-slate-400 py-4">-</div>
                      ) : (
                        daySlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`w-full py-2 px-1 text-sm font-bold rounded-lg border transition-all ${
                              selectedSlot?.timestamp.getTime() === slot.timestamp.getTime()
                                ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400 hover:text-primary-600'
                            }`}
                          >
                            {slot.startTime}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
              <button onClick={() => setStep(1)} className="text-slate-500 font-bold hover:text-slate-800">Voltar</button>
              <button 
                onClick={() => setStep(3)}
                disabled={!selectedSlot}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                Continuar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Confirmar */}
        {step === 3 && selectedSlot && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="max-w-xl mx-auto"
          >
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200/60 text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Confirmar Agendamento</h2>
              <p className="text-slate-500 mb-8">Revise os detalhes da sua próxima aula.</p>

              <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <span className="text-slate-500 font-medium">Professor</span>
                  <span className="font-bold text-slate-800">{teacher?.full_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <span className="text-slate-500 font-medium">Data</span>
                  <span className="font-bold text-slate-800">{selectedSlot.timestamp.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <span className="text-slate-500 font-medium">Horário</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1"><Clock className="w-4 h-4"/> {selectedSlot.startTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Saldo Deduzido</span>
                  <span className="font-black text-rose-500">-1 Aula</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleBookClass}
                  disabled={bookingLoading}
                  className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/30 flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {bookingLoading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Sucesso */}
        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200/60">
              <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-slate-800 mb-2">Aula Agendada!</h2>
              <p className="text-slate-500 mb-8">Seu horário foi reservado com sucesso e o professor já foi notificado.</p>
              
              <button 
                onClick={() => navigate('/client')}
                className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Voltar para o Dashboard
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
