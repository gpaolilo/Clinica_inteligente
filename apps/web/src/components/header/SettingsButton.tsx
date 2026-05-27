import React from 'react'
import { Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SettingsButtonProps {
  to?: string
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ to = "/dashboard/settings" }) => {
  return (
    <Link
      to={to}
      aria-label="Configurações"
      className="p-2.5 text-slate-500 hover:text-tenant-primary hover:bg-blue-50/50 rounded-xl transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-tenant-primary/20"
    >
      <Settings className="w-5.5 h-5.5" />
    </Link>
  )
}
