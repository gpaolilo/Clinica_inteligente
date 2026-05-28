import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { motion } from 'framer-motion'
import { Clock, ShieldAlert, Sparkles, LogOut } from 'lucide-react'

export default function ReviewPending() {
  const { signOut, user } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Background dotted grid pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Background glow animations */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-650/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-650/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-12 rounded-[32px] shadow-2xl shadow-slate-100/50 w-full max-w-lg text-center relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-[24px] flex items-center justify-center border border-indigo-100 shadow-md">
            <Clock className="w-8 h-8 animate-pulse text-indigo-600" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Cadastro em Análise ⏳</h2>
        
        <p className="text-slate-500 font-semibold mt-4 text-sm leading-relaxed max-w-sm">
          Olá, <span className="text-slate-800 font-extrabold">{user?.user_metadata?.full_name || 'Professor'}</span>!
          Sua conta foi criada, mas está aguardando aprovação dos administradores.
        </p>

        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl w-full my-6 text-left space-y-3 shadow-sm">
          <div className="flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-slate-650">
              Analisamos as candidaturas em lotes para garantir a qualidade e exclusividade das academias Flowike.
            </p>
          </div>
          <div className="h-[1px] bg-slate-200" />
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-450 font-bold uppercase tracking-wider">Prazo Geral de Resposta</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-extrabold uppercase border border-indigo-100">Em até 24 horas</span>
          </div>
        </div>

        <p className="text-slate-450 text-xs font-medium max-w-sm mb-8 leading-relaxed">
          Enviamos uma notificação para o e-mail <span className="text-slate-600 font-bold">{user?.email}</span> assim que sua conta for ativada!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 hover:shadow-lg shadow-indigo-600/15 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Checar Status
          </button>
          
          <button
            onClick={handleSignOut}
            className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-3 px-6 rounded-xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </motion.div>
    </div>
  )
}
