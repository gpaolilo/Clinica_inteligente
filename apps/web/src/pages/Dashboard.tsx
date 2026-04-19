import { useAuthStore } from '../stores/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="p-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
          Olá, Dr(a). {user?.user_metadata?.full_name?.split(' ')[0] || 'Psicólogo(a)'}
        </h2>
        <p className="text-slate-500 mt-2">Aqui está o resumo da sua clínica hoje.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Sessões Hoje</div>
          <div className="text-3xl font-bold text-slate-800">4</div>
          <div className="text-xs text-primary-600 mt-2 bg-primary-50 inline-block px-2 py-1 rounded">2 já confirmadas</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Prontuários Atrasados</div>
          <div className="text-3xl font-bold text-slate-800">1</div>
          <div className="text-xs text-rose-600 mt-2 bg-rose-50 inline-block px-2 py-1 rounded">Pendente assinatura</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-slate-500 text-sm font-medium mb-1">Receita Semanal</div>
          <div className="text-3xl font-bold text-slate-800">--</div>
          <div className="text-xs text-slate-400 mt-2 inline-block px-2 py-1 rounded">Configure seu plano Premium</div>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="text-slate-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Nenhuma sessão ativa</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">Sua próxima consulta é apenas às 14:00. Na hora marcada, inicie a sessão para a IA transcrever e gerar seu prontuário automaticamente.</p>
        <button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Nova Consulta Avulsa
        </button>
      </div>
    </div>
  )
}
