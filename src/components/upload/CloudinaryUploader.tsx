'use client'

import { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

export type UploadedAsset = {
  id: string
  publicId: string
  secureUrl: string
  assetType: string
  format: string | null
  bytes: number | null
  width: number | null
  height: number | null
}

type Props = {
  projectId: string
  assetType: 'render_3d' | 'plan_autocad' | 'specification' | 'reception_document' | 'site_photo' | 'contract' | 'other'
  accept: string          // e.g. "image/*" or ".pdf"
  label: string
  description?: string
  maxFiles?: number
  existingAssets?: UploadedAsset[]
  onUploaded: (asset: UploadedAsset) => void
  onDeleted?: (assetId: string) => void
}

type UploadState = 'idle' | 'uploading' | 'error'

export function CloudinaryUploader({
  projectId,
  assetType,
  accept,
  label,
  description,
  maxFiles = 10,
  existingAssets = [],
  onUploaded,
  onDeleted,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const isImage = accept.startsWith('image')

  async function uploadFile(file: File) {
    setState('uploading')
    setErrorMsg('')
    try {
      // 1. Get signed params from our server (projectId sent so server can authorize + derive folder)
      const sigRes = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`)
      if (!sigRes.ok) throw new Error('Impossible de signer le téléchargement')
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json()

      // 2. Upload directly to Cloudinary (never exposes secret to client)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', String(timestamp))
      formData.append('signature', signature)
      formData.append('folder', folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Échec du téléchargement vers Cloudinary')
      const uploadData = await uploadRes.json()

      // 3. Record in our DB
      const recordRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: uploadData.public_id,
          url: uploadData.url,
          secureUrl: uploadData.secure_url,
          assetType,
          format: uploadData.format ?? null,
          bytes: uploadData.bytes ?? null,
          width: uploadData.width ?? null,
          height: uploadData.height ?? null,
          projectId,
        }),
      })
      if (!recordRes.ok) throw new Error('Échec de l\'enregistrement en base de données')
      const asset = await recordRes.json()

      onUploaded(asset)
      setState('idle')
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erreur de téléchargement')
    }
  }

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      if (existingAssets.length >= maxFiles) {
        setErrorMsg(`Maximum ${maxFiles} fichier(s) autorisé(s)`)
        return
      }
      uploadFile(files[0])
    },
    [existingAssets.length, maxFiles] // eslint-disable-line
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
          {label}
        </label>
        {description && (
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{description}</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
          dragOver ? 'border-green bg-[var(--admin-green-dim)]' : 'border-[var(--admin-border)] hover:border-green/40 hover:bg-[var(--admin-bg)]'
        )}
      >
        {state === 'uploading' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-green border-t-transparent rounded-full animate-spin" />
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Téléchargement…</span>
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--admin-green-dim)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--green)' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              Déposer un fichier ou <span style={{ color: 'var(--green)' }}>parcourir</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {accept === 'image/*' ? 'JPEG, PNG, WebP' : 'PDF'} — max {maxFiles} fichier(s)
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {state === 'error' && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}

      {/* Previews */}
      {existingAssets.length > 0 && (
        <div className={cn('grid gap-3', isImage ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1')}>
          {existingAssets.map((asset) => (
            <div
              key={asset.id}
              className="relative group rounded-lg overflow-hidden border"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.secureUrl}
                  alt={asset.publicId}
                  className="w-full h-28 object-cover"
                />
              ) : (
                <div
                  className="flex items-center gap-3 p-3"
                  style={{ background: 'var(--admin-bg)' }}
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--admin-red-dim)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--admin-red)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                      {asset.publicId.split('/').pop()}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {formatBytes(asset.bytes)}
                    </p>
                  </div>
                </div>
              )}

              {onDeleted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleted(asset.id) }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                  title="Supprimer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
