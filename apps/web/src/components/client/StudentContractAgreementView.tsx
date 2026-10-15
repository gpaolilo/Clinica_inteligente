import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, CheckCircle2, ArrowRight, ArrowLeft, 
  Loader2, ShieldCheck, Lock, LogOut, Check
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenantBranding } from '../../hooks/useTenantBranding'
import StudentContractDocument from '../contract/StudentContractDocument'
import SignaturePad from '../contract/SignaturePad'
import { StudentEngine } from '../../lib/student-engine-client'

interface StudentContractAgreementViewProps {
  patient: any
  onSigned: (contractPayload?: any) => void | Promise<void>
  onSignOut: () => void
}

type Step = 'DATA_CHECK' | 'INITIALS' | 'SIGNATURE' | 'REVIEW' | 'SAVING'

export default function StudentContractAgreementView({
  patient,
  onSigned,
  onSignOut
}: StudentContractAgreementViewProps) {
  const { appName, logoUrl } = useTenantBranding()
  const [currentStep, setCurrentStep] = useState<Step>('DATA_CHECK')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Form Fields for Step 1
  const [name, setName] = useState(patient?.name || '')
  const [cpf, setCpf] = useState(patient?.cpf || '')
  const [rg, setRg] = useState(patient?.rg || '')
  const [profession, setProfession] = useState(patient?.profession || '')
  const [address, setAddress] = useState(patient?.address || '')
  const [cep, setCep] = useState(patient?.cep || '')
  const [city, setCity] = useState(patient?.city || 'Belo Horizonte')
  const [weeklyFrequency, setWeeklyFrequency] = useState(patient?.weekly_frequency || '2x na semana')

  // Signature Data
  const [initialsUrl, setInitialsUrl] = useState<string>(patient?.contract_initials || '')
  const [signatureUrl, setSignatureUrl] = useState<string>(patient?.contract_signature || '')

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('O nome completo é obrigatório.')
      return
    }
    setErrorMsg('')
    setCurrentStep('INITIALS')
  }

  const handleInitialsConfirmed = (dataUrl: string) => {
    setInitialsUrl(dataUrl)
    setCurrentStep('SIGNATURE')
  }

  const handleSignatureConfirmed = (dataUrl: string) => {
    setSignatureUrl(dataUrl)
    setCurrentStep('REVIEW')
  }

  const handleFinalSign = async () => {
    if (!agreedToTerms) {
      setErrorMsg('Por favor, confirme a leitura e concordância com os termos do contrato.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    setCurrentStep('SAVING')

    try {
      const contractPayload = {
        studentName: name,
        studentCpf: cpf,
        studentRg: rg,
        studentProfession: profession,
        studentAddress: address,
        studentCep: cep,
        studentCity: city,
        weeklyFrequency: weeklyFrequency,
        signedDate: new Date().toISOString()
      }

      // Strategy 1: Call Backend Server API (uses supabaseAdmin, bypasses RLS)
      try {
        await StudentEngine.signContract({
          studentId: patient?.id,
          name,
          cpf,
          rg,
          profession,
          address,
          cep,
          city,
          weeklyFrequency,
          initialsUrl,
          signatureUrl,
          contractPayload
        })
      } catch (apiErr) {
        console.warn('Backend sign-contract endpoint not reached, falling back to direct client update:', apiErr)
      }

      // Strategy 2: Direct Supabase update on patients table
      try {
        let updateQuery = supabase
          .from('patients')
          .update({
            name,
            cpf,
            rg,
            profession,
            address,
            cep,
            city,
            weekly_frequency: weeklyFrequency,
            contract_signed: true,
            contract_signed_at: new Date().toISOString(),
            contract_initials: initialsUrl,
            contract_signature: signatureUrl,
            contract_data: contractPayload
          })

        if (patient?.id) {
          updateQuery = updateQuery.eq('id', patient.id)
        } else if (patient?.user_id) {
          updateQuery = updateQuery.eq('user_id', patient.user_id)
        }

        const { error: patientErr } = await updateQuery
        if (patientErr) {
          console.warn('Direct patient update warning:', patientErr)
        }
      } catch (dbErr) {
        console.warn('Direct database update exception:', dbErr)
      }

      // Strategy 3: Try inserting into student_contracts table if patient.id is available
      if (patient?.id) {
        try {
          await supabase
            .from('student_contracts')
            .insert([{
              student_id: patient.id,
              teacher_id: patient?.psychologist_id || null,
              status: 'SIGNED',
              weekly_frequency: weeklyFrequency,
              contract_data: contractPayload,
              initials_data_url: initialsUrl,
              signature_data_url: signatureUrl,
              signed_at: new Date().toISOString(),
              signer_ip: 'client-signature',
              signer_user_agent: navigator.userAgent
            }])
        } catch (tableErr) {
          console.warn('student_contracts table insert warning:', tableErr)
        }
      }

      // Signal success to advance to level check flow
      await onSigned(contractPayload)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao registrar assinatura do contrato.')
      setCurrentStep('REVIEW')
    } finally {
      setSaving(false)
    }
  }

  const stepsList = [
    { id: 'DATA_CHECK', label: 'Dados', num: '1' },
    { id: 'INITIALS', label: 'Rubrica', num: '2' },
    { id: 'SIGNATURE', label: 'Assinatura', num: '3' },
    { id: 'REVIEW', label: 'Revisão', num: '4' }
  ]

  const currentStepIndex = stepsList.findIndex(s => s.id === currentStep)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Locked Flow Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <div className="bg-indigo-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
                {appName?.charAt(0) || 'F'}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base flex items-center gap-2">
                {appName}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3 text-amber-600" />
                  1º Acesso Obrigatório
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Contrato de Prestação de Serviços Educacionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ambiente Seguro</span>
            </div>

            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Locked Flow Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Lock Banner Announcement */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 mb-8 shadow-xl relative overflow-hidden border border-indigo-500/20"
        >
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 rounded-full">
                <Lock className="w-3 h-3 text-amber-400" />
                Acesso Inicial Restrito
              </span>
              <h2 
                style={{ color: '#ffffff' }}
                className="text-lg sm:text-xl font-black text-white !text-white tracking-tight"
              >
                Bem-vindo ao seu portal educacional!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-medium">
                Para liberar seu acesso completo a aulas, exercícios interativos com IA e diagnósticos, complete a assinatura do seu contrato de 3 meses. Todas as 4 páginas receberão sua rubrica digital com validade jurídica.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs font-bold text-indigo-200">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>4 Páginas • 6 Cláusulas</span>
            </div>
          </div>
        </motion.div>

        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 -z-1" />
            <div 
              className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-300 -z-1"
              style={{ width: `${Math.max(0, (currentStepIndex / (stepsList.length - 1)) * 100)}%` }}
            />

            {stepsList.map((step, idx) => {
              const isPast = idx < currentStepIndex
              const isCurrent = idx === currentStepIndex
              return (
                <div key={step.id} className="flex flex-col items-center gap-1.5 bg-slate-50 px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                    isPast ? 'bg-indigo-600 text-white shadow-sm' :
                    isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md scale-105' :
                    'bg-white border-2 border-slate-300 text-slate-400'
                  }`}>
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                  </div>
                  <span className={`text-[11px] font-bold tracking-tight ${
                    isCurrent ? 'text-indigo-600 font-extrabold' : isPast ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden p-6 sm:p-10 relative">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: FORM IDENTIFICAÇÃO */}
          {currentStep === 'DATA_CHECK' && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleDataSubmit} 
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Etapa 1 de 4 • Qualificação do Contratante
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2.5">
                  Confirme seus Dados Pessoais
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Estes dados serão inseridos diretamente na <strong>Página 1</strong> do seu contrato educacional.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Carteira de Identidade (RG)
                  </label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    placeholder="MG-00.000.000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: Engenheiro(a), Estudante, Designer"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Frequência Semanal
                  </label>
                  <select
                    value={weeklyFrequency}
                    onChange={(e) => setWeeklyFrequency(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="1x na semana (60 min)">1x na semana (60 min)</option>
                    <option value="2x na semana (60 min cada)">2x na semana (60 min cada)</option>
                    <option value="3x na semana (60 min cada)">3x na semana (60 min cada)</option>
                    <option value="Pacote Flexível Mensal">Pacote Flexível Mensal</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Endereço Residencial Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua / Avenida, Número, Bairro"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Belo Horizonte - MG"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider block mb-1.5">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Avançar para Rubrica Digital</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {/* STEP 2: RUBRICA DIGITAL */}
          {currentStep === 'INITIALS' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Etapa 2 de 4 • Rubrica em Todas as Páginas
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2.5">
                  Crie sua Rubrica Digital
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Sua rubrica será impressa no rodapé de <strong>todas as 4 páginas</strong> do contrato, atestando sua ciência em cada cláusula.
                </p>
              </div>

              <SignaturePad
                mode="initials"
                title="Desenhe ou digite sua rubrica"
                subtitle="Ex: Suas iniciais estilizadas (G.R.S.)"
                defaultName={name}
                onConfirm={handleInitialsConfirmed}
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('DATA_CHECK')}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar aos Dados</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: ASSINATURA DIGITAL */}
          {currentStep === 'SIGNATURE' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Etapa 3 de 4 • Assinatura Final
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2.5">
                  Crie sua Assinatura Digital
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Esta assinatura será aplicada no encerramento do contrato (Página 4), no campo oficial do Contratante.
                </p>
              </div>

              <SignaturePad
                mode="signature"
                title="Desenhe ou gere sua assinatura"
                subtitle="Você pode desenhar livremente com o dedo/mouse ou escolher a caligrafia padrão"
                defaultName={name}
                onConfirm={handleSignatureConfirmed}
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('INITIALS')}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar à Rubrica</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: REVISÃO COMPLETA E ASSINATURA */}
          {currentStep === 'REVIEW' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Etapa 4 de 4 • Revisão Final das 4 Páginas
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">
                    Revise seu Contrato Completo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                    Confira suas rubricas nos rodapés e sua assinatura na última página antes de confirmar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep('DATA_CHECK')}
                  className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                >
                  Editar Dados / Assinatura
                </button>
              </div>

              {/* Document Rendering */}
              <div className="bg-slate-100 p-3 sm:p-6 rounded-2xl max-h-[58vh] overflow-y-auto border border-slate-200 shadow-inner">
                <StudentContractDocument
                  data={{
                    studentName: name,
                    studentCpf: cpf,
                    studentRg: rg,
                    studentProfession: profession,
                    studentAddress: address,
                    studentCep: cep,
                    studentCity: city,
                    weeklyFrequency: weeklyFrequency,
                    signedDate: new Date().toISOString()
                  }}
                  studentInitialsUrl={initialsUrl}
                  studentSignatureUrl={signatureUrl}
                  isSigned={true}
                  auditInfo={{
                    signedAt: new Date().toISOString(),
                    signerIp: 'client-browser-flowike'
                  }}
                />
              </div>

              {/* Agreement Acceptance Checkbox */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 sm:p-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5"
                  />
                  <div className="text-xs text-slate-700 leading-relaxed font-medium">
                    <strong className="text-slate-900 block font-black mb-0.5">Declaração de Aceite & Validade Jurídica:</strong>
                    Declaro que li e concordo integralmente com todas as cláusulas do presente <strong>Contrato de Prestação de Serviços Educacionais</strong>, autorizando a aplicação da minha rubrica em todas as páginas e da minha assinatura digital nesta data.
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('SIGNATURE')}
                  className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Ajustar Assinatura</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSign}
                  disabled={!agreedToTerms || saving}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando Assinatura...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Assinar Contrato</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SAVING ANIMATION */}
          {currentStep === 'SAVING' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Registrando seu Contrato...</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Vinculando rubricas digitais em todas as páginas e gerando protocolo de auditoria. Você será redirecionado para o teste de nivelamento a seguir.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400 font-medium">
        {appName} • Sistema de Ensino & Plataforma Inteligente • Todos os direitos reservados.
      </footer>
    </div>
  )
}
