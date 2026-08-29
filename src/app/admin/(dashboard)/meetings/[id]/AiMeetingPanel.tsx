import { getAiMeetingById } from '@/lib/db/ai-meetings'
import { MeetingStatusBadge } from '@/components/meetings/MeetingStatusBadge'
import { PLATFORM_LABELS, type MeetingPlatform } from '@/lib/recall/types'
import { AI_STATUS_LABELS, type MeetingAiStatus } from '@/lib/meetings/status'
import { BOT_DISPLAY_NAME } from '@/lib/meetings/bot-name'
import { AiReportSections } from './AiReportSections'
import AiMeetingControls from './AiMeetingControls'
import TranscriptViewer from './TranscriptViewer'

/**
 * Bloc « assistant IA » de la fiche réunion.
 *
 * Rendu UNIQUEMENT pour les réunions dont source = 'ai_assistant'. Les PV
 * saisis à la main gardent leur écran d'origine, inchangé.
 *
 * Lecture seule : la page n'appelle jamais le modèle ni Recall, elle affiche ce
 * qui est déjà stocké.
 */

const EMAIL_LABELS: Record<string, string> = {
  pending: 'En attente',
  sent: 'Envoyé',
  failed: 'Échec',
  skipped: 'Non demandé',
}

/** Codes techniques traduits : l'utilisateur ne doit pas lire nos internes. */
const ERROR_LABELS: Record<string, string> = {
  recall_auth_failed:     "Authentification Recall.ai refusée — vérifiez la clé d'API.",
  recall_unreachable:     'Recall.ai est injoignable.',
  recall_unavailable:     'Recall.ai est momentanément indisponible.',
  recall_rate_limited:    'Trop de requêtes vers Recall.ai — réessayez plus tard.',
  bot_creation_failed:    "Le bot n'a pas pu être créé.",
  transcript_unavailable: 'La transcription est indisponible.',
  transcript_fetch_failed:'La transcription n’a pas pu être récupérée.',
  ai_auth_failed:         "Authentification refusée par l'API Claude — vérifiez la clé.",
  ai_rate_limited:        'Quota du modèle atteint — réessayez plus tard.',
  ai_unavailable:         'Le service du modèle est momentanément indisponible.',
  ai_unreachable:         'Le service du modèle est injoignable.',
  ai_invalid_response:    "La réponse du modèle n'était pas exploitable — relancez l'analyse.",
  ai_truncated:           "La réponse du modèle a été tronquée — relancez l'analyse.",
  ai_refusal:             'Le modèle a refusé de traiter cette transcription.',
  ai_failed:              "L'analyse IA a échoué.",
  empty_transcript:       'La transcription est vide.',
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

function formatDateTime(value: Date | null): string {
  return value ? value.toLocaleString('fr-FR') : '—'
}

export default async function AiMeetingPanel({ meetingId }: { meetingId: string }) {
  const data = await getAiMeetingById(meetingId)
  if (!data || data.meeting.source !== 'ai_assistant') return null

  const { meeting, report, transcript } = data
  const status = meeting.aiStatus as MeetingAiStatus | null

  const info: { label: string; value: string }[] = [
    { label: 'Plateforme', value: meeting.platform ? PLATFORM_LABELS[meeting.platform as MeetingPlatform] : '—' },
    { label: 'Heure prévue', value: formatDateTime(meeting.scheduledAt) },
    { label: 'Début réel', value: formatDateTime(meeting.startedAt) },
    { label: 'Fin réelle', value: formatDateTime(meeting.endedAt) },
    { label: 'Durée', value: formatDuration(meeting.durationSeconds) },
    { label: 'Assistant', value: meeting.recallBotId ? `${meeting.botName ?? BOT_DISPLAY_NAME} — actif` : 'Aucun bot associé' },
    {
      label: 'Compte rendu par e-mail',
      value: meeting.reportEmailStatus ? EMAIL_LABELS[meeting.reportEmailStatus] ?? meeting.reportEmailStatus : 'Non envoyé',
    },
  ]

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              Assistant de réunion IA
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
              État : {status ? AI_STATUS_LABELS[status] : 'inconnu'}
            </p>
          </div>
          <MeetingStatusBadge status={status} />
        </div>

        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
          {info.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4 text-[13px]">
              <dt style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="text-right" style={{ color: 'var(--admin-text)' }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {status === 'failed' && meeting.aiError && (
          <div
            className="rounded-lg border p-3 mb-4 text-[13px]"
            style={{
              borderColor: 'var(--admin-red)',
              background: 'var(--admin-red-dim)',
              color: 'var(--admin-red)',
            }}
          >
            {ERROR_LABELS[meeting.aiError] ?? "Le traitement a échoué. Relancez l'étape concernée."}
          </div>
        )}

        {meeting.reportEmailStatus === 'failed' && (
          <div
            className="rounded-lg border p-3 mb-4 text-[13px]"
            style={{
              borderColor: 'var(--admin-amber)',
              background: 'var(--admin-amber-dim)',
              color: 'var(--admin-text)',
            }}
          >
            Le compte rendu a bien été généré, mais son envoi par e-mail a échoué. La réunion
            reste terminée ; vous pouvez relancer uniquement l&apos;envoi.
          </div>
        )}

        <AiMeetingControls
          meetingId={meeting.id}
          status={status}
          hasTranscript={transcript !== null}
          hasReport={report !== null}
          hasBot={Boolean(meeting.recallBotId)}
          emailStatus={meeting.reportEmailStatus}
        />
      </div>

      {report ? (
        <AiReportSections report={report} />
      ) : (
        <div
          className="rounded-xl border p-5 text-[13px]"
          style={{
            borderColor: 'var(--admin-border)',
            background: 'var(--admin-surface)',
            color: 'var(--admin-text-muted)',
          }}
        >
          {status === 'processing'
            ? "Analyse en cours — le compte rendu apparaîtra ici dès qu'il sera produit."
            : "Aucun compte rendu pour l'instant. Il sera généré à la fin de la réunion, une fois la transcription disponible."}
        </div>
      )}

      {transcript && (
        <TranscriptViewer
          plainText={transcript.plainText}
          wordCount={transcript.wordCount}
          provider={transcript.provider}
        />
      )}
    </div>
  )
}
