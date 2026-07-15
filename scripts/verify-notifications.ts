import { db } from '../db/index'
import { eq } from 'drizzle-orm'
import { projects, users, notifications } from '../db/schema'
import { getNotificationSettings } from '../src/lib/db/settings'
import { notifyByRoles, checkBudgetThresholdAndNotify } from '../src/lib/notifications'

async function main() {
  const settings = await getNotificationSettings()
  console.log('notification settings:', JSON.stringify(settings))
  if (settings.phaseTransition.length === 0 || settings.budgetAlert.length === 0) {
    throw new Error('Expected non-empty default role lists')
  }

  // notifyByRoles: pick a real admin user, verify exclusion + insertion
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1)
  if (!admin) throw new Error('No admin user found in dev DB — cannot verify')

  const before = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  await notifyByRoles({
    type: 'phase_transition',
    title: 'TEST — vérification notifyByRoles',
    body: 'ligne de test',
    href: '/admin',
    roles: ['admin'],
    createdBy: admin.id,
    excludeUserId: admin.id, // admin excluded — should NOT receive this one
  })
  const afterExcluded = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  if (afterExcluded.length !== before.length) {
    throw new Error(`Excluded actor still got notified: before=${before.length} after=${afterExcluded.length}`)
  }
  console.log('✓ excludeUserId correctly skips the actor')

  await notifyByRoles({
    type: 'phase_transition',
    title: 'TEST — vérification notifyByRoles (sans exclusion)',
    body: 'ligne de test',
    href: '/admin',
    roles: ['admin'],
    createdBy: admin.id,
  })
  const afterIncluded = await db.select().from(notifications).where(eq(notifications.recipientId, admin.id))
  if (afterIncluded.length !== before.length + 1) {
    throw new Error(`Expected exactly 1 new row, got ${afterIncluded.length - before.length}`)
  }
  console.log('✓ notifyByRoles inserts exactly one row per matching active user')

  // checkBudgetThresholdAndNotify: find a project with an approved budget
  const [project] = await db
    .select({ id: projects.id, approvedBudget: projects.approvedBudget })
    .from(projects)
    .where(eq(projects.approvedBudget, projects.approvedBudget)) // any non-null via filter below
  const withBudget = (await db.select({ id: projects.id, approvedBudget: projects.approvedBudget }).from(projects))
    .find((p) => p.approvedBudget !== null)
  if (withBudget) {
    await checkBudgetThresholdAndNotify(withBudget.id, admin.id)
    console.log(`✓ checkBudgetThresholdAndNotify ran without throwing for project ${withBudget.id}`)
  } else {
    console.log('⚠ no project with an approved budget in dev DB — skipped threshold check')
  }

  // Cleanup test rows
  await db.delete(notifications).where(eq(notifications.title, 'TEST — vérification notifyByRoles'))
  await db.delete(notifications).where(eq(notifications.title, 'TEST — vérification notifyByRoles (sans exclusion)'))
  console.log('✓ cleaned up test rows')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
