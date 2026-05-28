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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Background dotted grid pattern */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 sm:p-12 rounded-[32px] shadow-2xl shadow-slate-100/50 w-full max-w-lg text-center relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-6">
          <div className="bg-rose-50 text-rose-600 w-16 h-16 rounded-[24px] flex items-center justify-center border border-rose-100 shadow-md">
            <XOctagon className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Solicitação Não Aprovada ✗</h2>
        
        <p className="text-slate-500 font-semibold mt-4 text-sm leading-relaxed max-w-sm">
          Olá, <span className="text-slate-800 font-extrabold">{user?.user_metadata?.full_name || 'Professor'}</span>.
          Revisamos sua solicitação de acesso à plataforma Flowike, mas ela não pôde ser aprovada no momento.
        </p>

        {loading ? (
          <div className="w-full my-6 bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-500 font-bold shadow-sm">Buscando feedback da revisão...</div>
        ) : adminNotes ? (
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl w-full my-6 text-left shadow-sm">
            <span className="block text-[10px] font-bold text-rose-650 uppercase tracking-wider mb-2">Mensagem da Equipe de Revisão</span>
            <p className="text-xs font-semibold text-slate-650 leading-relaxed italic">
              "{adminNotes}"
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl w-full my-6 text-left shadow-sm">
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Infelizmente sua candidatura não atende a todos os critérios operacionais necessários na nossa plataforma neste momento.
            </p>
          </div>
        )}

        <p className="text-slate-450 text-xs font-medium max-w-sm mb-8 leading-relaxed">
          Se acredita que houve algum engano ou deseja reenviar novas informações, entre em contato direto com nosso suporte técnico.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <a
            href="mailto:suporte@flowike.com"
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-indigo-600/15"
          >
            <MessageSquare className="w-4 h-4" />
            Contatar Suporte
          </a>
          
          <button
            onClick={handleSignOut}
            className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-3 px-6 rounded-xl text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair do Painel
          </button>
        </div>
      </motion.div>
    </div>
  )
}
