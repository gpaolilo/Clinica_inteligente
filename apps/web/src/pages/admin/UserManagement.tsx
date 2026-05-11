import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { UserRole } from '../../stores/authStore'

interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data as Profile[])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('Erro ao atualizar papel: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e pode remover dados associados a ele.')) return

    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        alert('Usuário excluído com sucesso.')
      } else {
        const err = await res.json()
        console.error('Erro na API de deleção:', err)
        if (window.location.hostname === 'localhost') {
           alert('Aviso: A deleção falhou. A API local requer o Vercel CLI (npx vercel dev) para funcionar.')
        } else {
           alert('Erro ao excluir usuário: ' + (err.error || 'Erro desconhecido'))
        }
      }
    } catch (error) {
      console.error('Erro ao excluir usuário', error)
      if (window.location.hostname === 'localhost') {
         alert('Aviso: A deleção falhou (ambiente local sem Vercel CLI).')
      } else {
         alert('Erro ao excluir usuário.')
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gerenciamento de Usuários</h2>
        <p className="text-slate-500 mt-1 text-sm">Visualize e edite as permissões de acesso da plataforma.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nome</th>
                <th className="p-4">ID do Usuário</th>
                <th className="p-4">Papel (Role)</th>
                <th className="p-4">Data de Criação</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando usuários...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{user.full_name || 'Usuário Sem Nome'}</td>
                    <td className="p-4 text-xs font-mono text-slate-400">{user.id}</td>
                    <td className="p-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className={`text-sm font-bold rounded-lg px-3 py-1.5 border outline-none cursor-pointer transition-colors ${
                          user.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          user.role === 'TEACHER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          user.role === 'PSYCHOLOGIST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="ADMIN">ADMINISTRADOR</option>
                        <option value="TEACHER">PROFESSOR</option>
                        <option value="PSYCHOLOGIST">PSICÓLOGO</option>
                        <option value="STUDENT">ALUNO</option>
                        <option value="PATIENT">PACIENTE</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
