'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  cancelAiMeetingAction,
  retryAnalysisAction,
  retryBotAction,
  retryReportEmailAction,
} from '@/lib/actions/ai-meetings'
import type { MeetingAiStatus } from '@/lib/meetings/status'

/**
 * Commandes de reprise.
 *
 * Chaque bouton correspond à UNE étape reprenable, jamais au traitement entier :
 * relancer l'analyse ne recrée pas de bot et ne redemande pas la transcription,
 * renvoyer l'e-mail ne rappelle pas OpenAI. C'est ce cloisonnement qui évite de
 * repayer une analyse parce qu'un e-mail n'est pas parti.
 */

type Props = {
  meetingId: string
  status: MeetingAiStatus | null
  hasTranscript: boolean
  hasReport: boolean
  hasBot: boolean
  emailStatus: string | null
}

export default function AiMeetingControls({
  meetingId,
  status,
  hasTranscript,
  hasReport,
  hasBot,
  emailStatus,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function run(label: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null)
    startTransition(async () => {
      const result = await fn()
      if (result.success) {
        setMessage({ kind: 'ok', text: `${label} : opération effectuée.` })
        router.refresh()
      } else {
        setMessage({ kind: 'error', text: result.error ?? 'Opération impossible.' })
      }
    })
  }

  const canCancel = status !== null && !['completed', 'cancelled'].includes(status)
  const canRetryBot = !hasBot && (status === 'failed' || status === 'scheduled')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canRetryBot && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('Bot', () => retryBotAction(meetingId))}
            className="text-[13px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Créer le bot
          </button>
        )}

        {hasTranscript && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run('Analyse', () => retryAnalysisAction(meetingId, { regenerate: hasReport }))
            }
            className="text-[13px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            {hasReport ? "Régénérer l'analyse" : "Relancer l'analyse"}
          </button>
        )}

        {hasReport && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('E-mail', () => retryReportEmailAction(meetingId))}
            className="text-[13px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
          >
            {emailStatus === 'failed' ? "Réessayer l'envoi" : 'Renvoyer le compte rendu'}
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('Annulation', () => cancelAiMeetingAction(meetingId))}
            className="text-[13px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: 'var(--admin-red)', color: 'var(--admin-red)' }}
          >
            Annuler la réunion
          </button>
        )}

        {pending && (
          <span className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
            Traitement en cours…
          </span>
        )}
      </div>

      {message && (
        <p
          className="text-[12px]"
          style={{ color: message.kind === 'ok' ? 'var(--admin-emerald)' : 'var(--admin-red)' }}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
