import React from 'react'

interface UserAvatarProps {
  initial: string
  isOnline?: boolean
  onClick?: () => void
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ initial, isOnline = true, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Menu do perfil"
      className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shadow-sm hover:border-slate-300 hover:bg-blue-50/40 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none relative focus:ring-2 focus:ring-tenant-primary/20"
    >
      <span className="font-bold text-sm text-slate-700 select-none">{initial}</span>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
      )}
    </button>
  )
}
