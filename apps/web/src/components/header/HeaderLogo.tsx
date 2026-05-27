import React from 'react'

interface HeaderLogoProps {
  appName: string
  logoUrl: string | null
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({ appName, logoUrl }) => {
  return (
    <div className="flex items-center space-x-3 shrink-0">
      {logoUrl ? (
        <img src={logoUrl} alt={appName} className="h-9 sm:h-10 max-w-[200px] object-contain" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-tenant-primary text-white shadow-sm flex items-center justify-center font-black text-base shrink-0">
          {appName.charAt(0)}
        </div>
      )}
      <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight select-none">
        {appName}
      </span>
    </div>
  )
}
