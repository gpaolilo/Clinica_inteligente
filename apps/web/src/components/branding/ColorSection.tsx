import React from 'react'
import { ColorPickerInput } from './ColorPickerInput'
import { ContrastWarning } from './ContrastWarning'

interface ColorSectionProps {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  onChange: (fields: Partial<{
    primary_color: string
    secondary_color: string
    accent_color: string
    background_color: string
    text_color: string
  }>) => void
}

export const ColorSection: React.FC<ColorSectionProps> = ({
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
  textColor,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">Cores da Marca</h3>
        <p className="text-xs text-slate-400">Configure a paleta cromática do seu aplicativo. Use cores que facilitem a leitura.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Cor Primária */}
        <ColorPickerInput
          label="Cor Primária"
          value={primaryColor}
          defaultValue="#22c55e"
          onChange={(hex) => onChange({ primary_color: hex })}
        />

        {/* Cor Secundária */}
        <ColorPickerInput
          label="Cor Secundária"
          value={secondaryColor}
          defaultValue="#15803d"
          onChange={(hex) => onChange({ secondary_color: hex })}
        />

        {/* Cor de Destaque */}
        <ColorPickerInput
          label="Cor de Destaque"
          value={accentColor}
          defaultValue="#D4FF59"
          onChange={(hex) => onChange({ accent_color: hex })}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Cor de Fundo */}
        <ColorPickerInput
          label="Cor de Fundo"
          value={backgroundColor}
          defaultValue="#F8F9FA"
          onChange={(hex) => onChange({ background_color: hex })}
        />

        {/* Cor do Texto */}
        <ColorPickerInput
          label="Cor do Texto"
          value={textColor}
          defaultValue="#1A1A1A"
          onChange={(hex) => onChange({ text_color: hex })}
        />
      </div>

      {/* Alertas de Contraste e Acessibilidade */}
      <div className="space-y-2">
        <ContrastWarning
          color1={textColor}
          color2={backgroundColor}
          label1="Cor do Texto"
          label2="Cor de Fundo"
        />
        <ContrastWarning
          color1={primaryColor}
          color2={backgroundColor}
          label1="Cor Primária (Botões)"
          label2="Cor de Fundo"
        />
      </div>
    </div>
  )
}
