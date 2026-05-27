import React from 'react'
import { Search } from 'lucide-react'

interface HeaderSearchProps {
  onSearchClick?: () => void
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({ onSearchClick }) => {
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0

  return (
    <div className="flex-1 flex justify-center px-4 max-w-full">
      {/* Desktop Search Bar (Hidden on Mobile) */}
      <div className="hidden md:flex items-center w-full max-w-[560px] lg:max-w-[620px] h-[52px] relative group select-none">
        <Search className="w-5 h-5 text-slate-400 absolute left-4.5 pointer-events-none group-focus-within:text-tenant-primary transition-colors" />
        <input
          type="text"
          placeholder="Buscar clientes, sessões ou faturas..."
          className="w-full h-full pl-12 pr-16 bg-white/60 border border-slate-200/80 hover:border-slate-300 focus:border-tenant-primary focus:bg-white rounded-[16px] text-sm text-slate-700 placeholder:text-slate-400/80 transition-all focus:outline-none focus:ring-4 focus:ring-tenant-primary/10 shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
          readOnly
          onClick={onSearchClick}
        />
        <div className="absolute right-4.5 flex items-center bg-slate-100 border border-slate-200/60 text-slate-400 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider font-mono">
          {isMac ? '⌘ K' : 'Ctrl K'}
        </div>
      </div>

      {/* Mobile Search Trigger Icon */}
      <button
        onClick={onSearchClick}
        aria-label="Buscar"
        className="md:hidden p-2 text-slate-500 hover:text-tenant-primary hover:bg-blue-50/50 active:bg-blue-100/50 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      >
        <Search className="w-6 h-6" />
      </button>
    </div>
  )
}
