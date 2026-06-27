import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { StudentEngine } from '../../lib/student-engine-client'
import { BookOpen, RefreshCw, CheckCircle, Edit3, Trash2, Save, X, Shield, Award, Clock } from 'lucide-react'
import clsx from 'clsx'

const SECTION_METRIC_COSTS: Record<string, number> = {
  mistakes: 5,
  grammar: 5,
  vocabulary: 5,
  writing: 15,
  speaking: 20,
  scenario: 20,
  reading: 5,
  reflection: 2,
  bonus: 2
}

const SECTION_LABELS: Record<string, string> = {
  mistakes: 'Seção 1: Corrigir Erros (Correct Your Mistakes)',
  grammar: 'Seção 2: Prática Gramatical (Grammar Practice)',
  vocabulary: 'Seção 3: Reforço Vocabular (Vocabulary Reinforcement)',
  writing: 'Seção 4: Desafio de Escrita (Writing Challenge)',
  speaking: 'Seção 5: Desafio de Fala com IA (AI Speaking Challenge)',
  scenario: 'Seção 6: Prática de Cenário (Scenario Practice)',
  reading: 'Seção 7: Compreensão Leitora (Reading Comprehension)',
  reflection: 'Seção 8: Perguntas de Reflexão (Reflection)',
  bonus: 'Seção 9: Missão Bônus (Bonus XP)'
}

