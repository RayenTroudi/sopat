/**
 * Digest quotidien des alertes SMQ — envoyé aux comptes admin/direction.
 *
 * Réutilise les requêtes du panneau « Alertes & échéances » du tableau de
 * bord (src/lib/db/alerts.ts). Rate-limité à un envoi par 24 h via
 * system_settings, appelé depuis le sweep e-mail principal.
 */

import { db } from '../../../db/index'
import { users, systemSettings } from '../../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { getDeadlineAlerts } from '@/lib/db/alerts'

const SETTINGS_KEY = 'last_smq_alerts_digest'
const DIGEST_INTERVAL = 24 * 60 * 60 * 1000 // 24 h

async function shouldSend(): Promise<boolean> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1)
  if (!row?.value) return true
  const last = (row.value as { ts: number }).ts ?? 0
  return Date.now() - last > DIGEST_INTERVAL
}

async function markSent() {
  const existing = await db
    .select({ id: systemSettings.id })
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1)
  const val = { ts: Date.now() }
  if (existing.length > 0) {
    await db.update(systemSettings)
      .set({ value: val, updatedAt: new Date(), updatedBy: null })
      .where(eq(systemSettings.key, SETTINGS_KEY))
  } else {
    await db.insert(systemSettings).values({ key: SETTINGS_KEY, value: val, updatedBy: null })
  }
}

export async function runSmqAlertsDigest(): Promise<void> {
  if (!(await shouldSend())) return

  const alerts = await getDeadlineAlerts()
  // N'envoyer que s'il y a au moins un élément en retard
  const overdueCount = alerts.filter((a) => a.overdue).length
  if (overdueCount === 0) return

  await markSent()

  const recipients = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.role, ['admin', 'direction']))

  const digestAlerts = alerts.slice(0, 12).map((a) => ({
    label: a.label,
    detail: a.detail,
    dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('fr-FR') : null,
    href: a.href,
    overdue: a.overdue,
  }))

  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `[SOPAT SMQ] ${overdueCount} échéance${overdueCount !== 1 ? 's' : ''} en retard — point quotidien`,
        template: 'smq-alerts-digest',
        props: {
          recipientName: r.name,
          alerts: digestAlerts,
          overdueCount,
        },
        recipientId: r.id,
        relatedEntityType: 'smq_alerts_digest',
        createdBy: 'system',
      }).catch((e) => console.error('[smq digest]', r.email, e))
    )
  )
}
