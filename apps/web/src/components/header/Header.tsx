import React from 'react'
import { Menu } from 'lucide-react'
import { HeaderLogo } from './HeaderLogo'
import { HeaderActions } from './HeaderActions'

interface HeaderProps {
  appName: string
  logoUrl: string | null
  initial: string
  setIsMobileMenuOpen: (open: boolean) => void
  isProfileMenuOpen: boolean
  setIsProfileMenuOpen: (open: boolean) => void
  renderProfileDropdown: () => React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({
  appName,
  logoUrl,
  initial,
  setIsMobileMenuOpen,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  renderProfileDropdown
}) => {
  return (
    <header 
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
      }}
      className="sticky top-0 w-full h-[84px] z-30 shrink-0 rounded-b-[24px] shadow-[0_8px_30px_rgba(15,23,42,0.04),0_2px_8px_rgba(15,23,42,0.03)] px-4 sm:px-8 flex justify-between items-center transition-all duration-300"
    >
      {/* Layered background with radial gradients and soft blue waves */}
      <div className="absolute inset-0 pointer-events-none rounded-b-[24px] overflow-hidden -z-10 bg-gradient-to-b from-transparent to-blue-50/5">
        <div className="absolute -bottom-16 left-1/4 w-[400px] h-[120px] rounded-full bg-blue-100/10 blur-[50px]"></div>
        <div className="absolute -bottom-16 right-1/4 w-[350px] h-[100px] rounded-full bg-indigo-100/10 blur-[40px]"></div>
        
        {/* Soft blue wavy SVG pattern at the bottom */}
        <svg className="absolute bottom-0 inset-x-0 w-full h-[32px] text-blue-100/15" viewBox="0 0 1440 32" fill="currentColor" preserveAspectRatio="none">
          <path d="M0,16 C240,32 480,32 720,16 C960,0 1200,0 1440,16 L1440,32 L0,32 Z" opacity="0.4" />
          <path d="M0,24 C320,40 640,8 960,24 C1120,32 1280,32 1440,24 L1440,32 L0,32 Z" opacity="0.2" />
        </svg>
      </div>

      {/* Left side: Mobile Hamburger menu + Logo */}
      <div className="flex items-center space-x-3 md:space-x-4">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          className="lg:hidden p-2.5 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>

        <HeaderLogo appName={appName} logoUrl={logoUrl} />
      </div>

      {/* Right side: Actions & Profile Menu */}
      <div className="relative">
        <HeaderActions 
          initial={initial} 
          onProfileClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
        />
        
        {isProfileMenuOpen && (
          <div className="absolute right-0 mt-2 z-50">
            {renderProfileDropdown()}
          </div>
        )}
      </div>
    </header>
  )
}
