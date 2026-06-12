'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BilanPrint } from './BilanPrint'

type Results = {
  id: string
  eventId: string
  wasteCollectedKg: string | null
  treesPlanted: number | null
  participantsActual: number | null
  beachLengthCleanedM: string | null
  zonesTreated: number | null
  mediaCoverage: boolean
  pressArticlesCount: number | null
  socialMediaReach: number | null
  satisfactionScore: number | null
  lessonsLearned: string | null
  postEventReportCloudinaryId: string | null
  photosAlbumCloudinaryIds: string[] | null
  submittedAt: Date | string | null
} | null

export function ResultatsTab({
  eventId,
  event,
  results,
  canEdit,
  currentUserId,
}: {
  eventId: string
  event: Record<string, unknown>
  results: Results
  canEdit: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const isPublished = event.status === 'termine'

  const [form, setForm] = useState({
    wasteCollectedKg: results?.wasteCollectedKg ?? '',
    treesPlanted: results?.treesPlanted ?? '',
    participantsActual: results?.participantsActual ?? '',
    beachLengthCleanedM: results?.beachLengthCleanedM ?? '',
    zonesTreated: results?.zonesTreated ?? '',
    mediaCoverage: results?.mediaCoverage ?? false,
    pressArticlesCount: results?.pressArticlesCount ?? '',
    socialMediaReach: results?.socialMediaReach ?? '',
    satisfactionScore: results?.satisfactionScore ?? 0,
    lessonsLearned: results?.lessonsLearned ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showBilan, setShowBilan] = useState(false)

  function update(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const body = {
      wasteCollectedKg: form.wasteCollectedKg ? String(form.wasteCollectedKg) : null,
      treesPlanted: form.treesPlanted !== '' ? Number(form.treesPlanted) : null,
      participantsActual: form.participantsActual !== '' ? Number(form.participantsActual) : null,
      beachLengthCleanedM: form.beachLengthCleanedM ? String(form.beachLengthCleanedM) : null,
      zonesTreated: form.zonesTreated !== '' ? Number(form.zonesTreated) : null,
      mediaCoverage: form.mediaCoverage,
      pressArticlesCount: form.pressArticlesCount !== '' ? Number(form.pressArticlesCount) : null,
      socialMediaReach: form.socialMediaReach !== '' ? Number(form.socialMediaReach) : null,
      satisfactionScore: form.satisfactionScore || null,
      lessonsLearned: form.lessonsLearned || null,
    }

    const method = results ? 'PATCH' : 'POST'
    const res = await fetch(`/api/rse/events/${eventId}/results`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) router.refresh()
  }

  async function publish() {
    setPublishing(true)
    const res = await fetch(`/api/rse/events/${eventId}/results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    })
    setPublishing(false)
    if (res.ok) router.refresh()
  }

  const fieldStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <div className="space-y-6">
      {isPublished && (
        <div
          className="rounded-lg border px-4 py-3 flex items-center justify-between"
          style={{ borderColor: '#166534', background: '#f0fdf4' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-700 font-medium text-sm">Bilan publié</span>
            <span className="text-xs text-green-600">— Événement terminé</span>
          </div>
          <button
            onClick={() => { setShowBilan(true); setTimeout(() => window.print(), 200) }}
            className="text-sm px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#166534', color: '#fff' }}
          >
            🖨 Imprimer le bilan
          </button>
        </div>
      )}

      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <h3 className="font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
          Indicateurs de résultat
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Déchets collectés (kg)" value={form.wasteCollectedKg} onChange={(v) => update('wasteCollectedKg', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Arbres plantés" value={form.treesPlanted} onChange={(v) => update('treesPlanted', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Participants réels" value={form.participantsActual} onChange={(v) => update('participantsActual', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Longueur plage nettoyée (m)" value={form.beachLengthCleanedM} onChange={(v) => update('beachLengthCleanedM', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Zones traitées" value={form.zonesTreated} onChange={(v) => update('zonesTreated', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Articles presse" value={form.pressArticlesCount} onChange={(v) => update('pressArticlesCount', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
          <Field label="Portée réseaux sociaux" value={form.socialMediaReach} onChange={(v) => update('socialMediaReach', v)} type="number" disabled={!canEdit || isPublished} style={fieldStyle} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.mediaCoverage}
            onChange={(e) => update('mediaCoverage', e.target.checked)}
            disabled={!canEdit || isPublished}
            id="mediaCoverage"
          />
          <label htmlFor="mediaCoverage" className="text-sm" style={{ color: 'var(--admin-text)' }}>
            Couverture médias
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
            Score de satisfaction (1–5)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => !isPublished && canEdit && update('satisfactionScore', n)}
                disabled={!canEdit || isPublished}
                className="w-9 h-9 rounded-full text-sm font-bold border transition-colors"
                style={{
                  background: form.satisfactionScore === n ? 'var(--admin-emerald)' : 'var(--admin-bg)',
                  borderColor: form.satisfactionScore === n ? 'var(--admin-emerald)' : 'var(--admin-border)',
                  color: form.satisfactionScore === n ? '#fff' : 'var(--admin-text)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>
            Leçons apprises
          </label>
          <textarea
            value={String(form.lessonsLearned)}
            onChange={(e) => update('lessonsLearned', e.target.value)}
            rows={3}
            disabled={!canEdit || isPublished}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={fieldStyle}
          />
        </div>

        {canEdit && !isPublished && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
            </button>
            <button
              onClick={publish}
              disabled={publishing}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#166534', color: '#fff' }}
            >
              {publishing ? 'Publication…' : '✓ Publier le bilan'}
            </button>
          </div>
        )}
      </div>

      {/* Hidden bilan for printing */}
      {showBilan && (
        <BilanPrint
          event={event}
          results={results}
          onClose={() => setShowBilan(false)}
        />
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
  style,
}: {
  label: string
  value: unknown
  onChange: (v: string) => void
  type?: string
  disabled?: boolean
  style: React.CSSProperties
}) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      <input
        type={type}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={style}
        min={0}
        step={type === 'number' ? '0.01' : undefined}
      />
    </div>
  )
}
