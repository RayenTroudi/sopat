'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { SITE_PHOTO_MILESTONES } from '@/lib/db/realisation'

export type CheckpointState = {
  id: string
  label: string
  milestone: string
  photo: {
    id: string
    secureUrl: string
    uploadedAt: Date
  } | null
}

type Props = {
  projectId:   string
  checkpoints: CheckpointState[]
  onChange:    (updated: CheckpointState[]) => void
}

export function PhotoCheckpoints({ projectId, checkpoints, onChange }: Props) {
  const completedCount = checkpoints.filter((c) => c.photo !== null).length
  const totalCount = checkpoints.length

  return (
    <div className="space-y-4">
      {/* Summary progress line */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--admin-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              background: completedCount === totalCount ? 'var(--admin-emerald)' : 'var(--admin-amber)',
            }}
          />
        </div>
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--admin-text-muted)' }}>
          {completedCount}/{totalCount} jalons
        </span>
      </div>

      {/* Milestone cards */}
      <div className="grid gap-3">
        {checkpoints.map((cp, idx) => (
          <MilestoneCard
            key={cp.id}
            checkpoint={cp}
            index={idx}
            projectId={projectId}
            onUploaded={(photo) => {
              const updated = checkpoints.map((c) =>
                c.milestone === cp.milestone ? { ...c, photo } : c
              )
              onChange(updated)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MilestoneCard({
  checkpoint,
  index,
  projectId,
  onUploaded,
}: {
  checkpoint: CheckpointState
  index: number
  projectId: string
  onUploaded: (photo: { id: string; secureUrl: string; uploadedAt: Date }) => void
}) {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDone = checkpoint.photo !== null

  async function uploadPhoto(file: File) {
    setUploadState('uploading')
    setErrorMsg('')
    try {
      // 1. Get signed upload params
      const sigRes = await fetch(`/api/upload?projectId=${encodeURIComponent(projectId)}`)
      if (!sigRes.ok) throw new Error('Impossible de signer')
      const { signature, timestamp, cloudName, apiKey, folder } = await sigRes.json() as {
        signature: string; timestamp: number; cloudName: string; apiKey: string; folder: string
      }

      // 2. Upload to Cloudinary
      const fd = new FormData()
      fd.append('file', file)
      fd.append('signature', signature)
      fd.append('timestamp', String(timestamp))
      fd.append('api_key', apiKey)
      fd.append('folder', folder)

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: fd,
      })
      if (!upRes.ok) throw new Error('Échec Cloudinary')
      const result = await upRes.json() as {
        public_id: string; url: string; secure_url: string; format: string; bytes: number; width: number; height: number
      }

      // 3. Record site photo + milestone tag via dedicated endpoint
      const recordRes = await fetch(`/api/projects/${projectId}/site-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone:  checkpoint.milestone,
          publicId:   result.public_id,
          url:        result.url,
          secureUrl:  result.secure_url,
          format:     result.format,
          bytes:      result.bytes,
          width:      result.width,
          height:     result.height,
        }),
      })
      if (!recordRes.ok) throw new Error('Échec d\'enregistrement')
      const asset = await recordRes.json() as { id: string; secureUrl: string; createdAt: string }

      onUploaded({
        id:         asset.id,
        secureUrl:  result.secure_url,
        uploadedAt: new Date(asset.createdAt),
      })
      setUploadState('idle')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erreur')
      setUploadState('error')
    }
  }

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border transition-colors"
      style={{
        borderColor: isDone ? 'var(--admin-emerald)' : 'var(--admin-border)',
        background:  isDone ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
      }}
    >
      {/* Step number / checkmark */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
        style={{
          background: isDone ? 'var(--admin-emerald)' : 'var(--admin-border)',
          color:      isDone ? 'white' : 'var(--admin-text-muted)',
        }}
      >
        {isDone ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          index + 1
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
          {checkpoint.label}
        </p>
        {isDone && checkpoint.photo && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-emerald)' }}>
            Téléchargé le {new Date(checkpoint.photo.uploadedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
        {errorMsg && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-red)' }}>{errorMsg}</p>
        )}
      </div>

      {/* Photo preview or upload button */}
      {isDone && checkpoint.photo ? (
        <a href={checkpoint.photo.secureUrl} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={checkpoint.photo.secureUrl}
            alt={checkpoint.label}
            className="w-14 h-10 rounded-lg object-cover border"
            style={{ borderColor: 'var(--admin-emerald)' }}
          />
        </a>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadPhoto(f)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadState === 'uploading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            {uploadState === 'uploading' ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 rounded-full" style={{ borderColor: 'var(--admin-text-muted)', borderTopColor: 'transparent' }} />
                Upload…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Télécharger
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}
