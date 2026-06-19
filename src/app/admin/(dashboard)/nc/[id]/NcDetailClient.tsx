'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NcDetail, CapaDetail } from '@/lib/db/iso'
import { CloudinaryUploader } from '@/components/upload/CloudinaryUploader'

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', in_progress: 'En cours', closed: 'Clôturé', verified: 'Vérifié',
}
const STATUS_COLORS: Record<string, string> = {
  open:        'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
  in_progress: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  closed:      'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
  verified:    'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
}
const PROCESS_LABELS: Record<string, string> = {
  etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
}
const CAPA_STATUS_LABELS: Record<string, string> = {
  open: 'Ouverte', in_progress: 'En cours', closed: 'Clôturée',
}
const NC_TYPE_LABELS: Record<string, string> = {
  technique: 'Technique', documentaire: 'Doc.', reclamation_client: 'Réclamation client', audit: 'Audit', systeme: 'Système',
}

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

type User = { id: string; name: string; email: string; role: string }

type Props = {
  nc:              NcDetail
  users:           User[]
  currentUserId:   string
  currentUserName: string
}

export function NcDetailClient({ nc: initialNc, users, currentUserId, currentUserName }: Props) {
  const [nc, setNc] = useState(initialNc)
  const [status, setStatus] = useState('')
  const [rootCause, setRootCause] = useState(nc.rootCause ?? '')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  // CAPA form
  const [showCapaForm, setShowCapaForm] = useState(false)
  const [capaForm, setCapaForm] = useState({ actionDescription: '', responsibleId: '', deadline: '', notes: '' })
  const [capaSubmitting, setCapaSubmitting] = useState(false)
  const [capaError, setCapaError] = useState('')

  async function reload() {
    const res = await fetch(`/api/nc/${nc.id}`)
    if (res.ok) setNc(await res.json() as NcDetail)
  }

  async function updateStatus() {
    if (!status) return
    setStatusLoading(true)
    setStatusError('')
    const res = await fetch(`/api/nc/${nc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rootCause: rootCause || undefined }),
    })
    const data = await res.json() as NcDetail & { error?: string }
    if (!res.ok) { setStatusError(data.error ?? 'Erreur'); setStatusLoading(false); return }
    setNc(data)
    setStatus('')
    setStatusLoading(false)
  }

  async function submitCapa() {
    if (!capaForm.actionDescription.trim() || capaForm.actionDescription.length < 10) {
      setCapaError('L\'action doit comporter au moins 10 caractères')
      return
    }
    if (!capaForm.responsibleId) { setCapaError('Sélectionnez un responsable'); return }
    setCapaSubmitting(true)
    setCapaError('')
    const res = await fetch(`/api/nc/${nc.id}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionDescription: capaForm.actionDescription,
        responsibleId:     capaForm.responsibleId,
        deadline:          capaForm.deadline ? new Date(capaForm.deadline).toISOString() : undefined,
        notes:             capaForm.notes || undefined,
      }),
    })
    const data = await res.json() as { id?: string; error?: string }
    if (!res.ok) { setCapaError(data.error ?? 'Erreur'); setCapaSubmitting(false); return }
    setShowCapaForm(false)
    setCapaForm({ actionDescription: '', responsibleId: '', deadline: '', notes: '' })
    await reload()
    setCapaSubmitting(false)
  }

  async function updateCapa(capaId: string, patch: Record<string, unknown>) {
    await fetch(`/api/nc/${nc.id}/capa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capaId, ...patch }),
    })
    await reload()
  }

  const isOverdue = nc.deadline && new Date(nc.deadline) < new Date() && nc.status !== 'closed' && nc.status !== 'verified'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/nc" className="hover:underline">Non-Conformités</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text)' }}>{nc.reference}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold font-mono" style={{ color: 'var(--admin-text)' }}>{nc.reference}</h1>
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[nc.status])}>
                {STATUS_LABELS[nc.status]}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-[var(--admin-red-dim)] text-[var(--admin-red)]">
                  En retard
                </span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {(nc as any).ncType ? NC_TYPE_LABELS[(nc as any).ncType] : (PROCESS_LABELS[nc.processAffected] ?? nc.processAffected)}
              {(nc as any).ownerType ? ` · ${(nc as any).ownerType === 'interne' ? 'Interne' : 'Externe'}` : ''}
              {(nc as any).auditorName ? ` · Auditeur : ${(nc as any).auditorName}` : ''}
              {nc.projectName ? ` · ${nc.projectName}` : ''}
              {' · '}Détectée le {fmt(nc.detectedAt)} par {nc.detectedByName ?? '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <InfoCell label="Assigné à"   value={nc.assignedToName ?? '—'} />
          <InfoCell label="Délai"       value={fmt(nc.deadline)} highlight={!!isOverdue} />
          <InfoCell label="Clôturé par" value={nc.closedByName ?? '—'} />
          <InfoCell label="Clôturé le"  value={fmt(nc.closedAt)} />
        </div>
      </div>

      {/* Description */}
      <Card title="Description">
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{nc.description}</p>
      </Card>

      {/* Root cause */}
      <Card title="Analyse des causes racines">
        <textarea
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          rows={3}
          placeholder="Causes racines identifiées par analyse (5 pourquoi, Ishikawa…)"
          disabled={nc.status === 'closed' || nc.status === 'verified'}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
        />
      </Card>

      {/* Photos avant/après */}
      <Card title="Photos (avant / après)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Photo avant</p>
            {(nc as any).beforePhotoUrl ? (
              <img src={(nc as any).beforePhotoUrl} alt="Avant" className="w-full rounded-lg object-cover max-h-48" />
            ) : (
              <CloudinaryUploader
                projectId={nc.id}
                assetType="other"
                accept="image/*"
                label="Téléverser photo avant"
                maxFiles={1}
                onUploaded={(asset) => {
                  void fetch(`/api/nc/${nc.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ beforePhotoAssetId: asset.id }),
                  }).then(() => window.location.reload())
                }}
              />
            )}
          </div>
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>Photo après</p>
            {(nc as any).afterPhotoUrl ? (
              <img src={(nc as any).afterPhotoUrl} alt="Après" className="w-full rounded-lg object-cover max-h-48" />
            ) : (
              <CloudinaryUploader
                projectId={nc.id}
                assetType="other"
                accept="image/*"
                label="Téléverser photo après"
                maxFiles={1}
                onUploaded={(asset) => {
                  void fetch(`/api/nc/${nc.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ afterPhotoAssetId: asset.id }),
                  }).then(() => window.location.reload())
                }}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Status change */}
      {nc.status !== 'verified' && (
        <Card title="Changer le statut">
          <div className="flex gap-3 flex-wrap">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border flex-1"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
            >
              <option value="">— Sélectionner un statut —</option>
              <option value="in_progress">En cours</option>
              <option value="closed">Clôturer</option>
              <option value="verified">Vérifier (indépendant)</option>
            </select>
            <button
              onClick={() => void updateStatus()}
              disabled={!status || statusLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {statusLoading ? 'Mise à jour…' : 'Appliquer'}
            </button>
          </div>
          {statusError && <p className="text-sm mt-2" style={{ color: 'var(--admin-red)' }}>{statusError}</p>}
          <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>
            La clôture requiert : action corrective créée ✓, preuve téléchargée ✓, vérification par un utilisateur différent du détecteur ✓
          </p>
        </Card>
      )}

      {/* CAPA section */}
      <Card
        title={`Actions Correctives (CAPA) — ${nc.capa.length} action${nc.capa.length !== 1 ? 's' : ''}`}
        action={
          nc.status !== 'closed' && nc.status !== 'verified' && (
            <button
              onClick={() => setShowCapaForm(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              + Ajouter CAPA
            </button>
          )
        }
      >
        {nc.capa.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune action corrective enregistrée.
          </p>
        ) : (
          <div className="space-y-4">
            {nc.capa.map((capa) => (
              <CapaCard
                key={capa.id}
                capa={capa}
                ncId={nc.id}
                currentUserId={currentUserId}
                ncDetectedById={nc.detectedById}
                onUpdate={updateCapa}
                isNcClosed={nc.status === 'closed' || nc.status === 'verified'}
              />
            ))}
          </div>
        )}

        {/* CAPA create form */}
        {showCapaForm && (
          <div className="mt-4 p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Nouvelle action corrective</h4>
            <div className="space-y-3">
              <FormField label="Description de l'action *">
                <textarea
                  value={capaForm.actionDescription}
                  onChange={(e) => setCapaForm((f) => ({ ...f, actionDescription: e.target.value }))}
                  rows={3}
                  placeholder="Décrivez précisément l'action corrective à mener…"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Responsable *">
                  <select
                    value={capaForm.responsibleId}
                    onChange={(e) => setCapaForm((f) => ({ ...f, responsibleId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  >
                    <option value="">— Sélectionner —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Délai">
                  <input
                    type="date"
                    value={capaForm.deadline}
                    onChange={(e) => setCapaForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                  />
                </FormField>
              </div>
              <FormField label="Notes">
                <input
                  value={capaForm.notes}
                  onChange={(e) => setCapaForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes complémentaires…"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
                />
              </FormField>
            </div>
            {capaError && <p className="text-sm" style={{ color: 'var(--admin-red)' }}>{capaError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowCapaForm(false)} className="px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Annuler
              </button>
              <button onClick={() => void submitCapa()} disabled={capaSubmitting} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
                {capaSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CapaCard({
  capa,
  ncId,
  currentUserId,
  ncDetectedById,
  onUpdate,
  isNcClosed,
}: {
  capa: CapaDetail
  ncId: string
  currentUserId: string
  ncDetectedById: string
  onUpdate: (capaId: string, patch: Record<string, unknown>) => Promise<void>
  isNcClosed: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const isVerifier = currentUserId !== ncDetectedById

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--admin-text)' }}>
          {capa.actionDescription}
        </p>
        <span className={cn('text-xs px-2 py-0.5 rounded font-medium shrink-0', {
          'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]': capa.status === 'open',
          'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]':  capa.status === 'in_progress',
          'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]': capa.status === 'closed',
        })}>
          {CAPA_STATUS_LABELS[capa.status] ?? capa.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <span>Responsable : {capa.responsibleName ?? '—'}</span>
        <span>Délai : {capa.deadline ? new Date(capa.deadline).toLocaleDateString('fr-FR') : '—'}</span>
        {capa.effectivenessVerified && (
          <span className="col-span-2" style={{ color: 'var(--admin-emerald)' }}>
            ✓ Efficacité vérifiée par {capa.verifiedByName} le {new Date(capa.verifiedAt!).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      {!isNcClosed && (
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Status toggle */}
          {capa.status !== 'closed' && (
            <button
              onClick={() => void onUpdate(capa.id, { status: capa.status === 'open' ? 'in_progress' : 'closed' })}
              className="text-xs px-3 py-1 rounded-lg border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              {capa.status === 'open' ? 'Marquer en cours' : 'Clôturer'}
            </button>
          )}

          {/* Evidence upload */}
          {!capa.evidenceAssetId && (
            <div>
              <CloudinaryUploader
                projectId={ncId}
                assetType="other"
                accept=".pdf,image/*"
                label="Joindre une preuve"
                maxFiles={1}
                onUploaded={(asset) => void onUpdate(capa.id, { evidenceAssetId: asset.id, status: 'closed' })}
              />
            </div>
          )}
          {capa.evidenceUrl && (
            <a href={capa.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>
              Voir la preuve
            </a>
          )}

          {/* Verify effectiveness — ISO: must be different from detector */}
          {!capa.effectivenessVerified && capa.evidenceAssetId && isVerifier && (
            <button
              onClick={() => void onUpdate(capa.id, { effectivenessVerified: true })}
              className="text-xs px-3 py-1 rounded-lg text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              ✓ Vérifier l&apos;efficacité
            </button>
          )}
          {!capa.effectivenessVerified && capa.evidenceAssetId && !isVerifier && (
            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              La vérification doit être effectuée par un autre utilisateur (ISO 9001)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: highlight ? 'var(--admin-red)' : 'var(--admin-text)' }}>{value}</p>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
