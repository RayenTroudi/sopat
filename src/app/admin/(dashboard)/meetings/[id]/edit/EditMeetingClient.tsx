'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveMeeting } from '@/lib/actions/meetings'

/**
 * Formulaire d'édition du FOR-MI-04.
 *
 * Reproduit la mise en page du formulaire officiel : en-tête, liste de
 * participants, puis les DEUX grilles — ordre du jour (prévu / traité) et plan
 * d'action (action, responsable, délai prévu, délai réalisé, suivi,
 * commentaires). Les deux grilles restent visuellement distinctes parce
 * qu'elles le sont sur le papier : confondre « ce dont on a parlé » et « ce
 * que quelqu'un s'est engagé à faire » est précisément l'erreur qu'un PV sert
 * à éviter.
 *
 * Les libellés de statut sont redéfinis ici plutôt qu'importés de `@/lib/db` :
 * un import de ce module tirerait le schéma Drizzle dans le bundle client.
 */
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  in_progress: 'En rédaction',
  completed: 'Validé',
}

const inputClass =
  'w-full px-2 py-1.5 rounded border text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
}

type MeetingHeader = {
  id: string
  reference: string
  meetingDate: string
  meetingType: string | null
  location: string | null
  projectId: string | null
  status: string
  revisionNumber: number
  recommendations: string | null
  nextMeetingDate: string | null
  nextMeetingTime: string | null
}

type ParticipantRow = {
  id?: string
  fullName: string
  position: string | null
  present: boolean
}

type AgendaRow = {
  id?: string
  plannedItem: string | null
  discussedPoints: string | null
}

type ActionRow = {
  id?: string
  description: string
  responsible: string | null
  targetDate: string | null
  actualDate: string | null
  followUp: string | null
  comments: string | null
}

type TrailEntry = {
  id: string
  action: string
  actorName: string
  occurredAt: string
  metadata: Record<string, unknown> | null
}

/** Colonnes de la grille « Plan d'action », dans l'ordre du formulaire. */
const ACTION_COLUMNS: {
  key: keyof ActionRow
  header: string
  kind?: 'date'
  width: string
}[] = [
  { key: 'description', header: 'Action', width: '2fr' },
  { key: 'responsible', header: 'Responsable(s)', width: '1fr' },
  { key: 'targetDate', header: 'Délai prévu', kind: 'date', width: '130px' },
  { key: 'actualDate', header: 'Délai réalisé', kind: 'date', width: '130px' },
  { key: 'followUp', header: 'Suivi', width: '1fr' },
  { key: 'comments', header: 'Commentaire(s)', width: '1.5fr' },
]

