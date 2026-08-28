import 'server-only'
import { db } from '@/db'
import { meetingMinutes, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { getAiMeetingById } from '@/lib/db/ai-meetings'
import { logMeeting } from './logging'

/**
 * Envoi du compte rendu au créateur de la réunion.
 *
 * Principe : l'e-mail est une étape SÉPARÉE du traitement. Une réunion dont le
 * compte rendu est produit reste `completed` même si l'envoi échoue — l'échec
 * est enregistré dans `report_email_status` / `report_email_error`, et le
 * renvoi se fait depuis les données déjà stockées, sans nouvel appel OpenAI.
 *
 * Idempotent : si le compte rendu a déjà été envoyé, on ne renvoie pas — sauf
 * demande explicite (`force`), qui correspond au bouton « Renvoyer ».
 */

export type EmailResult =
  | { success: true; skipped?: 'already_sent' | 'disabled' }
  | { success: false; error: string; code: string }

function durationLabel(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`
  return `${m} min`
}

export async function sendMeetingReportEmail(
  meetingId: string,
  actor: AuditActor,
  options?: { force?: boolean },
): Promise<EmailResult> {
  const data = await getAiMeetingById(meetingId)
  if (!data) return { success: false, error: 'Réunion introuvable', code: 'not_found' }

  const { meeting, report } = data
  if (!report) {
    return { success: false, error: "Aucun compte rendu à envoyer.", code: 'no_report' }
  }
  if (!meeting.sendEmailReport && !options?.force) {
    return { success: true, skipped: 'disabled' }
  }
  if (meeting.reportEmailStatus === 'sent' && !options?.force) {
    return { success: true, skipped: 'already_sent' }
  }

  const [creator] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, meeting.createdBy))
    .limit(1)

  if (!creator?.email) {
    await markEmail(meetingId, 'failed', 'no_recipient', actor)
    return { success: false, error: 'Aucun destinataire.', code: 'no_recipient' }
  }

  try {
    await sendEmail({
      to: creator.email,
      subject: `Compte rendu — ${meeting.meetingType ?? meeting.reference}`,
      template: 'ai-meeting-report',
      props: {
        recipientName: creator.name,
        meetingTitle: meeting.meetingType ?? meeting.reference,
        meetingReference: meeting.reference,
        meetingId: meeting.id,
        meetingDate: meeting.meetingDate,
        durationLabel: durationLabel(meeting.durationSeconds),
        summary: report.summary,
        topics: report.topics,
        decisions: report.decisions.map((d) => d.decision),
        actionItems: report.actionItems.map((a) => ({
          title: a.title,
          responsiblePerson: a.responsiblePerson,
          deadline: a.deadline,
          priority: a.priority,
        })),
        risks: report.risks,
        followUps: report.followUps,
      },
      recipientId: creator.id,
      relatedEntityType: 'meeting_minute',
      relatedEntityId: meeting.id,
      createdBy: actor.userId,
    })

    await markEmail(meetingId, 'sent', null, actor)
    logMeeting.info('report_email_sent', { meetingId })
    return { success: true }
  } catch (err) {
    // L'échec d'envoi ne remet JAMAIS la réunion en échec : le compte rendu est
    // produit et consultable, seul l'acheminement a manqué.
    await markEmail(meetingId, 'failed', 'smtp_error', actor)
    logMeeting.error('report_email_failed', { meetingId, errorCode: 'smtp_error' }, err)
    return { success: false, error: "L'envoi de l'e-mail a échoué.", code: 'smtp_error' }
  }
}

async function markEmail(
  meetingId: string,
  status: 'sent' | 'failed',
  error: string | null,
  actor: AuditActor,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(meetingMinutes)
      .set({
        reportEmailStatus: status,
        reportEmailSentAt: status === 'sent' ? new Date() : null,
        reportEmailError: error,
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, meetingId))

    await recordAudit(tx, {
      entityType: 'meeting_minute',
      entityId: meetingId,
      action: status === 'sent' ? 'notified' : 'failed',
      actor,
      newState: { reportEmail: status, errorCode: error },
    })
  })
}
