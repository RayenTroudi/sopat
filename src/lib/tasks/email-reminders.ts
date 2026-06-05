/**
 * Email reminder sweep — replaces the Vercel cron at /api/cron/email-reminders.
 *
 * Called from the dashboard server component on each load, but rate-limited via
 * the system_settings table so the actual DB sweep only runs once every 30 minutes
 * regardless of how often the dashboard is opened.
 *
 * Checks prediction emails that have been sitting in 'sent' state for:
 *   ≥48h → reminder email to chef
 *   ≥72h → escalation email to all admins
 */

import { db } from '../../../db/index'
import {
  emailQueue,
  budgetValidations,
  budgetPredictions,
  projects,
  users,
  systemSettings,
} from '../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { signValidationToken } from '@/lib/jwt'

const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sopat.vercel.app'
const SWEEP_INTERVAL = 30 * 60 * 1000   // 30 minutes between sweeps
const SETTINGS_KEY   = 'last_reminder_sweep'

// ─── Rate-gate: only sweep once every 30 min ─────────────────────────────────

async function shouldSweep(): Promise<boolean> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1)

  if (!row?.value) return true
  const last = (row.value as { ts: number }).ts ?? 0
  return Date.now() - last > SWEEP_INTERVAL
}

async function markSwept() {
  const existing = await db
    .select({ id: systemSettings.id })
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY))
    .limit(1)

  const val = { ts: Date.now() }
  if (existing.length > 0) {
    await db.update(systemSettings)
      .set({ value: val, updatedAt: new Date(), updatedBy: 'system' })
      .where(eq(systemSettings.key, SETTINGS_KEY))
  } else {
    await db.insert(systemSettings).values({ key: SETTINGS_KEY, value: val, updatedBy: 'system' })
  }
}

// ─── Main sweep ───────────────────────────────────────────────────────────────

export async function runEmailReminderSweep(): Promise<void> {
  if (!(await shouldSweep())) return
  await markSwept()

  const now = Date.now()
  const h48 = now - 48 * 60 * 60 * 1000
  const h72 = now - 72 * 60 * 60 * 1000

  const overdueEmails = await db
    .select()
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.templateName, 'prediction-email'),
        eq(emailQueue.status, 'sent')
      )
    )

  for (const email of overdueEmails) {
    if (!email.sentAt || !email.relatedEntityId) continue

    const sentMs = email.sentAt.getTime()

    const [validation] = await db
      .select({ status: budgetValidations.status })
      .from(budgetValidations)
      .where(eq(budgetValidations.predictionId, email.relatedEntityId))
      .orderBy(desc(budgetValidations.createdAt))
      .limit(1)

    if (validation && (validation.status === 'validated' || validation.status === 'modified')) {
      await db.update(emailQueue).set({ status: 'validated' }).where(eq(emailQueue.id, email.id))
      continue
    }

    const meta = (email.metadata ?? {}) as Record<string, unknown>

    if (sentMs < h72 && !meta.escalationSent) {
      await sendAdminEscalation(email, email.createdBy ?? 'system')
      await db.update(emailQueue)
        .set({ metadata: { ...meta, escalationSent: true } })
        .where(eq(emailQueue.id, email.id))
    } else if (sentMs < h48 && !meta.reminderSent) {
      await send48hReminder(email)
      await db.update(emailQueue)
        .set({ metadata: { ...meta, reminderSent: true } })
        .where(eq(emailQueue.id, email.id))
    }
  }
}

// ─── Helpers (same logic as the old cron route) ───────────────────────────────

async function send48hReminder(email: typeof emailQueue.$inferSelect) {
  if (!email.recipientId || !email.projectId || !email.relatedEntityId) return

  const [[recipient], [prediction], [project]] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email })
      .from(users).where(eq(users.id, email.recipientId)).limit(1),
    db.select().from(budgetPredictions)
      .where(eq(budgetPredictions.id, email.relatedEntityId)).limit(1),
    db.select({ name: projects.name, reference: projects.reference })
      .from(projects).where(eq(projects.id, email.projectId)).limit(1),
  ])

  if (!recipient || !prediction || !project) return

  const [validateToken, editToken] = await Promise.all([
    signValidationToken({ projectId: email.projectId, predictionId: prediction.id, chefUserId: recipient.id, action: 'validate' }),
    signValidationToken({ projectId: email.projectId, predictionId: prediction.id, chefUserId: recipient.id, action: 'edit' }),
  ])

  await sendEmail({
    to:               recipient.email,
    subject:          `[SOPAT] Rappel — Budget en attente de validation · ${project.reference}`,
    template:         'reminder-48h',
    props: {
      chefName:         recipient.name,
      projectName:      project.name,
      projectReference: project.reference,
      predictedTotal:   parseFloat(prediction.predictedTotal),
      sentAt:           email.sentAt?.toISOString() ?? new Date().toISOString(),
      validateUrl:      `${APP_URL}/validate/${validateToken}`,
      editUrl:          `${APP_URL}/edit/${editToken}`,
    },
    projectId:         email.projectId,
    recipientId:       recipient.id,
    relatedEntityType: 'budget_prediction',
    relatedEntityId:   prediction.id,
    createdBy:         'system',
  })
}

async function sendAdminEscalation(email: typeof emailQueue.$inferSelect, createdBy: string) {
  if (!email.projectId || !email.relatedEntityId) return

  const [[project], [prediction]] = await Promise.all([
    db.select({ name: projects.name, reference: projects.reference })
      .from(projects).where(eq(projects.id, email.projectId)).limit(1),
    db.select({ predictedTotal: budgetPredictions.predictedTotal })
      .from(budgetPredictions).where(eq(budgetPredictions.id, email.relatedEntityId)).limit(1),
  ])

  if (!project || !prediction) return

  const adminUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, 'admin'))

  await Promise.all(
    adminUsers.map((admin) =>
      sendEmail({
        to:               admin.email,
        subject:          `[SOPAT] Escalade — Budget non validé depuis 72h · ${project.reference}`,
        template:         'reminder-48h',
        props: {
          chefName:         admin.name,
          projectName:      project.name,
          projectReference: project.reference,
          predictedTotal:   parseFloat(prediction.predictedTotal),
          sentAt:           email.sentAt?.toISOString() ?? new Date().toISOString(),
          validateUrl:      `${APP_URL}/admin/projects/${email.projectId}`,
          editUrl:          `${APP_URL}/admin/projects/${email.projectId}`,
        },
        projectId:         email.projectId ?? undefined,
        recipientId:       admin.id,
        relatedEntityType: 'budget_prediction',
        relatedEntityId:   email.relatedEntityId ?? undefined,
        createdBy,
      })
    )
  )
}
