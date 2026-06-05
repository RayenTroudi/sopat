/**
 * Vercel Cron handler — runs every hour via vercel.json cron schedule.
 * Scans email_queue for prediction emails that are overdue for:
 *   - 48h: send reminder-48h.tsx to chef
 *   - 72h: send escalation to admin
 *
 * Protected by CRON_SECRET header (set in Vercel environment).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../db/index'
import {
  emailQueue,
  budgetValidations,
  budgetPredictions,
  projects,
  users,
} from '../../../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import { signValidationToken } from '@/lib/jwt'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sopat.vercel.app'

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret to prevent public triggering
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = Date.now()
  const h48 = now - 48 * 60 * 60 * 1000
  const h72 = now - 72 * 60 * 60 * 1000

  // Fetch all sent prediction emails with no validation yet
  const overdueEmails = await db
    .select()
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.templateName, 'prediction-email'),
        eq(emailQueue.status, 'sent')
      )
    )

  let reminded = 0
  let escalated = 0

  for (const email of overdueEmails) {
    if (!email.sentAt || !email.relatedEntityId) continue

    const sentMs = email.sentAt.getTime()

    // Check whether a validation already exists for this prediction
    const [validation] = await db
      .select({ status: budgetValidations.status })
      .from(budgetValidations)
      .where(eq(budgetValidations.predictionId, email.relatedEntityId))
      .orderBy(desc(budgetValidations.createdAt))
      .limit(1)

    if (validation && (validation.status === 'validated' || validation.status === 'modified')) {
      // Already handled — mark email as validated so we skip it next time
      await db.update(emailQueue).set({ status: 'validated' }).where(eq(emailQueue.id, email.id))
      continue
    }

    const meta = (email.metadata ?? {}) as Record<string, unknown>

    if (sentMs < h72 && !meta.escalationSent) {
      // 72h: escalate to admin
      await sendAdminEscalation(email, email.createdBy)
      await db
        .update(emailQueue)
        .set({ metadata: { ...meta, escalationSent: true } })
        .where(eq(emailQueue.id, email.id))
      escalated++
    } else if (sentMs < h48 && !meta.reminderSent) {
      // 48h: send reminder to chef
      await send48hReminder(email)
      await db
        .update(emailQueue)
        .set({ metadata: { ...meta, reminderSent: true } })
        .where(eq(emailQueue.id, email.id))
      reminded++
    }
  }

  return NextResponse.json({ ok: true, reminded, escalated, checked: overdueEmails.length })
}

async function send48hReminder(email: typeof emailQueue.$inferSelect) {
  if (!email.recipientId || !email.projectId || !email.relatedEntityId) return

  const [[recipient], [prediction], [project]] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, email.recipientId)).limit(1),
    db.select().from(budgetPredictions).where(eq(budgetPredictions.id, email.relatedEntityId)).limit(1),
    db.select({ name: projects.name, reference: projects.reference }).from(projects).where(eq(projects.id, email.projectId)).limit(1),
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
    db.select({ name: projects.name, reference: projects.reference, assignedRealisationChefId: projects.assignedRealisationChefId })
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
        subject:          `[SOPAT] 🚨 Escalade — Budget non validé depuis 72h · ${project.reference}`,
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
        createdBy:         createdBy ?? 'system',
      })
    )
  )
}
