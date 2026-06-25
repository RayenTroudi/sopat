'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RsePartnershipDetail } from '@/lib/db/rse'
import { RsePartnershipsBadge } from '../RsePartnershipsBadge'
import type { TeamMemberRow } from '@/lib/db/team'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TEAM_NAME_LABELS: Record<string, string> = {
  equipe_sd_pat: 'Équipe SD Pat',
  equipe_convention: 'Équipe Convention',
}

const STATUS_OPTIONS = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_cours_de_negociation', label: 'En négociation' },
  { value: 'resilie', label: 'Résilié' },
  { value: 'expire', label: 'Expiré' },
]

function fmt(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
      <dd className="text-sm" style={{ color: 'var(--admin-text)' }}>{value ?? '—'}</dd>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
      </div>
      <dl className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</dl>
    </div>
  )
}

export function ConventionTab({
  partnership,
  isAdminOrDirection,
  allUsers,
}: {
  partnership: RsePartnershipDetail
  isAdminOrDirection: boolean
  allUsers: TeamMemberRow[]
}) {
  const router = useRouter()
  const [changingStatus, setChangingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(partnership.status)
  const [saving, setSaving] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const now = new Date()
  const endDate = partnership.endDate ? new Date(partnership.endDate) : null
  const daysUntilExpiry = endDate
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  async function handleStatusChange() {
    setSaving(true)
    const res = await fetch(`/api/rse/partnerships/${partnership.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
    setChangingStatus(false)
    if (res.ok) router.refresh()
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfError(null)
    setUploadingPdf(true)

    try {
      // 1. Get signed params
      const signRes = await fetch(
        `/api/upload/rse-sign?partnershipId=${partnership.id}&assetType=rse_convention`
      )
      if (!signRes.ok) throw new Error('Impossible d\'obtenir la signature')
      const { signature, timestamp, cloudName, apiKey, folder } = await signRes.json()

      // 2. Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', timestamp)
      formData.append('signature', signature)
      formData.append('folder', folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Échec du téléversement')
      const uploadData = await uploadRes.json()

      // 3. Record asset in DB
      const recordRes = await fetch('/api/upload/rse-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: uploadData.public_id,
          url: uploadData.url,
          secureUrl: uploadData.secure_url,
          assetType: 'rse_convention',
          format: uploadData.format,
          bytes: uploadData.bytes,
          partnershipId: partnership.id,
        }),
      })
      if (!recordRes.ok) throw new Error('Erreur lors de l\'enregistrement')
      const asset = await recordRes.json()

      // 4. Link to partnership
      await fetch(`/api/rse/partnerships/${partnership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conventionPdfCloudinaryId: asset.id }),
      })

      router.refresh()
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setUploadingPdf(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Renewal countdown */}
      {daysUntilExpiry !== null && (
        <div
          className="rounded-xl border p-4 flex items-center gap-4"
          style={{
            borderColor: daysUntilExpiry <= 0
              ? 'var(--admin-red)'
              : daysUntilExpiry <= 60
              ? 'var(--admin-amber)'
              : 'var(--admin-border)',
            background: daysUntilExpiry <= 0
              ? 'var(--admin-red-dim)'
              : daysUntilExpiry <= 60
              ? 'var(--admin-amber-dim)'
              : 'var(--admin-surface)',
          }}
        >
          <div className="text-3xl font-bold" style={{
            color: daysUntilExpiry <= 0 ? 'var(--admin-red)' : daysUntilExpiry <= 60 ? 'var(--admin-amber)' : 'var(--admin-text)',
          }}>
            {daysUntilExpiry <= 0 ? 'Expiré' : `J-${daysUntilExpiry}`}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
              {daysUntilExpiry <= 0
                ? 'La convention est arrivée à échéance'
                : daysUntilExpiry <= 60
                ? 'La convention expire bientôt'
                : 'Avant l\'expiration de la convention'}
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Date de fin : {fmt(partnership.endDate)}
              {partnership.autoRenewal && ' · Renouvellement automatique activé'}
              {partnership.noticePeriodDays > 0 && ` · Préavis : ${partnership.noticePeriodDays} jours`}
            </p>
          </div>
        </div>
      )}

      {/* Partner info */}
      <Card title="Informations partenaire">
        <InfoRow label="Nom" value={partnership.partnerName} />
        <InfoRow label="Adresse" value={partnership.partnerAddress} />
        <InfoRow label="Contact partenaire" value={partnership.partnerContactName} />
        <InfoRow label="Email contact" value={partnership.partnerContactEmail} />
        <InfoRow label="Téléphone contact" value={partnership.partnerContactPhone} />
        <InfoRow label="Référent convention (partenaire)" value={partnership.partnerReferentName} />
      </Card>

      {/* Convention details */}
      <Card title="Convention">
        <InfoRow label="Référence" value={<span className="font-mono">{partnership.conventionReference}</span>} />
        <InfoRow label="Référent SOPAT" value={partnership.sopatReferentName} />
        <InfoRow label="Statut" value={<RsePartnershipsBadge status={partnership.status} />} />
        <InfoRow label="Date de signature" value={fmt(partnership.signedDate)} />
        <InfoRow label="Date de début" value={fmt(partnership.startDate)} />
        <InfoRow label="Préavis" value={`${partnership.noticePeriodDays} jours`} />
        <InfoRow label="Renouvellement auto." value={partnership.autoRenewal ? 'Oui' : 'Non'} />
        {partnership.teamName && (
          <InfoRow label="Équipe" value={TEAM_NAME_LABELS[partnership.teamName] ?? partnership.teamName} />
        )}
        {partnership.teamLeadName && (
          <InfoRow label="Chef d'équipe" value={partnership.teamLeadName} />
        )}
      </Card>

      {/* Notes */}
      {partnership.notes && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>Notes</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{partnership.notes}</p>
        </div>
      )}

      {/* PDF convention */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--admin-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Convention signée (PDF)</h3>
          {isAdminOrDirection && (
            <label className="cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
              {uploadingPdf ? 'Téléversement...' : partnership.conventionPdfUrl ? 'Remplacer' : 'Téléverser'}
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
            </label>
          )}
        </div>
        <div className="p-5">
          {pdfError && <p className="text-xs text-[#2F6F4F] mb-3">{pdfError}</p>}
          {partnership.conventionPdfUrl ? (
            <div className="space-y-3">
              <a
                href={partnership.conventionPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium"
                style={{ color: 'var(--admin-emerald)' }}
              >
                📄 Ouvrir le PDF →
              </a>
              <iframe
                src={`${partnership.conventionPdfUrl}#toolbar=0`}
                className="w-full rounded-lg border"
                style={{ height: '500px', borderColor: 'var(--admin-border)' }}
              />
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune convention PDF téléversée.
            </p>
          )}
        </div>
      </div>

      {/* Status management (admin/direction only) */}
      {isAdminOrDirection && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Gestion du statut</p>
          {changingStatus ? (
            <div className="flex items-center gap-3">
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                <SelectTrigger className="text-sm h-9 bg-[#F4F8F5] w-44" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#F4F8F5]" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={handleStatusChange}
                disabled={saving}
                className="px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
                style={{ background: 'var(--admin-emerald)', color: '#fff' }}
              >
                {saving ? 'Sauvegarde...' : 'Confirmer'}
              </button>
              <button
                onClick={() => { setChangingStatus(false); setNewStatus(partnership.status) }}
                className="px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setChangingStatus(true)}
              className="px-3 py-2 text-sm rounded-lg border transition-colors"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Changer le statut
            </button>
          )}
        </div>
      )}
    </div>
  )
}
