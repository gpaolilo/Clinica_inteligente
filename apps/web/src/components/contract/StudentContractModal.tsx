import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, CheckCircle2, ArrowRight, ArrowLeft, 
  Sparkles, Loader2, PenTool 
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import StudentContractDocument from './StudentContractDocument'
import SignaturePad from './SignaturePad'

interface StudentContractModalProps {
  isOpen: boolean
  onClose?: () => void
  student?: any
  patient?: any
  onContractSigned?: (contractData: any) => void
  onSigned?: () => void
}

type Step = 'DATA_CHECK' | 'INITIALS' | 'SIGNATURE' | 'REVIEW' | 'SAVING'

export default function StudentContractModal({
  isOpen,
  student,
  patient,
  onContractSigned,
  onSigned
}: StudentContractModalProps) {
  const targetStudent = student || patient
  const [currentStep, setCurrentStep] = useState<Step>('DATA_CHECK')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form Fields for Page 1
  const [name, setName] = useState(targetStudent?.name || '')
  const [cpf, setCpf] = useState(targetStudent?.cpf || '')
  const [rg, setRg] = useState(targetStudent?.rg || '')
  const [profession, setProfession] = useState(targetStudent?.profession || '')
  const [address, setAddress] = useState(targetStudent?.address || '')
  const [cep, setCep] = useState(targetStudent?.cep || '')
  const [city, setCity] = useState(targetStudent?.city || 'Belo Horizonte')
  const [weeklyFrequency, setWeeklyFrequency] = useState(targetStudent?.weekly_frequency || '2x na semana')

  // Signature Data
  const [initialsUrl, setInitialsUrl] = useState<string>('')
  const [signatureUrl, setSignatureUrl] = useState<string>('')

  if (!isOpen) return null

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

      // 1. Update patient records with contract info
      const { error: patientErr } = await supabase
        .from('patients')
        .update({
          name,
          cpf,
          rg,
          profession,
          address,
          cep,
          city,
          contract_signed: true,
          contract_signed_at: new Date().toISOString(),
          contract_initials: initialsUrl,
          contract_signature: signatureUrl,
          contract_data: contractPayload
        })
        .eq('id', targetStudent?.id)

      if (patientErr) {
        console.warn('Patient update error:', patientErr)
      }

      // 2. Try inserting into student_contracts table if table exists
      try {
        await supabase
          .from('student_contracts')
          .insert([{
            student_id: targetStudent?.id,
            teacher_id: targetStudent?.psychologist_id || null,
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
        console.warn('student_contracts table not yet migrated, saved to patient record:', tableErr)
      }

      if (onContractSigned) {
        onContractSigned({
          ...contractPayload,
          initialsUrl,
          signatureUrl
        })
      }
      if (onSigned) {
        onSigned()
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao salvar contrato assinado.')
      setCurrentStep('REVIEW')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-200/90 rounded-[32px] shadow-2xl max-w-4xl w-full overflow-hidden my-6 relative flex flex-col max-h-[94vh]"
      >
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  1º Acesso Obrigatório
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Vigência de 3 Meses</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Contrato de Prestação de Serviços Educacionais
              </h3>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className={currentStep === 'DATA_CHECK' ? 'text-indigo-600' : 'text-slate-700'}>1. Dados</span>
            <span>→</span>
            <span className={currentStep === 'INITIALS' ? 'text-indigo-600' : 'text-slate-700'}>2. Rubrica</span>
            <span>→</span>
            <span className={currentStep === 'SIGNATURE' ? 'text-indigo-600' : 'text-slate-700'}>3. Assinatura</span>
            <span>→</span>
            <span className={currentStep === 'REVIEW' ? 'text-indigo-600' : 'text-slate-700'}>4. Revisão</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: CADASTRO DOS DADOS */}
          {currentStep === 'DATA_CHECK' && (
            <form onSubmit={handleDataSubmit} className="space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Etapa 1 de 4 • Identificação do Contratante
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Confirme seus Dados para o Contrato
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Estes dados serão preenchidos automaticamente na Página 1 do seu Contrato de Prestação de Serviços.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Carteira de Identidade (RG)
                  </label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                    placeholder="MG-00.000.000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Ex: Engenheiro(a), Estudante"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Frequência Semanal de Aulas (Cláusula 2ª)
                  </label>
                  <select
                    value={weeklyFrequency}
                    onChange={(e) => setWeeklyFrequency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1x na semana">1x na semana</option>
                    <option value="2x na semana">2x na semana (Padrão)</option>
                    <option value="3x na semana">3x na semana</option>
                    <option value="4x na semana">4x na semana</option>
                    <option value="5x na semana">5x na semana</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Endereço Completo (Rua, Número, Bairro)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua Exemplo, 123, Bairro Centro"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                    Cidade - UF
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Belo Horizonte - MG"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Confirmar Dados e Criar Rubrica</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CAPTURA DA RUBRICA */}
          {currentStep === 'INITIALS' && (
            <div className="space-y-6 max-w-xl mx-auto py-2">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Etapa 2 de 4 • Rubrica de Páginas
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Crie sua Rubrica Digital
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Conforme exigência contratual, <strong>todas as 4 páginas</strong> receberão sua rubrica no rodapé. Desenhe suas iniciais abaixo ou digite para gerar automaticamente.
                </p>
              </div>

              <SignaturePad
                title="Sua Rubrica / Iniciais"
                subtitle="Esta rubrica será aplicada nas Páginas 1, 2, 3 e 4 do contrato."
                defaultName={name}
                mode="initials"
                onConfirm={handleInitialsConfirmed}
              />

              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('DATA_CHECK')}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar aos dados</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CAPTURA DA ASSINATURA COMPLETA */}
          {currentStep === 'SIGNATURE' && (
            <div className="space-y-6 max-w-xl mx-auto py-2">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Etapa 3 de 4 • Assinatura Final
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Assine seu Nome Completo
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Sua assinatura será estampada na <strong>Página 4</strong> no campo oficial do Contratante ao lado do carimbo da professora.
                </p>
              </div>

              <SignaturePad
                title="Sua Assinatura Completa"
                subtitle="Assinatura que constará no fechamento do contrato."
                defaultName={name}
                mode="signature"
                onConfirm={handleSignatureConfirmed}
              />

              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('INITIALS')}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar à rubrica</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVISÃO COMPLETA DAS 4 PÁGINAS */}
          {currentStep === 'REVIEW' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Revisão das 4 Páginas com Rubricas</h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Confira o documento completo abaixo. As rubricas já foram adicionadas em todas as páginas!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('INITIALS')}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Alterar Assinatura</span>
                  </button>
                </div>
              </div>

              {/* Render Full 4 Page Document */}
              <div className="border border-slate-200 rounded-2xl p-3 sm:p-6 bg-slate-100/60 max-h-[500px] overflow-y-auto shadow-inner">
                <StudentContractDocument
                  data={{
                    studentName: name,
                    studentCpf: cpf,
                    studentRg: rg,
                    studentProfession: profession,
                    studentAddress: address,
                    studentCep: cep,
                    studentCity: city,
                    weeklyFrequency: weeklyFrequency
                  }}
                  studentInitialsUrl={initialsUrl}
                  studentSignatureUrl={signatureUrl}
                  isSigned={true}
                />
              </div>

              {/* Final Confirm Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('SIGNATURE')}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSign}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Li e Concordo: Assinar Contrato e Liberar Aulas</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SAVING LOADER */}
          {currentStep === 'SAVING' && (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
              <h3 className="text-xl font-black text-slate-900">Registrando Contrato Eletrônico...</h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                Aplicando rubricas nas 4 páginas, gerando protocolo digital e liberando seu Teste de Nivelamento.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
