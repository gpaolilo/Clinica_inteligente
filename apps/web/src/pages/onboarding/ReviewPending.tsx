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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Background glow animations */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-slate-850 p-8 sm:p-12 rounded-[32px] shadow-2xl w-full max-w-lg text-center relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="bg-lime-400/10 text-lime-400 w-16 h-16 rounded-2xl flex items-center justify-center border border-lime-400/20 shadow-md">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cadastro em Análise ⏳</h2>
        
        <p className="text-slate-400 font-semibold mt-4 text-sm leading-relaxed max-w-sm">
          Olá, <span className="text-white font-bold">{user?.user_metadata?.full_name || 'Professor'}</span>!
          Sua conta foi criada, mas está aguardando aprovação dos administradores.
        </p>

        <div className="bg-slate-950/80 border border-slate-850 p-5 rounded-2xl w-full my-6 text-left space-y-3">
          <div className="flex gap-2.5 items-start">
            <ShieldAlert className="w-4 h-4 text-lime-400 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-slate-300">
              Analisamos as candidaturas em lotes para garantir a qualidade e exclusividade das academias Flowike.
            </p>
          </div>
          <div className="h-[1px] bg-slate-850" />
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Prazo Geral de Resposta</span>
            <span className="bg-lime-400/15 text-lime-400 px-2 py-0.5 rounded font-extrabold uppercase border border-lime-400/20">Em até 24 horas</span>
          </div>
        </div>

        <p className="text-slate-500 text-xs font-medium max-w-sm mb-8 leading-relaxed">
          Enviamos uma notificação para o e-mail <span className="text-slate-400 font-bold">{user?.email}</span> assim que sua conta for ativada!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.location.reload()}
            className="bg-lime-400 hover:bg-lime-500 text-slate-950 font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1 hover:shadow-lg shadow-lime-400/10 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Checar Status
          </button>
          
          <button
            onClick={handleSignOut}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl text-xs transition-all border border-slate-800 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </motion.div>
    </div>
  )
}
