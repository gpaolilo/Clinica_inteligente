import React, { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadTenantAsset, deleteTenantAsset } from '../../lib/brandingService'

interface AssetUploaderProps {
  tenantId: string | null
  assetType: 'logo' | 'favicon' | 'banner' | 'login-background'
  currentUrl: string | null
  label: string
  recommendation: string
  onUploadSuccess: (url: string) => void
  onDeleteSuccess: () => void
}

export const AssetUploader: React.FC<AssetUploaderProps> = ({
  tenantId,
  assetType,
  currentUrl,
  label,
  recommendation,
  onUploadSuccess,
  onDeleteSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return

    // Limites de formato
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WEBP ou SVG.')
      return
    }

    // Limites de tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Tamanho máximo excedido. O limite é 2MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const publicUrl = await uploadTenantAsset(tenantId, file, assetType)
      onUploadSuccess(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar imagem')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!tenantId) return
    if (window.confirm(`Deseja mesmo remover o ${label}?`)) {
      setUploading(true)
      try {
        await deleteTenantAsset(tenantId, assetType)
        onDeleteSuccess()
      } catch (err: any) {
        setError(err.message || 'Erro ao remover imagem')
      } finally {
        setUploading(false)
      }
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-slate-700">{label}</label>
      
      <div className="flex items-center gap-4">
        {/* Preview da Imagem */}
        {currentUrl ? (
          <div className="relative group w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {assetType === 'favicon' ? (
              <img src={currentUrl} alt={label} className="w-8 h-8 object-contain" />
            ) : (
              <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
            )}
            
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !tenantId}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary-500 hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-bold mt-1 uppercase">Upload</span>
              </>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".png,.jpg,.jpeg,.svg,.webp"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !tenantId}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            Escolher Arquivo
          </button>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{recommendation}</p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 bg-rose-600 rounded-full inline-block"></span>
          {error}
        </p>
      )}
    </div>
  )
}
