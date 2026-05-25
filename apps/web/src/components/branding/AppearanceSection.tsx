import React from 'react'
import { DesignPresetSelector } from './DesignPresetSelector'
import { Sun, Moon, Laptop } from 'lucide-react'

interface AppearanceSectionProps {
  designPreset: string
  themeMode: 'light' | 'dark' | 'system'
  buttonStyle: 'Rounded' | 'Pill' | 'Sharp' | 'Soft'
  cardStyle: 'Minimal' | 'Elevated' | 'Glass' | 'Bordered'
  onChange: (fields: Partial<{
    design_preset: string
    theme_mode: 'light' | 'dark' | 'system'
    button_style: 'Rounded' | 'Pill' | 'Sharp' | 'Soft'
    card_style: 'Minimal' | 'Elevated' | 'Glass' | 'Bordered'
  }>) => void
  onSelectPreset: (presetName: string) => void
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  designPreset,
  themeMode,
  buttonStyle,
  cardStyle,
  onChange,
  onSelectPreset
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">Aparência e Estilo</h3>
        <p className="text-xs text-slate-400">Personalize o formato dos botões, cartões e o tema geral da plataforma.</p>
      </div>

      {/* Seletor de Temas Pré-definidos */}
      <DesignPresetSelector
        currentPreset={designPreset}
        onSelect={onSelectPreset}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Modo de Tema */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Modo de Exibição</label>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isSelected = themeMode === mode
              const LabelIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Laptop
              const textMap = { light: 'Claro', dark: 'Escuro', system: 'Auto' }
              
              return (
                <button
                  type="button"
                  key={mode}
                  onClick={() => onChange({ theme_mode: mode })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  <LabelIcon className="w-3.5 h-3.5" />
                  {textMap[mode]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Estilo dos Botões */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Estilo dos Botões</label>
          <select
            value={buttonStyle}
            onChange={(e) => onChange({ button_style: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-200 focus:border-primary-500 rounded-xl text-sm font-semibold outline-none bg-white shadow-sm"
          >
            <option value="Rounded">Arredondado (Padrão)</option>
            <option value="Pill">Pílula (Total)</option>
            <option value="Sharp">Reto (Sem borda)</option>
            <option value="Soft">Suave (Borda larga)</option>
          </select>
        </div>

        {/* Estilo dos Cartões */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Estilo dos Cards</label>
          <select
            value={cardStyle}
            onChange={(e) => onChange({ card_style: e.target.value as any })}
            className="w-full px-3 py-2 border border-slate-200 focus:border-primary-500 rounded-xl text-sm font-semibold outline-none bg-white shadow-sm"
          >
            <option value="Minimal">Mínimo (Limpo)</option>
            <option value="Elevated">Elevado (Sombra)</option>
            <option value="Glass">Vidro (Efeito Glass)</option>
            <option value="Bordered">Bordas visíveis</option>
          </select>
        </div>
      </div>
    </div>
  )
}
