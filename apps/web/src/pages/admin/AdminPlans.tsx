import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Sparkles, Edit, Copy, Layers, Loader2, Users, Brain, Archive
} from 'lucide-react'

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form State
  const [isEditing, setIsEditing] = useState(false)
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('59')
  const [studentLimit, setStudentLimit] = useState('10')
  const [includedCredits, setIncludedCredits] = useState('8000')
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: plansData } = await supabase
        .from('plans')
        .select('*, plan_features(feature_id)')
        .order('price', { ascending: true })

      const { data: feats } = await supabase
        .from('features')
        .select('*')
        .order('id', { ascending: true })

      setPlans(plansData || [])
      setFeatures(feats || [])
    } catch (err) {
      console.error('Error fetching admin plans:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setIsEditing(false)
    setEditPlanId(null)
    setName('')
    setPrice('59')
    setStudentLimit('10')
    setIncludedCredits('8000')
    setBillingCycle('monthly')
    setSelectedFeatures([])
  }

  const handleEditClick = (plan: any) => {
    setIsEditing(true)
    setEditPlanId(plan.id)
    setName(plan.name)
    setPrice(String(plan.price))
    setStudentLimit(String(plan.student_limit))
    setIncludedCredits(String(plan.included_credits))
    setBillingCycle(plan.billing_cycle)
    setSelectedFeatures(plan.plan_features.map((f: any) => f.feature_id))
  }

  const handleFeatureToggle = (fid: string) => {
    setSelectedFeatures(prev => 
      prev.includes(fid) ? prev.filter(id => id !== fid) : [...prev, fid]
    )
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || !studentLimit || !includedCredits) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    setSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const action = isEditing ? 'edit_plan' : 'create_plan'
      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action,
          planId: editPlanId,
          name,
          price,
          studentLimit,
          includedCredits,
          billingCycle,
          featureIds: selectedFeatures
        })
      })

      if (res.ok) {
        alert(isEditing ? 'Plano atualizado com sucesso!' : 'Novo plano criado com sucesso!')
        resetForm()
        loadData()
      } else {
        const err = await res.json()
        alert('Erro ao salvar plano: ' + err.error)
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDuplicatePlan = async (planId: string) => {
    if (!confirm('Deseja realmente duplicar este plano?')) return
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
          action: 'duplicate_plan',
          planId
        })
      })

      if (res.ok) {
        alert('Plano duplicado com sucesso!')
        loadData()
      } else {
        const err = await res.json()
        alert('Erro ao duplicar: ' + err.error)
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    }
  }

  const handleArchivePlan = async (planId: string) => {
    if (!confirm('Deseja arquivar este plano? Ele não estará mais visível para novos professores.')) return
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
          action: 'archive_plan',
          planId
        })
      })

      if (res.ok) {
        alert('Plano arquivado com sucesso!')
        loadData()
      } else {
        const err = await res.json()
        alert('Erro ao arquivar: ' + err.error)
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-800 font-sans select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-850 tracking-tight flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-rose-500" /> Gestão de Planos SaaS
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Configure os planos do seu SaaS, definindo limites de assentos de alunos, créditos incluídos e recursos ativos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form Container */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 self-start">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
            {isEditing ? 'Editar Plano' : 'Criar Novo Plano'}
          </h3>

          <form onSubmit={handleSavePlan} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do Plano</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Growth" 
                className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Preço ($ / mês)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="129" 
                    className="w-full pl-7 pr-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Ciclo Cobrança</label>
                <select 
                  value={billingCycle} 
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Limite Assentos</label>
                <input 
                  type="number" 
                  value={studentLimit} 
                  onChange={(e) => setStudentLimit(e.target.value)} 
                  placeholder="25" 
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Créditos Inclusos</label>
                <input 
                  type="number" 
                  value={includedCredits} 
                  onChange={(e) => setIncludedCredits(e.target.value)} 
                  placeholder="20000" 
                  className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Recursos Ativados</label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 no-scrollbar bg-slate-50">
                {features.map((feat) => (
                  <label key={feat.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedFeatures.includes(feat.id)}
                      onChange={() => handleFeatureToggle(feat.id)}
                      className="accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-650 truncate" title={feat.description}>{feat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-450 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Plano'}
              </button>
              {isEditing && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Plans List */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider px-1">Planos Ativos</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div key={p.id} className={`bg-white p-6 rounded-3xl border ${p.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50 opacity-60'} shadow-sm relative overflow-hidden flex flex-col justify-between space-y-5 transition-transform hover:-translate-y-0.5`}>
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-black text-slate-800 tracking-tight">{p.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">{p.billing_cycle}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-850">${p.price}</span>
                      <span className="text-[9px] text-slate-450 font-bold block">USD / mês</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{p.student_limit} alunos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Brain className="w-4 h-4 text-slate-400" />
                      <span>{p.included_credits} créditos</span>
                    </div>
                  </div>

                  <div className="mt-4.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recursos:</span>
                    <div className="flex flex-wrap gap-1">
                      {p.plan_features?.map((pf: any) => {
                        const originalFeat = features.find(f => f.id === pf.feature_id)
                        return (
                          <span key={pf.feature_id} className="bg-slate-100 text-slate-600 font-bold text-[8px] px-2 py-0.5 rounded-full uppercase" title={originalFeat?.description}>
                            {originalFeat?.name || pf.feature_id}
                          </span>
                        )
                      })}
                      {p.plan_features?.length === 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Nenhum recurso associado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => handleEditClick(p)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 font-extrabold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-450" /> Editar
                  </button>
                  <button 
                    onClick={() => handleDuplicatePlan(p.id)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 p-2 rounded-xl transition-colors"
                    title="Duplicar Plano"
                  >
                    <Copy className="w-4 h-4 text-slate-450" />
                  </button>
                  {p.active && (
                    <button 
                      onClick={() => handleArchivePlan(p.id)}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 p-2 rounded-xl transition-colors"
                      title="Arquivar Plano"
                    >
                      <Archive className="w-4 h-4 text-rose-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
