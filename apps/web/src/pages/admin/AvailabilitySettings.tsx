import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Calendar, Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react'

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
]

interface Availability {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
}

export default function AvailabilitySettings() {
  const { session } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  
  // Configurações gerais
  const [settings, setSettings] = useState({
    minimum_notice_hours: 12,
    cancellation_limit_hours: 12,
    auto_accept_bookings: true
  })

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    setLoading(true)
    
    // Buscar disponibilidades
    const { data: avData } = await supabase
      .from('teacher_availability')
      .select('*')
      .eq('psychologist_id', session!.user.id)
      .order('day_of_week', { ascending: true })

    if (avData) {
      setAvailabilities(avData)
    }

    // Buscar configurações
    const { data: setData } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('psychologist_id', session!.user.id)
      .single()

    if (setData) {
      setSettings({
        minimum_notice_hours: setData.minimum_notice_hours,
        cancellation_limit_hours: setData.cancellation_limit_hours,
        auto_accept_bookings: setData.auto_accept_bookings
      })
    }

    setLoading(false)
  }

  const handleAddSlot = (dayOfWeek: number) => {
    setAvailabilities([...availabilities, { day_of_week: dayOfWeek, start_time: '09:00', end_time: '17:00' }])
  }

  const handleUpdateSlot = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const newAvails = [...availabilities]
    // Precisa formatar para HH:mm:ss caso falte os segundos (PostgreSQL exige time)
    const timeValue = value.length === 5 ? `${value}:00` : value
    newAvails[index][field] = timeValue
    setAvailabilities(newAvails)
  }

  const handleRemoveSlot = (index: number) => {
    const newAvails = [...availabilities]
    newAvails.splice(index, 1)
    setAvailabilities(newAvails)
  }

  const handleSave = async () => {
    if (!session) return
    setSaving(true)

    // 1. Atualizar configurações
    await supabase.from('booking_settings').upsert({
      psychologist_id: session.user.id,
      ...settings
    })

    // 2. Atualizar disponibilidades
    // Excluir todas e reinserir para ser simples (MVP)
    await supabase.from('teacher_availability').delete().eq('psychologist_id', session.user.id)
    
    if (availabilities.length > 0) {
      const inserts = availabilities.map(a => ({
        psychologist_id: session.user.id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time
      }))
      await supabase.from('teacher_availability').insert(inserts)
    }

    await fetchData()
    setSaving(false)
    alert('Configurações salvas com sucesso!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Disponibilidade</h1>
          <p className="text-slate-500 mt-1">Configure seus horários para que os alunos possam agendar aulas sozinhos.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Coluna Principal: Tabela de Horários Semanais */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" /> Horários Semanais Recorrentes
            </h2>

            <div className="space-y-6">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const daySlots = availabilities.filter(a => a.day_of_week === dayIndex)
                
                return (
                  <div key={dayIndex} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${daySlots.length > 0 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                        {dayName}
                      </h3>
                      <button 
                        onClick={() => handleAddSlot(dayIndex)}
                        className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Horário
                      </button>
                    </div>

                    {daySlots.length === 0 ? (
                      <p className="text-slate-400 text-sm">Indisponível</p>
                    ) : (
                      <div className="space-y-3">
                        {availabilities.map((slot, globalIndex) => {
                          if (slot.day_of_week !== dayIndex) return null
                          
                          // Cortar os segundos (HH:mm:ss -> HH:mm) para exibir no input de tempo
                          const startTime = slot.start_time.substring(0, 5)
                          const endTime = slot.end_time.substring(0, 5)

                          return (
                            <div key={globalIndex} className="flex items-center gap-3">
                              <input 
                                type="time" 
                                value={startTime}
                                onChange={(e) => handleUpdateSlot(globalIndex, 'start_time', e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              />
                              <span className="text-slate-400">até</span>
                              <input 
                                type="time" 
                                value={endTime}
                                onChange={(e) => handleUpdateSlot(globalIndex, 'end_time', e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              />
                              <button 
                                onClick={() => handleRemoveSlot(globalIndex)}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Configurações de Regras */}
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/60">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" /> Regras de Agendamento
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Aviso Prévio Mínimo</label>
                <p className="text-xs text-slate-500 mb-2">Quantas horas antes o aluno pode agendar?</p>
                <select 
                  value={settings.minimum_notice_hours}
                  onChange={(e) => setSettings({...settings, minimum_notice_hours: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-medium"
                >
                  <option value={2}>2 horas antes</option>
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes</option>
                  <option value={48}>48 horas antes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Limite para Cancelamento</label>
                <p className="text-xs text-slate-500 mb-2">Com quantas horas de antecedência o aluno pode cancelar e receber a aula de volta?</p>
                <select 
                  value={settings.cancellation_limit_hours}
                  onChange={(e) => setSettings({...settings, cancellation_limit_hours: parseInt(e.target.value)})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white font-medium"
                >
                  <option value={2}>2 horas antes</option>
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes</option>
                  <option value={48}>48 horas antes</option>
                  <option value={9999}>Não permitir cancelamento</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.auto_accept_bookings}
                    onChange={(e) => setSettings({...settings, auto_accept_bookings: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-700">Aceitar Automaticamente</span>
                    <span className="block text-xs text-slate-500">Aulas agendadas não precisarão de sua aprovação manual.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-800">Dica sobre Fusos Horários</h4>
              <p className="text-xs text-amber-700 mt-1">Configure sua disponibilidade de acordo com o SEU fuso horário atual. O sistema converterá os horários automaticamente para os seus alunos.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
