import React from 'react'
import { RotateCcw } from 'lucide-react'

interface ColorPickerInputProps {
  label: string
  value: string
  defaultValue: string
  onChange: (hex: string) => void
}

export const ColorPickerInput: React.FC<ColorPickerInputProps> = ({
  label,
  value,
  defaultValue,
  onChange
}) => {
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value
    if (!hex.startsWith('#')) {
      hex = '#' + hex
    }
    onChange(hex)
  }

  return (
    <div className="space-y-1.5 flex-1 min-w-[120px]">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        {/* Swatch do Seletor */}
        <div className="relative w-10 h-10 rounded-lg border border-slate-200 shadow-sm overflow-hidden shrink-0 cursor-pointer">
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#22c55e'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-none bg-none p-0"
          />
        </div>

        {/* Campo de Texto HEX */}
        <input
          type="text"
          value={value}
          onChange={handleHexChange}
          placeholder="#FFFFFF"
          maxLength={7}
          className="flex-1 min-w-0 px-3 py-2 border border-slate-200 focus:border-primary-500 rounded-lg text-sm outline-none font-mono uppercase shadow-sm"
        />

        {/* Botão de Reset */}
        {value !== defaultValue && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 transition-colors shrink-0"
            title="Restaurar cor padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
