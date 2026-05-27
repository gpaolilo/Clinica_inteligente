import React from 'react'
import { Bell } from 'lucide-react'

interface NotificationButtonProps {
  count?: number
  onClick?: () => void
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({ count = 3, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label={`Notificações, ${count} não lidas`}
      className="p-2.5 text-slate-500 hover:text-tenant-primary hover:bg-blue-50/50 rounded-xl transition-all duration-200 hover:-translate-y-0.5 relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-tenant-primary/20"
    >
      <Bell className="w-5.5 h-5.5" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold px-1 border border-white">
          {count}
        </span>
      )}
    </button>
  )
}