export default function EditMeetingClient({
  meeting,
  projects,
  participants: initialParticipants,
  agenda: initialAgenda,
  actions: initialActions,
  auditTrail,
}: {
  meeting: MeetingHeader
  projects: { id: string; name: string }[]
  participants: ParticipantRow[]
  agenda: AgendaRow[]
  actions: ActionRow[]
  auditTrail: TrailEntry[]
}) {
  const router = useRouter()

  const [header, setHeader] = useState({
    meetingDate: meeting.meetingDate,
    meetingType: meeting.meetingType ?? '',
    location: meeting.location ?? '',
    projectId: meeting.projectId ?? '',
    status: meeting.status,
    recommendations: meeting.recommendations ?? '',
    nextMeetingDate: meeting.nextMeetingDate ?? '',
    nextMeetingTime: meeting.nextMeetingTime ?? '',
  })
  const [participants, setParticipants] = useState<ParticipantRow[]>(initialParticipants)
  const [agenda, setAgenda] = useState<AgendaRow[]>(initialAgenda)
  const [actions, setActions] = useState<ActionRow[]>(initialActions)
  const [changeReason, setChangeReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Un PV validé ne se modifie pas comme un brouillon : le motif devient
   * obligatoire et l'enregistrement crée une révision. Le serveur applique la
   * même règle — ceci n'est que sa traduction à l'écran.
   */
  const isLocked = meeting.status === 'completed'
  const reasonMissing = isLocked && changeReason.trim().length === 0

  function setParticipant(index: number, patch: Partial<ParticipantRow>) {
    setParticipants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function setAgendaRow(index: number, patch: Partial<AgendaRow>) {
    setAgenda((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  function setActionRow(index: number, patch: Partial<ActionRow>) {
    setActions((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const result = await saveMeeting(meeting.id, {
      meetingDate: header.meetingDate,
      meetingType: header.meetingType || null,
      location: header.location || null,
      projectId: header.projectId || null,
      status: header.status as 'planned' | 'in_progress' | 'completed',
      recommendations: header.recommendations || null,
      nextMeetingDate: header.nextMeetingDate || null,
      nextMeetingTime: header.nextMeetingTime || null,
      participants: participants
        .filter((p) => p.fullName.trim().length > 0)
        .map((p, index) => ({
          id: p.id,
          fullName: p.fullName.trim(),
          position: p.position || null,
          present: p.present,
          sortOrder: index,
        })),
      agenda: agenda
        .filter((a) => (a.plannedItem ?? '').trim() || (a.discussedPoints ?? '').trim())
        .map((a, index) => ({
          id: a.id,
          plannedItem: a.plannedItem || null,
          discussedPoints: a.discussedPoints || null,
          sortOrder: index,
        })),
      actions: actions
        .filter((a) => a.description.trim().length > 0)
        .map((a, index) => ({
          id: a.id,
          description: a.description.trim(),
          responsible: a.responsible || null,
          targetDate: a.targetDate || null,
          actualDate: a.actualDate || null,
          followUp: a.followUp || null,
          comments: a.comments || null,
          sortOrder: index,
        })),
      changeReason: changeReason.trim() || undefined,
    })

    if (result.success) {
      router.push(`/admin/meetings/${meeting.id}`)
      router.refresh()
    } else {
      setError(result.error ?? 'Erreur inconnue')
      setSaving(false)
    }
  }

  const sectionStyle = {
    borderColor: 'var(--admin-border)',
    background: 'var(--admin-surface)',
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/meetings/${meeting.id}`}
            className="text-[13px] hover:opacity-70"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            PV {meeting.reference}
          </h1>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
          >
            {STATUS_LABELS[meeting.status] ?? meeting.status}
          </span>
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            rév. {meeting.revisionNumber}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          FOR-MI-04 — Procès-verbal de réunion
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}
        >
          {error}
        </div>
      )}

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-4" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          En-tête
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Date(s)</span>
            <input
              type="date"
              required
              value={header.meetingDate}
              onChange={(e) => setHeader({ ...header, meetingDate: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Projet associé</span>
            <select
              value={header.projectId}
              onChange={(e) => setHeader({ ...header, projectId: e.target.value })}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">— Aucun —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Type</span>
            <input
              value={header.meetingType}
              onChange={(e) => setHeader({ ...header, meetingType: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Lieu</span>
            <input
              value={header.location}
              onChange={(e) => setHeader({ ...header, location: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
        </div>
      </section>

      {/* ── Participants ────────────────────────────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-3" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Participant(s) — nom, prénom et poste
        </h2>
        <div className="space-y-2">
          {participants.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun participant. Ajoutez la première ligne ci-dessous.
            </p>
          )}
          {participants.map((p, index) => (
            <div key={p.id ?? `new-${index}`} className="grid gap-2 items-center"
              style={{ gridTemplateColumns: '1.5fr 1.5fr auto auto' }}>
              <input
                value={p.fullName}
                placeholder="Nom et prénom"
                onChange={(e) => setParticipant(index, { fullName: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
              <input
                value={p.position ?? ''}
                placeholder="Poste"
                onChange={(e) => setParticipant(index, { position: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
              <label className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                <input
                  type="checkbox"
                  checked={p.present}
                  onChange={(e) => setParticipant(index, { present: e.target.checked })}
                />
                Présent
              </label>
              <button
                type="button"
                onClick={() => setParticipants((rows) => rows.filter((_, i) => i !== index))}
                className="px-2 py-1 rounded border text-xs"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setParticipants((rows) => [...rows, { fullName: '', position: '', present: true }])
          }
          className="text-[13px] px-3 py-1.5 rounded border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
        >
          + Participant
        </button>
      </section>

      {/* ── Grille 1 : ordre du jour ────────────────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-3" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Ordre du jour
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-2">
            <div className="grid gap-2 text-[12px] font-medium"
              style={{ gridTemplateColumns: '40px 1fr 1fr auto', color: 'var(--admin-text-muted)' }}>
              <span>N°</span>
              <span>Ordre de jour prévu</span>
              <span>Points traités</span>
              <span />
            </div>
            {agenda.map((a, index) => (
              <div key={a.id ?? `new-${index}`} className="grid gap-2 items-start"
                style={{ gridTemplateColumns: '40px 1fr 1fr auto' }}>
                <span className="text-[13px] pt-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {index + 1}
                </span>
                <textarea
                  rows={2}
                  value={a.plannedItem ?? ''}
                  onChange={(e) => setAgendaRow(index, { plannedItem: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
                <textarea
                  rows={2}
                  value={a.discussedPoints ?? ''}
                  onChange={(e) => setAgendaRow(index, { discussedPoints: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setAgenda((rows) => rows.filter((_, i) => i !== index))}
                  className="px-2 py-1 rounded border text-xs mt-1"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAgenda((rows) => [...rows, { plannedItem: '', discussedPoints: '' }])}
          className="text-[13px] px-3 py-1.5 rounded border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
        >
          + Point à l&apos;ordre du jour
        </button>
      </section>

      {/* ── Grille 2 : plan d'action ────────────────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-3" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Plan d&apos;action
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[1100px] space-y-2">
            <div
              className="grid gap-2 text-[12px] font-medium"
              style={{
                gridTemplateColumns: `40px ${ACTION_COLUMNS.map((c) => c.width).join(' ')} auto`,
                color: 'var(--admin-text-muted)',
              }}
            >
              <span>N°</span>
              {ACTION_COLUMNS.map((c) => (
                <span key={c.key}>{c.header}</span>
              ))}
              <span />
            </div>
            {actions.map((a, index) => (
              <div
                key={a.id ?? `new-${index}`}
                className="grid gap-2 items-start"
                style={{ gridTemplateColumns: `40px ${ACTION_COLUMNS.map((c) => c.width).join(' ')} auto` }}
              >
                <span className="text-[13px] pt-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {index + 1}
                </span>
                {ACTION_COLUMNS.map((c) =>
                  c.kind === 'date' ? (
                    <input
                      key={c.key}
                      type="date"
                      value={(a[c.key] as string | null) ?? ''}
                      onChange={(e) => setActionRow(index, { [c.key]: e.target.value } as Partial<ActionRow>)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  ) : (
                    <textarea
                      key={c.key}
                      rows={2}
                      value={(a[c.key] as string | null) ?? ''}
                      onChange={(e) => setActionRow(index, { [c.key]: e.target.value } as Partial<ActionRow>)}
                      className={inputClass}
                      style={inputStyle}
                    />
                  )
                )}
                <button
                  type="button"
                  onClick={() => setActions((rows) => rows.filter((_, i) => i !== index))}
                  className="px-2 py-1 rounded border text-xs mt-1"
                  style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-red)' }}
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            setActions((rows) => [
              ...rows,
              {
                description: '',
                responsible: '',
                targetDate: '',
                actualDate: '',
                followUp: '',
                comments: '',
              },
            ])
          }
          className="text-[13px] px-3 py-1.5 rounded border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-accent)' }}
        >
          + Action
        </button>
      </section>

      {/* ── Recommandations et prochaine réunion ────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-4" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Recommandations
        </h2>
        <textarea
          rows={3}
          value={header.recommendations}
          onChange={(e) => setHeader({ ...header, recommendations: e.target.value })}
          className={inputClass}
          style={inputStyle}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
              Date prévue de la prochaine réunion
            </span>
            <input
              type="date"
              value={header.nextMeetingDate}
              onChange={(e) => setHeader({ ...header, nextMeetingDate: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Heure</span>
            <input
              type="time"
              value={header.nextMeetingTime}
              onChange={(e) => setHeader({ ...header, nextMeetingTime: e.target.value })}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>Statut</span>
            <select
              value={header.status}
              onChange={(e) => setHeader({ ...header, status: e.target.value })}
              className={inputClass}
              style={inputStyle}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── Motif de modification ───────────────────────────────────────── */}
      <section className="rounded-xl border p-5 space-y-3" style={sectionStyle}>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          Motif de la modification {isLocked && <span style={{ color: 'var(--admin-red)' }}>*</span>}
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
          {isLocked
            ? `Ce PV est validé. Toute modification est une révision : elle passera en rév. ${meeting.revisionNumber + 1} et le motif sera conservé au journal avec le détail de ce qui change (ISO 9001:2015 §7.5.3.2).`
            : 'Facultatif tant que le PV n’est pas validé. Il devient obligatoire ensuite.'}
        </p>
        <textarea
          rows={2}
          required={isLocked}
          value={changeReason}
          onChange={(e) => setChangeReason(e.target.value)}
          placeholder="Ex. : délai de l’action 3 repoussé à la demande du client"
          className={inputClass}
          style={inputStyle}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || reasonMissing}
          className="px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-50"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          {saving
            ? 'Enregistrement…'
            : isLocked
              ? `Enregistrer en révision ${meeting.revisionNumber + 1}`
              : 'Enregistrer'}
        </button>
        {reasonMissing && (
          <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
            Renseignez le motif pour pouvoir enregistrer.
          </span>
        )}
      </div>

      {/* ── Historique ──────────────────────────────────────────────────── */}
      {auditTrail.length > 0 && (
        <section className="rounded-xl border p-5 space-y-2" style={sectionStyle}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Historique du PV
          </h2>
          <ul className="space-y-1.5">
            {auditTrail.map((entry) => {
              const reason = entry.metadata?.changeReason
              return (
                <li key={entry.id} className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
                  <span style={{ color: 'var(--admin-text)' }}>
                    {new Date(entry.occurredAt).toLocaleString('fr-FR')} — {entry.actorName}
                  </span>{' '}
                  · {entry.action}
                  {typeof reason === 'string' && reason.length > 0 && <> · « {reason} »</>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </form>
  )
}
