import { useEffect, useState } from 'react'
import { StudentEngine } from '../../lib/student-engine-client'
import { Brain, TrendingUp, AlertTriangle, MessageSquare, Target } from 'lucide-react'


export function StudentInsightsDashboard({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const data = await StudentEngine.getProfile(patientId)
        setProfile(data.profile)
        setEvents(data.recent_events || [])
      } catch (err) {
        console.error("Failed to load insights:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [patientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    )
  }

  if (!profile && events.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm font-urbanist">
        <Brain className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-medium text-gray-900 mb-2">Sem dados de aprendizado</h3>
        <p>Inicie uma análise de sessão para gerar os primeiros insights do aluno.</p>
      </div>
    )
  }

  // Calculate some mock or real stats based on events
  const grammarCount = events.filter(e => e.event_type === 'grammar_error').length
  const vocabCount = events.filter(e => e.event_type === 'vocabulary_gap').length
  
  // A mock fluency score based on events count (just for visual purposes, in reality would come from analysis)
  const fluencyScore = Math.max(0, 100 - (events.length * 2))

  return (
    <div className="space-y-6 font-urbanist">
      
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-[#effcb1] to-white rounded-3xl p-6 border border-lime-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Nível Atual</h2>
            <div className="text-3xl font-bold text-gray-900">{profile?.level || 'Iniciante'}</div>
          </div>
          
          <div className="mt-6 flex space-x-4">
            <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-semibold text-gray-800 backdrop-blur-sm border border-white/40 shadow-sm flex items-center">
              <Target className="w-3 h-3 mr-1" /> Foco: Fluência
            </span>
            <span className="bg-white/60 px-3 py-1 rounded-full text-xs font-semibold text-orange-600 backdrop-blur-sm border border-white/40 shadow-sm flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" /> {events.length} pontos a melhorar
            </span>
          </div>
        </div>

        {/* Fluency Score Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Score de Fluência</h2>
          
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* SVG Circle for the score ring */}
            <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-emerald-700"
                strokeDasharray={`${fluencyScore}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-900">{fluencyScore}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Grade {fluencyScore > 90 ? 'A' : fluencyScore > 75 ? 'B' : 'C'}</span>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 flex flex-col gap-1 items-start w-full">
             <div className="flex items-center text-emerald-700 font-medium">
               <TrendingUp className="w-3 h-3 mr-1" /> +5% desde última sessão
             </div>
          </div>
        </div>
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Weaknesses List */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" /> Padrões de Erro
          </h3>
          {profile?.weaknesses && profile.weaknesses.length > 0 ? (
            <ul className="space-y-3">
              {profile.weaknesses.map((w: string, idx: number) => (
                <li key={idx} className="flex items-start text-sm text-gray-700 bg-lime-50/50 p-3 rounded-2xl">
                  <span className="w-1.5 h-1.5 bg-lime-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  {w}
                </li>
              ))}
            </ul>
          ) : (
             <p className="text-sm text-gray-500">Nenhum padrão detectado ainda.</p>
          )}
        </div>

        {/* Recent Events Summary */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" /> Resumo da Última Sessão
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
               <span className="text-sm font-medium text-gray-700">Erros Gramaticais</span>
               <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-xs">{grammarCount}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
               <span className="text-sm font-medium text-gray-700">Lacunas de Vocabulário</span>
               <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-xs">{vocabCount}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
