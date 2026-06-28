import React from 'react'
import { Check } from 'lucide-react'

export interface BrandingPreset {
  name: string
  label: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  theme_mode: 'light' | 'dark' | 'system'
  button_style: 'Rounded' | 'Pill' | 'Sharp' | 'Soft'
  card_style: 'Minimal' | 'Elevated' | 'Glass' | 'Bordered'
}

export const brandingPresets: Record<string, BrandingPreset> = {
  Minimal: {
    name: 'Minimal',
    label: 'Mínimo',
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    accent_color: '#60a5fa',
    background_color: '#ffffff',
    text_color: '#1f2937',
    theme_mode: 'light',
    button_style: 'Rounded',
    card_style: 'Minimal'
  },
  Corporate: {
    name: 'Corporate',
    label: 'Corporativo',
    primary_color: '#1e3a8a',
    secondary_color: '#1d4ed8',
    accent_color: '#3b82f6',
    background_color: '#f3f4f6',
    text_color: '#111827',
    theme_mode: 'light',
    button_style: 'Rounded',
    card_style: 'Elevated'
  },
  Modern: {
    name: 'Modern',
    label: 'Moderno',
    primary_color: '#8b5cf6',
    secondary_color: '#ec4899',
    accent_color: '#10b981',
    background_color: '#f9fafb',
    text_color: '#111827',
    theme_mode: 'light',
    button_style: 'Soft',
    card_style: 'Glass'
  },

  Education: {
    name: 'Education',
    label: 'Educação',
    primary_color: '#22c55e',
    secondary_color: '#15803d',
    accent_color: '#d4ff59',
    background_color: '#f8f9fa',
    text_color: '#1a1a1a',
    theme_mode: 'light',
    button_style: 'Rounded',
    card_style: 'Minimal'
  },
  Flowike: {
    name: 'Flowike',
    label: 'Flowike',
    primary_color: '#00FFFF',
    secondary_color: '#7000FF',
    accent_color: '#ff00ff',
    background_color: '#0B0E14',
    text_color: '#f3f4f6',
    theme_mode: 'dark',
    button_style: 'Pill',
    card_style: 'Glass'
  }
}

interface DesignPresetSelectorProps {
  currentPreset: string
  onSelect: (presetName: string) => void
}

export const DesignPresetSelector: React.FC<DesignPresetSelectorProps> = ({
  currentPreset,
  onSelect
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-700">Escolha um Tema Pré-definido</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.values(brandingPresets).map((preset) => {
          const isSelected = currentPreset === preset.name
          return (
            <button
              type="button"
              key={preset.name}
              onClick={() => onSelect(preset.name)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24 group ${
                isSelected 
                  ? 'border-primary-500 ring-2 ring-primary-500/25 bg-primary-50/10' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-slate-800">{preset.label}</span>
                <div className="flex gap-1 mt-2">
                  <span className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0" style={{ backgroundColor: preset.primary_color }} />
                  <span className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0" style={{ backgroundColor: preset.accent_color }} />
                  <span className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0" style={{ backgroundColor: preset.background_color }} />
                </div>
              </div>

              {isSelected && (
                <span className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