export function HomeworkManager({ sessionId, patientId, psychologistId }: { sessionId: string, patientId: string, psychologistId: string }) {
  const [loading, setLoading] = useState(false)
  const [homework, setHomework] = useState<any>(null)

  // Config de geração
  const [template, setTemplate] = useState<string>('standard')
  const [difficulty, setDifficulty] = useState<string>('adaptive')
  const [enabledSections, setEnabledSections] = useState<string[]>([
    'mistakes', 'grammar', 'vocabulary', 'writing', 'reflection'
  ])

  // Edição inline
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<any>({
    title: '',
    question: '',
    answer: '',
    explanation: '',
    section: '',
    type: 'grammar'
  })

  useEffect(() => {
    const fetchHomework = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('homework_plans')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle()
        
        if (error) throw error
        if (data) {
          setHomework(data)
        }
      } catch (err) {
        console.error("Failed to fetch existing homework:", err)
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchHomework()
    }
  }, [sessionId])

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await StudentEngine.generateHomework(sessionId, patientId, psychologistId, {
        template,
        difficulty,
        enabledSections
      })
      setHomework(res.plan)
    } catch (err: any) {
      console.error("Failed to generate homework", err)
      alert("Erro ao gerar exercícios: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!homework?.id) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('homework_plans')
        .update({ status: 'PUBLISHED' })
        .eq('id', homework.id)
      
      if (error) throw error
      
      setHomework({ ...homework, status: 'PUBLISHED' })
      alert('Exercícios publicados com sucesso para o aluno!')
    } catch (err: any) {
      console.error("Failed to publish homework", err)
      alert("Erro ao publicar: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (idx: number, ex: any) => {
    setEditingIndex(idx)
    setEditForm({ ...ex })
  }

  const handleSaveEdit = async (idx: number) => {
    if (!homework) return
    const updatedExercises = [...homework.exercises]
    updatedExercises[idx] = { ...editForm }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('homework_plans')
        .update({ exercises: updatedExercises })
        .eq('id', homework.id)

      if (error) throw error

      setHomework({ ...homework, exercises: updatedExercises })
      setEditingIndex(null)
    } catch (err: any) {
      console.error("Failed to save edited exercise:", err)
      alert("Erro ao salvar edição: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExercise = async (idx: number) => {
    if (!homework || !window.confirm("Deseja realmente remover esta questão do plano?")) return
    const updatedExercises = homework.exercises.filter((_: any, i: number) => i !== idx)

    setLoading(true)
    try {
      const { error } = await supabase
        .from('homework_plans')
        .update({ exercises: updatedExercises })
        .eq('id', homework.id)

      if (error) throw error

      setHomework({ ...homework, exercises: updatedExercises })
    } catch (err: any) {
      console.error("Failed to delete exercise:", err)
      alert("Erro ao deletar questão: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSection = (sec: string) => {
    setEnabledSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    )
  }

  const creditCost = enabledSections.reduce((sum, sec) => sum + (SECTION_METRIC_COSTS[sec] || 0), 0)

  // LOADING SCREEN
  if (loading && !homework) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-gray-150 shadow-sm flex flex-col items-center justify-center font-urbanist max-w-4xl mx-auto">
        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Analisando eventos e gerando exercícios adaptativos...</h3>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos.</p>
      </div>
    )
  }

  // CONFIGURATION SCREEN (Homework is null)
  if (!homework) {
    return (
      <div className="bg-white border border-slate-200/80 shadow-md rounded-[32px] p-6 md:p-8 font-urbanist max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Flowike Homework Engine 2.0
          </h3>
          <p className="text-slate-500 text-sm mt-1">Configure o plano de estudos adaptativo para a semana do aluno.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Col 1 - Template & Dificuldade */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Template de Lição</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              >
                <option value="quick">Quick Homework (10-15 min)</option>
                <option value="standard">Standard Homework (20-30 min)</option>
                <option value="intensive">Intensive Homework (45-60 min)</option>
                <option value="business">Business English Focus</option>
                <option value="speaking">Speaking Intensive Focus</option>
                <option value="exam_prep">Exam Preparation (IELTS/TOEFL)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nível de Dificuldade</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              >
                <option value="adaptive">Adaptativo (Baseado no histórico do aluno)</option>
                <option value="easy">Iniciante / Fácil (Foco em confiança)</option>
                <option value="medium">Intermediário / Médio</option>
                <option value="hard">Avançado / Difícil (Foco em complexidade)</option>
              </select>
            </div>

            {/* Crédito display */}
            <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase block tracking-wider">Custo Estimado</span>
                  <span className="text-slate-700 text-sm font-semibold">Créditos de IA consumidos</span>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-700">{creditCost}</span>
            </div>
          </div>

          {/* Col 2 - Seleção de Seções */}
          <div className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Seções Habilitadas</label>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {Object.keys(SECTION_LABELS).map((secKey) => (
                <label key={secKey} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={enabledSections.includes(secKey)}
                    onChange={() => handleToggleSection(secKey)}
                    className="w-4 h-4 text-emerald-600 border-slate-350 rounded focus:ring-emerald-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <div className="text-xs font-semibold text-slate-700">
                    {SECTION_LABELS[secKey]}
                    <span className="text-[10px] text-slate-400 font-bold block">
                      +{SECTION_METRIC_COSTS[secKey]} créditos
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleGenerate}
            disabled={enabledSections.length === 0}
            className="w-full md:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Gerar Homework Adaptativo
          </button>
        </div>
      </div>
    )
  }

  // REVIEW & EDIT SCREEN
  const isPublished = homework.status === 'PUBLISHED'
  const timeEstimateTotal = homework.exercises?.reduce((sum: number, ex: any) => sum + (ex.time_estimate || 2), 0) || 0
  const xpRewardTotal = homework.exercises?.reduce((sum: number, ex: any) => sum + (ex.xp_reward || 15), 0) || 0

  return (
    <div className="bg-white border border-slate-200/80 shadow-md rounded-[32px] p-6 md:p-8 font-urbanist max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Plano de Exercícios
          </h3>
          <p className="text-slate-500 text-xs mt-1">Revisão e publicação das atividades de fixação semanais.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Metadados rápidos */}
          <div className="flex gap-2">
            <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {timeEstimateTotal} min
            </div>
            <div className="bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-purple-700 font-semibold">
              <Award className="w-3.5 h-3.5 text-purple-500" /> {xpRewardTotal} XP
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublished}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm",
              isPublished 
                ? "bg-emerald-100 text-emerald-700 cursor-not-allowed border border-emerald-200/60" 
                : "bg-slate-900 text-white hover:bg-emerald-800 hover:shadow-md"
            )}
          >
            <CheckCircle className="w-4 h-4 mr-2" /> 
            {isPublished ? 'Publicado' : 'Publicar para Aluno'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {homework.exercises?.map((ex: any, idx: number) => {
          const isEditing = editingIndex === idx

          return (
            <div key={idx} className="border border-slate-200/60 rounded-[20px] p-5 hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              
              {isEditing ? (
                // FORMULARIO DE EDIÇÃO INLINE
                <div className="space-y-4 pl-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Título</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo (min)</label>
                        <input
                          type="number"
                          value={editForm.time_estimate}
                          onChange={(e) => setEditForm({ ...editForm, time_estimate: parseInt(e.target.value) || 2 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">XP</label>
                        <input
                          type="number"
                          value={editForm.xp_reward}
                          onChange={(e) => setEditForm({ ...editForm, xp_reward: parseInt(e.target.value) || 15 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instrução / Pergunta</label>
                    <textarea
                      value={editForm.question}
                      onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gabarito / Modelo Esperado</label>
                    <textarea
                      value={editForm.answer}
                      onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Explicação Didática</label>
                    <textarea
                      value={editForm.explanation}
                      onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingIndex(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                // VISUALIZAÇÃO PADRÃO DO EXERCÍCIO
                <div className="pl-2 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {ex.section || 'Geral'}
                      </span>
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                        ex.type === 'grammar' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                        ex.type === 'vocabulary' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      )}>
                        {ex.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        ({ex.time_estimate || 2} min • +{ex.xp_reward || 15} XP)
                      </span>
                    </div>

                    {!isPublished && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(idx, ex)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Editar questão"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg transition-colors"
                          title="Excluir questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{ex.title || 'Exercício Adaptativo'}</h4>
                    <p className="text-slate-650 text-sm leading-relaxed">{ex.question}</p>
                  </div>

                  <div className="bg-slate-50/60 rounded-xl p-4 text-xs font-medium text-slate-700 border border-slate-100 space-y-2">
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-0.5">Gabarito Esperado:</span>
                      <p className="text-slate-800 font-semibold">{ex.answer}</p>
                    </div>
                    {ex.explanation && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Explicação Didática:</span>
                        <p className="text-slate-500 font-mediumLeading leading-relaxed">{ex.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
