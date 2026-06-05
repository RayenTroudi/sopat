import { NextRequest, NextResponse } from 'next/server'
import { getVisitsIn24h } from '@/lib/db/entretien'
import { sendEmail } from '@/lib/email'
import { db } from '../../../../../db/index'
import { emailQueue } from '../../../../../db/schema'
import { and, eq, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const visits = await getVisitsIn24h()
  let sent = 0

  for (const v of visits) {
    if (!v.teamEmail || !v.teamName) continue

    // Skip if a reminder was already queued for this visit
    const existing = await db
      .select({ id: emailQueue.id })
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.templateName, 'maintenance-reminder'),
          eq(emailQueue.relatedEntityId, v.id),
          sql`${emailQueue.status} != 'failed'`
        )
      )
      .limit(1)

    if (existing.length > 0) continue

    try {
      await sendEmail({
        to:                v.teamEmail,
        subject:           `[SOPAT] Rappel visite demain — ${v.projectName ?? v.projectRef}`,
        template:          'maintenance-reminder',
        props: {
          recipientName:    v.teamName,
          projectName:      v.projectName ?? '',
          projectReference: v.projectRef ?? '',
          projectId:        v.projectId,
          visitDate:        v.visitDate.toISOString(),
          visitType:        v.visitType,
          durationHours:    v.durationHours ? parseFloat(v.durationHours) : null,
          clientName:       v.clientName ?? '',
          siteAddress:      v.siteAddress ?? '',
          notes:            v.notes ?? undefined,
        },
        projectId:         v.projectId,
        recipientId:       v.teamMemberId,
        relatedEntityType: 'maintenance_visit',
        relatedEntityId:   v.id,
        createdBy:         'system',
      })
      sent++
    } catch {
      // sendEmail already logs failures to emailQueue; continue to next visit
    }
  }

  return NextResponse.json({ ok: true, sent, checked: visits.length })
}
