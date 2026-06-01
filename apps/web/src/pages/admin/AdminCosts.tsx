import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Zap, Save, Loader2, Check, Info
} from 'lucide-react'

export default function AdminCosts() {
  const [costs, setCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changedCosts, setChangedCosts] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const loadCosts = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('feature_costs')
        .select('*')
        .order('id', { ascending: true })
      setCosts(data || [])
    } catch (err) {
      console.error('Error fetching feature costs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCosts()
  }, [])

  const handleCostChange = (id: string, value: string) => {
    setChangedCosts(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSaveCosts = async (e: React.FormEvent) => {
    e.preventDefault()
    const updates = Object.entries(changedCosts).map(([id, cost]) => ({ id, cost }))
    if (updates.length === 0) return

    setSaving(true)
    setSuccess(false)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'update_feature_costs',
          costs: updates
        })
      })

      if (res.ok) {
        setSuccess(true)
        setChangedCosts({})
        loadCosts()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const err = await res.json()
        alert('Erro ao atualizar custos: ' + err.error)
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getImpactPreview = (original: number, updatedStr: string) => {
    const updated = parseInt(updatedStr, 10)
    if (isNaN(updated)) return null
    const diff = updated - original
    if (diff === 0) return null
    return (
      <span className={`text-[10px] font-bold ${diff > 0 ? 'text-amber-600' : 'text-emerald-600'} block mt-0.5`}>
        {diff > 0 ? `+${diff}` : diff} créditos de IA por chamada
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-850 tracking-tight flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-rose-500 animate-bounce" /> Gestão de Custos de Créditos
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">Ajuste os preços das chamadas de IA para cada funcionalidade da plataforma. O consumo reflete em tempo real na carteira dos professores.</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-55 text-emerald-800 border border-emerald-200 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          Tabela de custos de IA atualizada e aplicada globalmente!
        </div>
      )}

      <form onSubmit={handleSaveCosts} className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          
          {costs.map((feat) => {
            const currentCost = changedCosts[feat.id] !== undefined ? changedCosts[feat.id] : String(feat.cost)
            
            return (
              <div key={feat.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                
                {/* Info */}
                <div className="space-y-1 max-w-xl">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    {feat.name}
                  </h3>
                  <p className="text-xs text-slate-450 font-medium leading-relaxed">
                    {feat.id === 'audio_transcription' ? 'AssemblyAI audio speech-to-text processing.' :
                     feat.id === 'homework_generation' ? 'Llama-3 model based homework builder prompt.' :
                     feat.id === 'lesson_analysis' ? 'Pedagogical feedback summaries and student error mapping.' :
                     feat.id === 'scenario_practice' ? 'Interactive Groq chatbot audio interface conversation.' :
                     `AI engine execution for feature: ${feat.id}`}
                  </p>
                </div>

                {/* Input cost */}
                <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] text-slate-400 font-bold block">Valor Atual</span>
                    <span className="text-xs font-bold text-slate-600">{feat.cost} créditos</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="relative flex items-center">
                      <input 
                        type="number"
                        min="1"
                        max="200"
                        value={currentCost}
                        onChange={(e) => handleCostChange(feat.id, e.target.value)}
                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-black focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                      />
                      <span className="text-[10px] text-slate-400 font-bold ml-2">Créditos</span>
                    </div>
                    {getImpactPreview(feat.cost, currentCost)}
                  </div>
                </div>

              </div>
            )
          })}
        </div>

        {/* Global actions */}
        <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-3xl">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Alterações pendentes: <strong>{Object.keys(changedCosts).length}</strong></span>
          </div>

          <button
            type="submit"
            disabled={saving || Object.keys(changedCosts).length === 0}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-350 text-white font-extrabold px-6 py-2.5 rounded-2xl text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Aplicar Custos Globalmente</span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  )
}
