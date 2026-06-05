/**
 * Maintenance visit reminder — replaces the Vercel cron at /api/cron/maintenance-reminders.
 *
 * Called synchronously (fire-and-forget) from POST /api/projects/[id]/maintenance-visits
 * immediately after a visit is saved. Sends a reminder email if the visit falls
 * within the next 25 hours (same window as the old cron's 24h+1h buffer).
 *
 * Duplicate-safe: skips if an email for this visit already exists in email_queue.
 */

import { db } from '../../../db/index'
import { emailQueue, maintenanceVisits, projects, users } from '../../../db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'

const WINDOW_MS = 25 * 60 * 60 * 1000  // 24h + 1h buffer

export async function maybeSendMaintenanceReminder(visitId: string): Promise<void> {
  // Load the visit with project + team member details
  const [visit] = await db
    .select({
      id:           maintenanceVisits.id,
      projectId:    maintenanceVisits.projectId,
      visitDate:    maintenanceVisits.visitDate,
      visitType:    maintenanceVisits.visitType,
      durationHours: maintenanceVisits.durationHours,
      teamMemberId: maintenanceVisits.teamMemberId,
      notes:        maintenanceVisits.nextVisitRecommendation,
      projectName:  projects.name,
      projectRef:   projects.reference,
      clientName:   projects.clientName,
      siteAddress:  projects.siteAddress,
      teamEmail:    users.email,
      teamName:     users.name,
    })
    .from(maintenanceVisits)
    .leftJoin(projects, eq(maintenanceVisits.projectId, projects.id))
    .leftJoin(users,    eq(maintenanceVisits.teamMemberId, users.id))
    .where(eq(maintenanceVisits.id, visitId))
    .limit(1)

  if (!visit?.teamEmail || !visit.teamName) return

  // Only send if the visit is within the next 25 hours
  const now      = Date.now()
  const visitMs  = visit.visitDate.getTime()
  if (visitMs < now || visitMs > now + WINDOW_MS) return

  // Dedup: skip if already queued for this visit
  const existing = await db
    .select({ id: emailQueue.id })
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.templateName, 'maintenance-reminder'),
        eq(emailQueue.relatedEntityId, visitId),
        sql`${emailQueue.status} != 'failed'`
      )
    )
    .limit(1)

  if (existing.length > 0) return

  await sendEmail({
    to:                visit.teamEmail,
    subject:           `[SOPAT] Rappel visite demain — ${visit.projectName ?? visit.projectRef}`,
    template:          'maintenance-reminder',
    props: {
      recipientName:    visit.teamName,
      projectName:      visit.projectName ?? '',
      projectReference: visit.projectRef ?? '',
      projectId:        visit.projectId,
      visitDate:        visit.visitDate.toISOString(),
      visitType:        visit.visitType,
      durationHours:    visit.durationHours ? parseFloat(visit.durationHours) : null,
      clientName:       visit.clientName ?? '',
      siteAddress:      visit.siteAddress ?? '',
      notes:            visit.notes ?? undefined,
    },
    projectId:         visit.projectId,
    recipientId:       visit.teamMemberId,
    relatedEntityType: 'maintenance_visit',
    relatedEntityId:   visitId,
    createdBy:         'system',
  })
}
