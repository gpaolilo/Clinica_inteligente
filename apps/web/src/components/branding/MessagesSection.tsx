import React from 'react'

interface MessagesSectionProps {
  loginMessage: string
  dashboardMessage: string
  onChange: (fields: Partial<{
    login_message: string
    dashboard_message: string
  }>) => void
}

export const MessagesSection: React.FC<MessagesSectionProps> = ({
  loginMessage,
  dashboardMessage,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">Mensagens Customizadas</h3>
        <p className="text-xs text-slate-400">Personalize os textos de boas-vindas exibidos para seus alunos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mensagem da tela de login */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Mensagem da Tela de Login</label>
          <textarea
            rows={3}
            value={loginMessage}
            onChange={(e) => onChange({ login_message: e.target.value })}
            placeholder="Ex: Seja bem-vindo à Sarah AI Academy!"
            className="w-full px-4 py-3 border border-slate-200 focus:border-primary-500 rounded-xl text-sm outline-none shadow-sm resize-none"
          />
          <p className="text-[10px] text-slate-400">Texto de introdução exibido logo acima dos campos de login do aluno.</p>
        </div>

        {/* Mensagem do dashboard */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Mensagem do Dashboard do Aluno</label>
          <textarea
            rows={3}
            value={dashboardMessage}
            onChange={(e) => onChange({ dashboard_message: e.target.value })}
            placeholder="Ex: Pronto para o seu treino de inglês de hoje?"
            className="w-full px-4 py-3 border border-slate-200 focus:border-primary-500 rounded-xl text-sm outline-none shadow-sm resize-none"
          />
          <p className="text-[10px] text-slate-400">Saudação em destaque no cabeçalho do portal do estudante.</p>
        </div>
      </div>
    </div>
  )
}
