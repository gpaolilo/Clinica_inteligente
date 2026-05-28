import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { motion } from 'framer-motion'
import { XOctagon, LogOut, MessageSquare } from 'lucide-react'

export default function ReviewRejected() {
  const { signOut, user } = useAuthStore()
  const navigate = useNavigate()
  const [adminNotes, setAdminNotes] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRejectionDetails = async () => {
      if (!user?.email) return
      setLoading(true)
      const { data } = await supabase
        .from('teacher_signup_requests')
        .select('admin_notes')
        .eq('email', user.email)
        .maybeSingle()

      if (data) {
        setAdminNotes(data.admin_notes)
      }
      setLoading(false)
    }

    fetchRejectionDetails()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-900/60 backdrop-blur-xl border border-slate-850 p-8 sm:p-12 rounded-[32px] shadow-2xl w-full max-w-lg text-center relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="bg-rose-500/10 text-rose-500 w-16 h-16 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-md">
            <XOctagon className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Solicitação Não Aprovada ✗</h2>
        
        <p className="text-slate-400 font-semibold mt-4 text-sm leading-relaxed max-w-sm">
          Olá, <span className="text-white font-bold">{user?.user_metadata?.full_name || 'Professor'}</span>.
          Revisamos sua solicitação de acesso à plataforma Flowike, mas ela não pôde ser aprovada no momento.
        </p>

        {loading ? (
          <div className="w-full my-6 bg-slate-950/40 p-4 rounded-xl text-xs text-slate-500 font-medium">Buscando feedback da revisão...</div>
        ) : adminNotes ? (
          <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl w-full my-6 text-left">
            <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">Mensagem da Equipe de Revisão</span>
            <p className="text-xs font-semibold text-slate-300 leading-relaxed italic">
              "{adminNotes}"
            </p>
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl w-full my-6 text-left">
            <p className="text-xs font-semibold text-slate-400 leading-relaxed">
              Infelizmente sua candidatura não atende a todos os critérios operacionais necessários na nossa plataforma neste momento.
            </p>
          </div>
        )}

        <p className="text-slate-500 text-xs font-medium max-w-sm mb-8 leading-relaxed">
          Se acredita que houve algum engano ou deseja reenviar novas informações, entre em contato direto com nosso suporte técnico.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <a
            href="mailto:suporte@flowike.com"
            className="bg-white hover:bg-slate-100 text-slate-950 font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Contatar Suporte
          </a>
          
          <button
            onClick={handleSignOut}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl text-xs transition-all border border-slate-800 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Sair do Painel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
