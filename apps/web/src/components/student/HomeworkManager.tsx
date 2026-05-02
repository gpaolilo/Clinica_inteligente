import { useState } from 'react'
import { StudentEngine } from '../../lib/student-engine-client'
import { BookOpen, RefreshCw, CheckCircle, Edit3, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function HomeworkManager({ sessionId, patientId, psychologistId }: { sessionId: string, patientId: string, psychologistId: string }) {
  const [loading, setLoading] = useState(false)
  const [homework, setHomework] = useState<any>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await StudentEngine.generateHomework(sessionId, patientId, psychologistId)
      setHomework(res.plan)
    } catch (err) {
      console.error("Failed to generate homework", err)
    } finally {
      setLoading(false)
    }
  }

  if (!homework && !loading) {
    return (
      <div className="bg-[#effcb1] rounded-3xl p-8 border border-lime-200 shadow-sm flex flex-col items-center justify-center text-center font-urbanist">
        <BookOpen className="w-12 h-12 text-lime-700 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Gerador de Exercícios Adaptativos</h3>
        <p className="text-gray-700 mb-6 max-w-md">
          A IA criará exercícios 100% baseados nos erros e nas lacunas desta sessão, garantindo que o aluno pratique exatamente o que precisa.
        </p>
        <button
          onClick={handleGenerate}
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-8 py-3 rounded-full font-bold transition-all shadow-md flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Gerar Homework
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center font-urbanist">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Analisando eventos e gerando exercícios...</h3>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm font-urbanist">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-lime-600" /> Plano de Exercícios
          </h3>
          <p className="text-xs text-gray-500 mt-1">Gerado a partir dos eventos desta sessão</p>
        </div>
        <div className="flex gap-2">
           <button onClick={handleGenerate} className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors">
              <RefreshCw className="w-5 h-5" />
           </button>
           <button className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center hover:bg-gray-800 transition-colors">
              <CheckCircle className="w-4 h-4 mr-2" /> Publicar para Aluno
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {homework?.exercises?.map((ex: any, idx: number) => (
          <div key={idx} className="border border-gray-100 rounded-2xl p-5 hover:border-lime-200 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  ex.type === 'grammar' ? 'bg-red-50 text-red-600' : 
                  ex.type === 'vocabulary' ? 'bg-orange-50 text-orange-600' :
                  ex.type === 'speaking' ? 'bg-blue-50 text-blue-600' :
                  'bg-emerald-50 text-emerald-600'
                )}>
                  {ex.type}
                </span>
                <h4 className="font-bold text-gray-900">{ex.title}</h4>
              </div>
              <button className="text-gray-300 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">{ex.instruction}</p>
            
            <div className="bg-gray-50 rounded-xl p-4 text-sm font-medium text-gray-800 border-l-4 border-lime-400">
              <span className="text-xs font-bold text-gray-400 block mb-1">Exemplo / Contexto</span>
              {ex.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
