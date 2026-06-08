/**
 * RSE reminder sweep — called from runEmailReminderSweep (rate-gated to once per 30 min).
 * Sends expiry warnings 60 days before end_date, and alerts for overdue commitments.
 */

import { db } from '../../../db/index'
import { emailQueue } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import {
  getPartnershipsExpiringWithin,
  getOverdueCommitmentsWithReferents,
} from '@/lib/db/rse'
import {
  triggerRseExpiryWarningEmail,
  triggerRseCommitmentOverdueEmail,
} from '@/lib/email-triggers'

async function hasRecentEmail(relatedEntityId: string, templateName: string): Promise<boolean> {
  const rows = await db
    .select({ id: emailQueue.id })
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.relatedEntityId, relatedEntityId),
        eq(emailQueue.templateName, templateName),
      )
    )
    .limit(1)
  return rows.length > 0
}

export async function runRseReminderSweep(): Promise<void> {
  const [expiring, overdue] = await Promise.all([
    getPartnershipsExpiringWithin(60),
    getOverdueCommitmentsWithReferents(),
  ])

  await Promise.all([
    ...expiring.map(async (p) => {
      if (await hasRecentEmail(p.id, 'rse-expiry-warning')) return
      void triggerRseExpiryWarningEmail({
        partnershipId: p.id,
        conventionReference: p.conventionReference,
        partnerName: p.partnerName,
        endDate: p.endDate,
        daysUntil: p.daysUntil,
        referentEmail: p.sopatReferentEmail,
        referentName: p.sopatReferentName,
        referentId: p.sopatReferentId,
      })
    }),
    ...overdue.map(async (c) => {
      if (await hasRecentEmail(c.id, 'rse-commitment-overdue')) return
      void triggerRseCommitmentOverdueEmail({
        partnershipId: c.partnershipId,
        commitmentId: c.id,
        conventionReference: c.conventionReference,
        partnerName: c.partnerName,
        commitmentDescription: c.commitmentDescription,
        nextDueDate: c.nextDueDate,
        referentEmail: c.sopatReferentEmail,
        referentName: c.sopatReferentName,
        referentId: c.sopatReferentId,
      })
    }),
  ])
}
