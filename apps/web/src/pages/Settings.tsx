export default function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Configurações e Integrações</h2>
        <p className="text-slate-500 mt-1 text-sm">Gerencie sua assinatura, integrações externas e automações do consultório.</p>
      </div>

      <div className="space-y-6">
        {/* Assinatura */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Assinatura Atual</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="mb-4 sm:mb-0">
               <p className="text-primary-700 font-bold bg-primary-50 border border-primary-100 px-3 py-1 rounded inline-block mb-2">Plano Premium (Ativo)</p>
               <p className="text-sm text-slate-500">Você já consumiu <span className="font-semibold text-slate-700">400</span> de 1000 minutos de processamento de AI este mês.</p>
            </div>
            <button className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm">
              Gerenciar no Stripe
            </button>
          </div>
        </section>

        {/* Notificações WhatsApp */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
              Assistente de WhatsApp Remoto
              <span className="ml-3 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">ON</span>
            </h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Envia lembretes automáticos 24h antes da sessão com opção de confirmação do paciente. Avisa automaticamente sobre boletos, links de pagamento PIX e gerencia inadimplências.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </section>

        {/* Google Calendar */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Google Calendar</h3>
            <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
              Sincronização bidirecional Webhook. Adicione eventos ou bloqueios visuais na sua conta do Google e nós bloquearemos na Clínica, evitando conflitos duplo-agendamentos.
            </p>
          </div>
          <button className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center bg-white shadow-sm">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg>
            Conectar Conta Google
          </button>
        </section>
      </div>
    </div>
  )
}
