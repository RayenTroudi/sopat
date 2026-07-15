// src/lib/notifications.ts
// Résolution des destinataires par rôle + création des notifications in-app.
// Recipients viennent des listes de rôles déjà configurables dans Paramètres >
// Notifications (jusqu'ici jamais réellement consultées par le code).

import { db } from '../../db/index'
import { notifications, projects, purchaseOrders, extraExpenses, users } from '../../db/schema'
import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { getNotificationSettings } from './db/settings'

const PHASE_LABELS: Record<string, string> = {
  etudes: 'Études',
  realisation: 'Réalisation',
  entretien: 'Entretien',
  completed: 'Terminé',
}

// ─── Bas niveau : insertion par rôles ─────────────────────────────────────────

export async function notifyByRoles(opts: {
  type: 'phase_transition' | 'budget_alert'
  title: string
  body: string
  href: string
  projectId?: string | null
  roles: string[]
  createdBy: string
  excludeUserId?: string
}): Promise<void> {
  if (opts.roles.length === 0) return

  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      inArray(users.role, opts.roles as (typeof users.role.enumValues)[number][]),
      eq(users.isActive, true),
      isNull(users.deletedAt),
    ))

  const filtered = opts.excludeUserId
    ? recipients.filter((r) => r.id !== opts.excludeUserId)
    : recipients

  if (filtered.length === 0) return

  await db.insert(notifications).values(
    filtered.map((r) => ({
      recipientId: r.id,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      href: opts.href,
      projectId: opts.projectId ?? null,
      createdBy: opts.createdBy,
    }))
  )
}

// ─── Transition de phase ──────────────────────────────────────────────────────

export async function notifyPhaseTransition(opts: {
  projectId: string
  projectReference: string
  projectName: string
  toPhase: string
  actorId: string
  actorName: string
}): Promise<void> {
  try {
    const settings = await getNotificationSettings()
    const toPhaseLabel = PHASE_LABELS[opts.toPhase] ?? opts.toPhase

    await notifyByRoles({
      type: 'phase_transition',
      title: `Projet transféré en ${toPhaseLabel} — ${opts.projectReference}`,
      body: `${opts.projectName} est passé en phase ${toPhaseLabel} (validé par ${opts.actorName}).`,
      href: `/admin/projects/${opts.projectId}`,
      projectId: opts.projectId,
      roles: settings.phaseTransition,
      createdBy: opts.actorId,
      excludeUserId: opts.actorId,
    })
  } catch (err) {
    console.error('[notifyPhaseTransition] failed:', err)
  }
}

// ─── Alerte budget ─────────────────────────────────────────────────────────────

export async function checkBudgetThresholdAndNotify(projectId: string, actorId: string): Promise<void> {
  try {
    const [project] = await db
      .select({
        id: projects.id,
        reference: projects.reference,
        name: projects.name,
        approvedBudget: projects.approvedBudget,
        budgetAlert90NotifiedAt: projects.budgetAlert90NotifiedAt,
        budgetAlertOverNotifiedAt: projects.budgetAlertOverNotifiedAt,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project || !project.approvedBudget) return
    const approved = parseFloat(project.approvedBudget)
    if (!(approved > 0)) return

    const [poRow] = await db
      .select({ total: sql<string>`coalesce(sum(${purchaseOrders.totalCost}::numeric), 0)::text` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.projectId, projectId))

    const [exRow] = await db
      .select({ total: sql<string>`coalesce(sum(${extraExpenses.amount}::numeric), 0)::text` })
      .from(extraExpenses)
      .where(and(
        eq(extraExpenses.projectId, projectId),
        eq(extraExpenses.status, 'approved'),
        isNull(extraExpenses.deletedAt),
      ))

    const spent = parseFloat(poRow?.total ?? '0') + parseFloat(exRow?.total ?? '0')
    const percentSpent = Math.round((spent / approved) * 1000) / 10
    const now = new Date()
    const settings = await getNotificationSettings()
    const href = `/admin/projects/${projectId}`

    if (percentSpent >= 100 && !project.budgetAlertOverNotifiedAt) {
      await notifyByRoles({
        type: 'budget_alert',
        title: `Dépassement budget — ${project.reference}`,
        body: `${project.name} a dépassé son budget approuvé (${percentSpent}% dépensé).`,
        href,
        projectId,
        roles: settings.budgetAlert,
        createdBy: actorId,
      })
      await db.update(projects).set({ budgetAlertOverNotifiedAt: now }).where(eq(projects.id, projectId))
      return
    }

    if (percentSpent >= 90 && !project.budgetAlert90NotifiedAt) {
      await notifyByRoles({
        type: 'budget_alert',
        title: `Alerte budget 90% — ${project.reference}`,
        body: `${project.name} a atteint ${percentSpent}% de son budget approuvé.`,
        href,
        projectId,
        roles: settings.budgetAlert,
        createdBy: actorId,
      })
      await db.update(projects).set({ budgetAlert90NotifiedAt: now }).where(eq(projects.id, projectId))
    }
  } catch (err) {
    console.error('[checkBudgetThresholdAndNotify] failed:', err)
  }
}
