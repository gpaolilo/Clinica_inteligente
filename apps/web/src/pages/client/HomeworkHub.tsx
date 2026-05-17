import { motion } from 'framer-motion'

export default function HomeworkHub() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-black text-slate-800 mb-6">Meus Exercícios</h1>
      <p className="text-slate-500">Em breve: Exercícios adaptativos baseados em IA.</p>
    </motion.div>
  )
}
