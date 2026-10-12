import { useRef, useState, useEffect } from 'react'
import { RotateCcw, Check, PenTool, Type } from 'lucide-react'

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void
  title: string
  subtitle?: string
  defaultName?: string
  mode?: 'signature' | 'initials'
}

export default function SignaturePad({
  onConfirm,
  title,
  subtitle,
  defaultName = '',
  mode = 'signature'
}: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw')
  const [typedText, setTypedText] = useState(mode === 'initials' ? (defaultName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3) || 'RUB') : defaultName)
  const [hasDrawn, setHasDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high resolution display
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0F172A' // Dark slate ink
    ctx.lineWidth = mode === 'initials' ? 3.5 : 2.5
  }, [activeTab, mode])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    isDrawingRef.current = true
    setHasDrawn(true)

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  // Convert typed text to stylized signature canvas
  const generateTypedSignature = (): string => {
    const offscreen = document.createElement('canvas')
    offscreen.width = 400
    offscreen.height = 160
    const ctx = offscreen.getContext('2d')
    if (!ctx) return ''

    ctx.fillStyle = '#0F172A'
    ctx.font = mode === 'initials' 
      ? 'bold italic 60px "Brush Script MT", "Caveat", "Dancing Script", cursive' 
      : 'italic 38px "Brush Script MT", "Caveat", "Dancing Script", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedText, 200, 80)

    return offscreen.toDataURL('image/png')
  }

  const handleConfirm = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current
      if (!canvas || !hasDrawn) return
      onConfirm(canvas.toDataURL('image/png'))
    } else {
      if (!typedText.trim()) return
      const dataUrl = generateTypedSignature()
      onConfirm(dataUrl)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-sm text-slate-900">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'draw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Desenhar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'type' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Digitar</span>
          </button>
        </div>
      </div>

      {activeTab === 'draw' ? (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 overflow-hidden touch-none h-40 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            {!hasDrawn && (
              <div className="absolute pointer-events-none text-slate-400 text-xs font-medium flex items-center gap-1.5">
                <PenTool className="w-4 h-4 opacity-70" />
                <span>{mode === 'initials' ? 'Desenhe sua rubrica aqui' : 'Assine seu nome com o mouse ou dedo'}</span>
              </div>
            )}
            <div className="absolute bottom-2 left-4 right-4 border-b border-slate-200 pointer-events-none" />
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawn}
              className="text-slate-500 hover:text-slate-800 disabled:opacity-40 flex items-center gap-1 font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Válido como firma eletrônica digital
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
              {mode === 'initials' ? 'Suas Iniciais / Rubrica:' : 'Nome Completo para Assinatura:'}
            </label>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              maxLength={mode === 'initials' ? 5 : 50}
              placeholder={mode === 'initials' ? 'Ex: GRS' : 'Digite seu nome completo'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {typedText.trim() && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1">Prévia da Assinatura:</span>
              <p className="text-2xl sm:text-3xl font-serif italic text-slate-800 tracking-wider py-1 select-none">
                {typedText}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={activeTab === 'draw' ? !hasDrawn : !typedText.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Confirmar {mode === 'initials' ? 'Rubrica' : 'Assinatura'}</span>
        </button>
      </div>
    </div>
  )
}
