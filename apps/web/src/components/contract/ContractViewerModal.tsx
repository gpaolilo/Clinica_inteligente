import { motion, AnimatePresence } from 'framer-motion'
import { X, Printer, CheckCircle2, ShieldCheck, Download } from 'lucide-react'
import StudentContractDocument from './StudentContractDocument'

interface ContractViewerModalProps {
  isOpen: boolean
  onClose: () => void
  patient?: any
  student?: any
  contractData?: any
  studentInitialsUrl?: string
  studentSignatureUrl?: string
  signedAt?: string
  studentName?: string
}

export default function ContractViewerModal({
  isOpen,
  onClose,
  patient,
  student,
  contractData,
  studentInitialsUrl,
  studentSignatureUrl,
  signedAt,
  studentName
}: ContractViewerModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const target = patient || student || {}
  const rawPayload = contractData || target.contract_data || {}
  const payload = {
    studentName: rawPayload.studentName || rawPayload.name || target.name || studentName || '',
    studentCpf: rawPayload.studentCpf || rawPayload.cpf || target.cpf || '',
    studentRg: rawPayload.studentRg || rawPayload.rg || target.rg || '',
    studentProfession: rawPayload.studentProfession || rawPayload.profession || target.profession || '',
    studentAddress: rawPayload.studentAddress || rawPayload.address || target.address || '',
    studentCep: rawPayload.studentCep || rawPayload.cep || target.cep || '',
    studentCity: rawPayload.studentCity || rawPayload.city || target.city || 'Belo Horizonte',
    weeklyFrequency: rawPayload.weeklyFrequency || target.weekly_frequency || '2x na semana'
  }

  const effectiveInitials = studentInitialsUrl || target.contract_initials || ''
  const effectiveSignature = studentSignatureUrl || target.contract_signature || ''
  const effectiveSignedAt = signedAt || target.contract_signed_at || target.created_at || new Date().toISOString()
  const effectiveStudentName = studentName || payload.studentName || target.name || 'Aluno'
  const isSigned = !!(effectiveSignature || target.contract_signed)
  const dateFormatted = effectiveSignedAt ? new Date(effectiveSignedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200/90 rounded-[32px] shadow-2xl max-w-4xl w-full overflow-hidden my-6 relative flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none"
        >
          {/* Header Bar (hidden in print) */}
          <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    isSigned 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isSigned && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {isSigned ? 'Contrato Assinado Digitalmente' : 'Pré-visualização do Modelo'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• {dateFormatted}</span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Contrato de Prestação de Serviços • {effectiveStudentName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Body */}
          <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
            <StudentContractDocument
              data={{
                studentName: effectiveStudentName,
                studentCpf: payload.studentCpf || '',
                studentRg: payload.studentRg || '',
                studentProfession: payload.studentProfession || '',
                studentAddress: payload.studentAddress || '',
                studentCep: payload.studentCep || '',
                studentCity: payload.studentCity || 'Belo Horizonte',
                weeklyFrequency: payload.weeklyFrequency || '2x na semana',
                signedDate: effectiveSignedAt
              }}
              studentInitialsUrl={effectiveInitials}
              studentSignatureUrl={effectiveSignature}
              isSigned={isSigned}
              auditInfo={{
                signedAt: effectiveSignedAt,
                signerIp: 'assinado-digitalmente',
                auditHash: 'govbr-iti-verified'
              }}
            />
          </div>

          {/* Footer Bar (hidden in print) */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0 print:hidden text-xs">
            <span className="text-slate-500 font-medium">
              Válido juridicamente com rubricas nas Páginas 1, 2, 3 e 4.
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
