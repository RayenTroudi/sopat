import Link from 'next/link'
import { redirect } from 'next/navigation'
import { authorizeMeetingAccess } from '@/lib/meetings/authorization'
import { listAiMeetings, getAiMeetingCounts } from '@/lib/db/ai-meetings'
import { MeetingStatusBadge } from '@/components/meetings/MeetingStatusBadge'
import { PLATFORM_LABELS, type MeetingPlatform } from '@/lib/recall/types'
import { isRecallConfigured } from '@/lib/recall/client'
import { isOpenAiConfigured } from '@/lib/ai/openai'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Réunions IA | SOPAT Admin' }

/**
 * Tableau de bord des réunions assistées.
 *
 * Aucune génération n'est déclenchée ici : la page lit ce qui est déjà stocké.
 * Ouvrir cet écran ne coûte donc jamais un appel OpenAI.
 */

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

function formatDateTime(value: Date | null, fallback: string): string {
  if (!value) return fallback
  return value.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AiMeetingsPage() {
  const authorized = await authorizeMeetingAccess()
  if (!authorized.ok) redirect(authorized.status === 401 ? '/login' : '/admin')

  const [rows, counts] = await Promise.all([listAiMeetings(), getAiMeetingCounts()])

  const cards = [
    { label: 'À venir', value: (counts.scheduled ?? 0) + (counts.bot_created ?? 0) },
    { label: 'En cours', value: (counts.joining ?? 0) + (counts.in_meeting ?? 0) },
    { label: 'En traitement', value: counts.processing ?? 0 },
    { label: 'Terminées', value: counts.completed ?? 0 },
    { label: 'En échec', value: counts.failed ?? 0 },
  ]

  const configured = isRecallConfigured() && isOpenAiConfigured()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}
          >
            Réunions IA
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Assistant de réunion — transcription et compte rendu automatiques (FOR-MI-04)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/meetings"
            className="text-[13px] px-3 py-1.5 rounded border transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            PV manuels
          </Link>
          <Link
            href="/admin/meetings/ai/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouvelle réunion
          </Link>
        </div>
      </div>

      {!configured && (
        <div
          className="rounded-xl border p-4 text-[13px]"
          style={{
            borderColor: 'var(--admin-amber)',
            background: 'var(--admin-amber-dim)',
            color: 'var(--admin-text)',
          }}
        >
          L&apos;assistant n&apos;est pas entièrement configuré. Renseignez{' '}
          <code>RECALL_API_KEY</code>, <code>OPENAI_API_KEY</code> et <code>OPENAI_MODEL</code>{' '}
          côté serveur pour activer la programmation des bots et l&apos;analyse.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              {label}
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réunion', 'Date prévue', 'Plateforme', 'Statut', 'Durée', 'Créée par', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[11px] font-medium"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ meeting, creatorName }) => (
                <tr
                  key={meeting.id}
                  className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                  style={{ borderTop: '1px solid var(--admin-border)' }}
                >
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                      {meeting.meetingType ?? 'Réunion'}
                    </p>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
                    >
                      {meeting.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {formatDateTime(
                      meeting.scheduledAt,
                      new Date(meeting.meetingDate).toLocaleDateString('fr-FR'),
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {meeting.platform ? PLATFORM_LABELS[meeting.platform as MeetingPlatform] : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={meeting.aiStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {formatDuration(meeting.durationSeconds)}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {creatorName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/meetings/${meeting.id}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    Aucune réunion assistée.{' '}
                    <Link
                      href="/admin/meetings/ai/new"
                      style={{ color: 'var(--admin-accent)' }}
                      className="hover:underline"
                    >
                      Programmer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
