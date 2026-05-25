import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ContrastWarningProps {
  color1: string
  color2: string
  label1: string
  label2: string
}

export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const getRGB = (hex: string) => {
      let color = hex.replace('#', '')
      if (color.length === 3) {
        color = color.split('').map(char => char + char).join('')
      }
      const r = parseInt(color.substring(0, 2), 16) / 255
      const g = parseInt(color.substring(2, 4), 16) / 255
      const b = parseInt(color.substring(4, 6), 16) / 255
      return [r, g, b]
    }

    const getLuminance = (rgb: number[]) => {
      const a = rgb.map(v => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
    }

    const rgb1 = getRGB(hex1)
    const rgb2 = getRGB(hex2)
    const l1 = getLuminance(rgb1)
    const l2 = getLuminance(rgb2)
    
    const brightest = Math.max(l1, l2)
    const darkest = Math.min(l1, l2)
    return (brightest + 0.05) / (darkest + 0.05)
  } catch {
    return 5.0 // Fallback seguro
  }
}

export const ContrastWarning: React.FC<ContrastWarningProps> = ({ color1, color2, label1, label2 }) => {
  const contrast = getContrastRatio(color1, color2)
  const isContrastPoor = contrast < 4.5

  if (!isContrastPoor) return null

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs mt-2 animate-pulse">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">Baixo Contraste Detectado ({contrast.toFixed(1)}:1)</p>
        <p className="opacity-90">
          A combinação de cores entre <strong>{label1}</strong> ({color1}) e <strong>{label2}</strong> ({color2}) pode dificultar a leitura para alguns estudantes. O recomendado é no mínimo 4.5:1.
        </p>
      </div>
    </div>
  )
}
