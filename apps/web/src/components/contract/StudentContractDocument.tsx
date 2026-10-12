interface ContractPartyData {
  studentName: string
  studentNationality?: string
  studentProfession?: string
  studentRg?: string
  studentCpf?: string
  studentAddress?: string
  studentCep?: string
  studentCity?: string
  weeklyFrequency?: string
  teacherName?: string
  teacherRg?: string
  teacherCpf?: string
  teacherAddress?: string
  signedDate?: string
}

interface StudentContractDocumentProps {
  data: ContractPartyData
  studentInitialsUrl?: string
  studentSignatureUrl?: string
  teacherInitialsUrl?: string
  teacherSignatureUrl?: string
  isSigned?: boolean
  auditInfo?: {
    signedAt?: string
    signerIp?: string
    auditHash?: string
  }
}

export default function StudentContractDocument({
  data,
  studentInitialsUrl,
  studentSignatureUrl,
  isSigned = false,
  auditInfo
}: StudentContractDocumentProps) {
  const currentDate = data.signedDate ? new Date(data.signedDate) : new Date()
  const day = currentDate.getDate()
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ]
  const month = monthNames[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  const freq = data.weeklyFrequency || '2x na semana'

  // Teacher defaults
  const teacher = {
    name: data.teacherName || 'Giovana Rocha Silva',
    nationality: 'brasileira',
    profession: 'Professora de Inglês',
    rg: data.teacherRg || '15.945.486',
    cpf: data.teacherCpf || '125.958.976-59',
    address: data.teacherAddress || 'Avenida Professor Mário Werneck, nº 1802, Bairro Buritis, CEP 30.455-610, Belo Horizonte – MG.'
  }

  // Common footer component for all 4 pages
  const PageFooter = ({ pageNumber }: { pageNumber: number }) => (
    <div className="mt-auto pt-6 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-serif">
      <div className="flex items-center gap-3">
        <span>Rubrica Contratada: <strong>G.R.S.</strong></span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <span>Rubrica Contratante:</span>
          {studentInitialsUrl ? (
            <img 
              src={studentInitialsUrl} 
              alt="Rubrica do Aluno" 
              className="h-7 max-w-[70px] object-contain inline-block border-b border-slate-700"
            />
          ) : (
            <span className="border-b border-dashed border-slate-400 w-16 inline-block" />
          )}
        </div>
      </div>
      <div className="font-semibold text-slate-400">
        Página {pageNumber} de 4
      </div>
    </div>
  )

  return (
    <div className="contract-document text-slate-900 font-serif text-[13.5px] leading-[1.65] space-y-8 select-text">
      
      {/* ================= PAGE 1 ================= */}
      <div className="contract-page bg-white p-8 sm:p-12 border border-slate-200/80 shadow-md rounded-2xl min-h-[920px] flex flex-col justify-between">
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-900">
              CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS
            </h1>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              AULAS PARTICULARES DE INGLÊS – VIGÊNCIA DE 3 (TRÊS) MESES
            </h2>
            <div className="w-full border-b border-slate-300 pt-3" />
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-sm tracking-wide uppercase text-slate-900">
              IDENTIFICAÇÃO DAS PARTES CONTRATANTES:
            </h3>

            <p className="text-justify leading-relaxed">
              <strong>CONTRATANTE:</strong>{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans font-semibold text-slate-800">
                {data.studentName || '________________________________________'}
              </span>
              , {data.studentNationality || 'brasileiro(a)'}, profissão{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans">
                {data.studentProfession || '____________________'}
              </span>
              , portador(a) da Carteira de Identidade nº{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans">
                {data.studentRg || '____________________'}
              </span>
              , CPF nº{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans font-semibold">
                {data.studentCpf || '____________________'}
              </span>
              , residente e domiciliado(a) à{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans">
                {data.studentAddress || '________________________________________________'}
              </span>
              , CEP{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans">
                {data.studentCep || '__________'}
              </span>
              , Cidade{' '}
              <span className="border-b border-slate-400 pb-0.5 font-sans">
                {data.studentCity || '____________________'}
              </span>
              .
            </p>

            <p className="text-justify leading-relaxed">
              <strong>CONTRATADA:</strong>{' '}
              <strong>{teacher.name}</strong>, {teacher.nationality}, {teacher.profession}, portadora da Carteira de Identidade nº <strong>{teacher.rg}</strong>, CPF nº <strong>{teacher.cpf}</strong>, residente e domiciliada na {teacher.address}
            </p>

            <p className="text-justify leading-relaxed pt-2">
              As partes acima identificadas têm entre si justo e contratado o presente <strong>Contrato de Prestação de Serviços Educacionais</strong>, que se regerá pelas cláusulas e condições a seguir descritas.
            </p>
          </div>
        </div>

        <PageFooter pageNumber={1} />
      </div>

      {/* ================= PAGE 2 ================= */}
      <div className="contract-page bg-white p-8 sm:p-12 border border-slate-200/80 shadow-md rounded-2xl min-h-[920px] flex flex-col justify-between">
        <div className="space-y-5 text-justify">
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 1ª – DO OBJETO DO CONTRATO
            </h4>
            <p>
              O presente contrato tem como objeto a prestação, pela <strong>CONTRATADA</strong> à <strong>CONTRATANTE</strong>, de aulas particulares de língua inglesa, com foco na facilitação do processo de aprendizagem, desenvolvimento da comunicação oral e escrita, bem como na elaboração de estratégias pedagógicas voltadas aos objetivos específicos da <strong>CONTRATANTE</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 2ª – DA MODALIDADE E CARGA HORÁRIA
            </h4>
            <p>
              As aulas serão realizadas à distância, por meio de plataforma online, com duração de até <strong>1 (uma) hora por aula</strong>, organizadas em pacotes mensais, conforme o número de semanas de cada mês.
            </p>
            
            <p className="mt-2 font-medium">
              A frequência semanal das aulas será definida conforme a opção assinalada abaixo:
            </p>

            <div className="pl-6 space-y-1 my-3 font-sans text-xs">
              {['1x na semana', '2x na semana', '3x na semana', '4x na semana', '5x na semana'].map((option) => {
                const isSelected = freq.toLowerCase().includes(option.slice(0, 2))
                return (
                  <div key={option} className="flex items-center gap-2.5">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                      isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-400 bg-white'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className={isSelected ? 'font-black text-slate-900' : 'text-slate-600'}>
                      {option}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 3ª – DA VIGÊNCIA E FIDELIDADE
            </h4>
            <p>
              O presente contrato terá vigência pelo prazo de <strong>3 (três) meses</strong>, iniciando-se na data de sua assinatura e encerrando-se automaticamente ao término desse período. Durante esse prazo, a <strong>CONTRATANTE</strong> concorda com a fidelidade mínima contratual, conforme condições estabelecidas neste instrumento.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 4ª – DO VALOR E DA FORMA DE PAGAMENTO
            </h4>
            <p>
              O valor referente ao pacote de aulas será cobrado mensalmente, devendo o pagamento ser efetuado no início de cada mês, admitindo-se flexibilidade para pagamento dentro da primeira semana do respectivo mês.
            </p>
            <p className="mt-1 font-semibold">
              O não pagamento poderá acarretar a suspensão das aulas até a regularização do débito.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 5ª – DA REMARCAÇÃO E REPOSIÇÃO DE AULAS
            </h4>
            <p>
              A desmarcação de aula com direito à reposição somente será permitida mediante aviso prévio de, no mínimo, <strong>24 (vinte e quatro) horas de antecedência</strong>.
            </p>
            <p className="mt-1">
              Será permitida no máximo <strong>1 (uma) reposição de aula por mês</strong>, devendo esta ocorrer dentro do mesmo mês, conforme disponibilidade da <strong>CONTRATADA</strong>.
            </p>
          </div>
        </div>

        <PageFooter pageNumber={2} />
      </div>

      {/* ================= PAGE 3 ================= */}
      <div className="contract-page bg-white p-8 sm:p-12 border border-slate-200/80 shadow-md rounded-2xl min-h-[920px] flex flex-col justify-between">
        <div className="space-y-5 text-justify">
          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 6ª – DOS FERIADOS
            </h4>
            <p>
              Em dias considerados feriados, as aulas não serão realizadas. A <strong>CONTRATADA</strong> compromete-se a remarcar as aulas, respeitando a disponibilidade da <strong>CONTRATANTE</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 7ª – DOS ATRASOS
            </h4>
            <p>
              O limite máximo de tolerância para atrasos é de <strong>15 (quinze) minutos</strong>. Ultrapassado esse período, a aula poderá ser considerada como realizada, sem direito à reposição.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 8ª – DA RESCISÃO ANTECIPADA
            </h4>
            <p>
              O contrato poderá ser rescindido por qualquer das partes antes do término da vigência, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias ao vencimento do próximo pagamento.
            </p>
            <p className="mt-1.5">
              Em caso de rescisão antecipada por iniciativa da <strong>CONTRATANTE</strong>, antes do cumprimento integral do prazo de 3 (três) meses, a <strong>CONTRATANTE</strong> deverá realizar o pagamento referente ao mês seguinte, correspondente ao período de aviso prévio de 30 (trinta) dias, bem como pagar multa compensatória correspondente a <strong>30% (trinta por cento)</strong> do valor das mensalidades restantes até o término da vigência contratual, a título de quebra de fidelidade.
            </p>
            <p className="mt-1.5">
              Para fins de cálculo do pagamento referente ao mês seguinte (aviso prévio) e da multa rescisória de 30%, o valor base considerado será a média praticada nas últimas 3 (três) mensalidades pagas.
            </p>
            <p className="mt-1.5 font-medium">
              O pagamento referente ao mês seguinte e a multa rescisória serão devidos independentemente da utilização das aulas durante o período correspondente ao aviso prévio.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 9ª – DE INTRANSFERIBILIDADE
            </h4>
            <p>
              As aulas contratadas são pessoais e intransferíveis, sendo expressamente vedado à <strong>CONTRATANTE</strong> ceder, vender ou repassar, total ou parcialmente, a terceiros, o direito à prestação dos serviços ora contratados.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 mb-1.5">
              CLÁUSULA 10ª – DA RENOVAÇÃO
            </h4>
            <p>
              Ao término da vigência, o presente contrato poderá ser renovado, mediante acordo entre as partes, podendo ocorrer de forma automática ou mediante novo instrumento contratual. E, por estarem assim justas e contratadas, firmam o presente instrumento.
            </p>
          </div>
        </div>

        <PageFooter pageNumber={3} />
      </div>

      {/* ================= PAGE 4 ================= */}
      <div className="contract-page bg-white p-8 sm:p-12 border border-slate-200/80 shadow-md rounded-2xl min-h-[920px] flex flex-col justify-between">
        <div className="space-y-12">
          {/* Location & Date */}
          <div className="text-left font-serif text-base pt-4">
            Belo Horizonte, <span className="font-semibold">{day}</span> de <span className="font-semibold">{month}</span> de <span className="font-semibold">{year}</span>.
          </div>

          {/* Signatures Area */}
          <div className="space-y-16 pt-8 max-w-lg">
            
            {/* CONTRATANTE (STUDENT) SIGNATURE */}
            <div>
              <span className="font-bold text-sm text-slate-900 block mb-3">
                CONTRATANTE:
              </span>
              <div className="h-20 flex items-end">
                {studentSignatureUrl ? (
                  <img 
                    src={studentSignatureUrl} 
                    alt="Assinatura do Contratante" 
                    className="max-h-16 max-w-xs object-contain"
                  />
                ) : (
                  <div className="text-xs text-slate-400 italic">Pendente de assinatura</div>
                )}
              </div>
              <div className="w-80 border-b border-slate-900 pt-1" />
              <span className="font-sans font-bold text-xs text-slate-800 block mt-1 uppercase">
                {data.studentName || 'Nome do Contratante'}
              </span>
              {data.studentCpf && (
                <span className="font-sans text-[11px] text-slate-500 block">
                  CPF: {data.studentCpf}
                </span>
              )}
            </div>

            {/* CONTRATADA (TEACHER) SIGNATURE WITH GOV.BR BADGE */}
            <div>
              <span className="font-bold text-sm text-slate-900 block mb-3">
                CONTRATADA: {teacher.name}
              </span>
              <div className="flex items-center gap-3 py-1">
                {/* Gov.br Certificate Stamp Replica */}
                <div className="border border-slate-400/80 rounded-md p-2 flex items-center gap-2.5 bg-slate-50/70 max-w-sm">
                  <div className="w-10 h-7 bg-cyan-700 text-white rounded font-sans font-black text-[9px] flex items-center justify-center tracking-tighter shrink-0">
                    gov.br
                  </div>
                  <div className="text-[9px] font-sans leading-tight text-slate-600">
                    <span className="font-semibold block text-slate-800">Documento assinado digitalmente</span>
                    <strong className="block text-slate-900 uppercase">{teacher.name}</strong>
                    <span>Data: {currentDate.toLocaleDateString('pt-BR')} 19:29:51 -0300</span>
                    <span className="block text-[8px] text-cyan-800 underline">Verifique em https://validar.iti.gov.br</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Legal Digital Certification Stamp */}
          {isSigned && (
            <div className="mt-8 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-sans text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block uppercase tracking-wider">
                Certificação de Assinatura Eletrônica (Lei nº 14.063/2020)
              </span>
              <p>
                Documento assinado eletronicamente por <strong>{data.studentName}</strong> (CPF {data.studentCpf || 'Registrado'}) em {auditInfo?.signedAt ? new Date(auditInfo.signedAt).toLocaleString('pt-BR') : currentDate.toLocaleString('pt-BR')}.
              </p>
              {auditInfo?.signerIp && (
                <p className="text-slate-400">
                  IP de Origem: {auditInfo.signerIp} • Hash de Integridade: {auditInfo.auditHash || 'sha256-verified'}
                </p>
              )}
            </div>
          )}
        </div>

        <PageFooter pageNumber={4} />
      </div>

    </div>
  )
}
