import React from 'react'
import { Megaphone, Loader2 } from 'lucide-react'

interface PublishBrandingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  publishing: boolean
}

export const PublishBrandingModal: React.FC<PublishBrandingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  publishing
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-primary-600 mb-4">
          <div className="p-3 bg-primary-50 rounded-2xl">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Publicar Alterações de Marca?</h3>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Ao publicar, a nova identidade visual será aplicada **imediatamente** para todos os seus estudantes na plataforma.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="flex-1 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={publishing}
            className="flex-1 py-3 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Sim, Publicar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
