import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { meetingMinutes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { authorizeMeetingAccess } from '@/lib/meetings/authorization'
import { getNextMeetingReference } from '@/lib/db/meetings'
import { flattenUtterances } from '@/lib/recall/transcripts'
import { runAnalysis, storeTranscript } from '@/lib/meetings/service'
import { sendMeetingReportEmail } from '@/lib/meetings/report-email'
import { SAMPLE_TRANSCRIPT_TEXT, sampleUtterances } from '@/lib/meetings/sample-transcript'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { logMeeting } from '@/lib/meetings/logging'

/**
 * Circuit d'essai : réunion fictive → transcription d'exemple → analyse IA →
 * compte rendu → e-mail, sans visioconférence ni bot Recall.
 *
 * INTERDIT EN PRODUCTION. Le garde-fou est en tête de handler et renvoie 404 :
 * en production la route doit être indiscernable d'une route inexistante, pour
 * ne pas signaler qu'il existe un chemin de création de réunions sans bot.
 * Le contrôle de session s'ajoute par-dessus — les deux, pas l'un ou l'autre.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  /** Réunion existante à alimenter ; sinon une réunion d'essai est créée. */
  meetingId: z.string().uuid().optional(),
  /** Transcription personnalisée ; sinon le jeu d'essai intégré. */
  transcript: z.string().min(20).max(200_000).optional(),
  sendEmail: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const authorized = await authorizeMeetingAccess()
  if (!authorized.ok) {
    return NextResponse.json({ error: authorized.error }, { status: authorized.status })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const actor: AuditActor = {
    userId: authorized.session.user.userId,
    name: authorized.session.user.name,
    email: authorized.session.user.email,
    role: authorized.session.user.role,
  }

  let meetingId = parsed.data.meetingId

  if (!meetingId) {
    const reference = await getNextMeetingReference()
    const now = new Date()
    meetingId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(meetingMinutes)
        .values({
          reference,
          meetingDate: now.toISOString().slice(0, 10),
          meetingType: "Réunion d'essai (simulation)",
          createdBy: actor.userId,
          source: 'ai_assistant',
          platform: 'google_meet',
          scheduledAt: now,
          startedAt: now,
          endedAt: new Date(now.getTime() + 32 * 60 * 1000),
          durationSeconds: 32 * 60,
          aiStatus: 'processing',
          autoJoin: false,
          sendEmailReport: parsed.data.sendEmail,
        })
        .returning({ id: meetingMinutes.id })

      await recordAudit(tx, {
        entityType: 'meeting_minute',
        entityId: row.id,
        action: 'created',
        actor,
        newState: { reference, source: 'ai_assistant', simulated: true },
      })
      return row.id
    })
  } else {
    const [existing] = await db
      .select({ id: meetingMinutes.id })
      .from(meetingMinutes)
      .where(eq(meetingMinutes.id, meetingId))
      .limit(1)
    if (!existing) return NextResponse.json({ error: 'Réunion introuvable' }, { status: 404 })
  }

  // Transcription : soit celle fournie, soit le jeu d'essai passé par la même
  // mise à plat que les données Recall, pour exercer réellement ce code.
  const content = parsed.data.transcript
    ? { utterances: [], plainText: parsed.data.transcript, wordCount: parsed.data.transcript.split(/\s+/).length, speakers: [] }
    : flattenUtterances(sampleUtterances())

  const stored = await storeTranscript(meetingId, 'simulation', content, actor)
  if (!stored.success) {
    return NextResponse.json({ error: stored.error }, { status: 500 })
  }

  const analysis = await runAnalysis(meetingId, actor, { regenerate: true })
  if (!analysis.success) {
    return NextResponse.json(
      { error: analysis.error, code: analysis.code, meetingId },
      { status: 502 },
    )
  }

  let emailStatus: string = 'not_requested'
  if (parsed.data.sendEmail) {
    const email = await sendMeetingReportEmail(meetingId, actor, { force: true })
    emailStatus = email.success ? 'sent' : `failed:${email.code}`
  }

  logMeeting.info('simulation_completed', { meetingId, reportId: analysis.reportId })

  return NextResponse.json({
    status: 'ok',
    meetingId,
    reportId: analysis.reportId,
    createdActions: analysis.createdActions,
    emailStatus,
    transcriptPreview: SAMPLE_TRANSCRIPT_TEXT.slice(0, 120),
  })
}
