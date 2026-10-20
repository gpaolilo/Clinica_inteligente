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

  const getCleanContractHtml = () => {
    const el = document.getElementById('printable-contract-document')
    return el ? el.innerHTML : ''
  }

  // 1. Download standalone HTML contract file
  const handleDownloadFile = () => {
    const contractHtml = getCleanContractHtml()
    if (!contractHtml) return

    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato de Prestação de Serviços - ${effectiveStudentName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    .contract-page { page-break-after: always; max-width: 800px; margin: 0 auto 32px auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .contract-page:last-child { page-break-after: auto; margin-bottom: 0; }
    @media print {
      body { background: #fff; padding: 0; }
      .contract-page { box-shadow: none; border-radius: 0; margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  ${contractHtml}
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contrato_Prestacao_Servicos_${effectiveStudentName.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 2. Print or Save as PDF via clean dedicated window (zero website chrome)
  const handlePrint = () => {
    const contractHtml = getCleanContractHtml()
    if (!contractHtml) {
      window.print()
      return
    }

    const printWin = window.open('', '_blank', 'width=950,height=900')
    if (!printWin) {
      window.print()
      return
    }

    printWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Contrato de Prestação de Serviços - ${effectiveStudentName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; margin: 0; padding: 12px; }
    .contract-page { page-break-after: always; padding: 20px; margin-bottom: 24px; }
    .contract-page:last-child { page-break-after: auto; margin-bottom: 0; }
    img { max-width: 100%; height: auto; }
    @media print {
      body { padding: 0; }
      .contract-page { padding: 10mm; margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body class="bg-white">
  ${contractHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`)
    printWin.document.close()
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
          <div id="printable-contract-document" className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
