/**
 * High-level email trigger functions called from API routes after state-changing events.
 * Each function is fire-and-forget safe — errors are logged but not re-thrown so they
 * never block the primary operation.
 */

import { sendEmail } from './email'
import { signValidationToken } from './jwt'
import { db } from '../../db/index'
import {
  projects,
  users,
  budgetValidations,
  budgetPredictions,
} from '../../db/schema'
import { eq, desc, and, isNull } from 'drizzle-orm'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sopat.vercel.app'

// ─── Prediction email (études → réalisation transition) ───────────────────────

/**
 * Called immediately after the études phase is signed off.
 * Fetches the latest accepted prediction, creates JWT tokens, and fires
 * prediction-email.tsx to the assigned réalisation chef.
 */
export async function triggerPredictionEmail(projectId: string, actorId: string) {
  try {
    // Load project + réalisation chef
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) return

    // Get réalisation chef (assigned or fall back to admin@sopat.tn)
    let chefEmail = 'admin@sopat.tn'
    let chefName  = 'Chef de Réalisation'
    let chefUserId = actorId

    if (project.assignedRealisationChefId) {
      const [chef] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, project.assignedRealisationChefId))
        .limit(1)
      if (chef) {
        chefEmail  = chef.email
        chefName   = chef.name
        chefUserId = chef.id
      }
    }

    // Get latest accepted/pending prediction
    const [prediction] = await db
      .select()
      .from(budgetPredictions)
      .where(eq(budgetPredictions.projectId, projectId))
      .orderBy(desc(budgetPredictions.version))
      .limit(1)

    if (!prediction) {
      // No ML prediction available — skip email
      return
    }

    // Sign validate + edit tokens
    const [validateToken, editToken] = await Promise.all([
      signValidationToken({ projectId, predictionId: prediction.id, chefUserId, action: 'validate' }),
      signValidationToken({ projectId, predictionId: prediction.id, chefUserId, action: 'edit' }),
    ])

    const validateUrl = `${APP_URL}/validate/${validateToken}`
    const editUrl     = `${APP_URL}/edit/${editToken}`

    // Save token to budget_validations (creates a pending validation record)
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await db
      .insert(budgetValidations)
      .values({
        projectId,
        predictionId:   prediction.id,
        chefUserId,
        status:         'pending',
        token:          validateToken,
        tokenExpiresAt: tokenExpiry,
        createdBy:      actorId,
      })
      .onConflictDoNothing()

    const predictedTotal = parseFloat(prediction.predictedTotal)
    const breakdown = {
      plants:    parseFloat(prediction.breakdownPlants    ?? '0'),
      soil:      parseFloat(prediction.breakdownSoil      ?? '0'),
      labor:     parseFloat(prediction.breakdownLabor     ?? '0'),
      equipment: parseFloat(prediction.breakdownEquipment ?? '0'),
      logistics: parseFloat(prediction.breakdownLogistics ?? '0'),
    }

    await sendEmail({
      to:                  chefEmail,
      subject:             `[SOPAT] Prédiction budgétaire — ${project.reference} · ${project.name}`,
      template:            'prediction-email',
      props: {
        chefName,
        projectName:      project.name,
        projectReference: project.reference,
        predictedTotal,
        confidenceLow:    parseFloat(prediction.confidenceLow    ?? String(predictedTotal * 0.88)),
        confidenceHigh:   parseFloat(prediction.confidenceHigh   ?? String(predictedTotal * 1.12)),
        confidenceScore:  prediction.confidenceScore ?? 70,
        breakdown,
        topCostDrivers:   prediction.topCostDrivers ?? [],
        modelVersion:     prediction.modelVersion ?? 'v1',
        isFallback:       prediction.isFallback,
        validateUrl,
        editUrl,
      },
      projectId,
      recipientId:         chefUserId,
      relatedEntityType:   'budget_prediction',
      relatedEntityId:     prediction.id,
      createdBy:           actorId,
    })
  } catch (err) {
    console.error('[triggerPredictionEmail] failed:', err)
  }
}

// ─── Phase transition email ───────────────────────────────────────────────────

export async function triggerPhaseTransitionEmail({
  projectId,
  fromPhase,
  toPhase,
  signedOffBy,
  signedOffByName,
  notes,
}: {
  projectId:     string
  fromPhase:     string
  toPhase:       string
  signedOffBy:   string
  signedOffByName: string
  notes?:        string
}) {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    if (!project) return

    // Find the chef for the destination phase
    let recipientId: string | null = null
    if (toPhase === 'realisation') recipientId = project.assignedRealisationChefId ?? null
    if (toPhase === 'entretien')   recipientId = project.assignedEntretienChefId ?? null

    if (!recipientId) return

    const [recipient] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1)

    if (!recipient) return

    await sendEmail({
      to:                  recipient.email,
      subject:             `[SOPAT] Projet ${project.reference} transféré en ${toPhase}`,
      template:            'phase-transition',
      props: {
        recipientName:    recipient.name,
        projectName:      project.name,
        projectReference: project.reference,
        fromPhase,
        toPhase,
        signedOffBy:      signedOffByName,
        signedOffAt:      new Date().toISOString(),
        projectId,
        notes,
      },
      projectId,
      recipientId:         recipient.id,
      relatedEntityType:   'project',
      relatedEntityId:     projectId,
      createdBy:           signedOffBy,
    })
  } catch (err) {
    console.error('[triggerPhaseTransitionEmail] failed:', err)
  }
}

// ─── Budget alert email ───────────────────────────────────────────────────────

export async function triggerBudgetAlertEmail({
  projectId,
  approvedBudget,
  totalSpent,
  percentSpent,
  isOverBudget,
  actorId,
}: {
  projectId:      string
  approvedBudget: number
  totalSpent:     number
  percentSpent:   number
  isOverBudget:   boolean
  actorId:        string
}) {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    if (!project) return

    // Alert goes to: admin users + réalisation chef
    const adminUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true), isNull(users.deletedAt)))

    const recipients: { id: string; name: string; email: string }[] = [...adminUsers]

    if (project.assignedRealisationChefId) {
      const [chef] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, project.assignedRealisationChefId))
        .limit(1)
      if (chef && !recipients.some((r) => r.id === chef.id)) {
        recipients.push(chef)
      }
    }

    await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to:               r.email,
          subject:          isOverBudget
            ? `[SOPAT] 🚨 Dépassement budget — ${project.reference}`
            : `[SOPAT] ⚠ Alerte budget 90% — ${project.reference}`,
          template:         'budget-alert',
          props: {
            recipientName:    r.name,
            projectName:      project.name,
            projectReference: project.reference,
            projectId,
            approvedBudget,
            totalSpent,
            percentSpent,
            isOverBudget,
          },
          projectId,
          recipientId:       r.id,
          relatedEntityType: 'project',
          relatedEntityId:   projectId,
          createdBy:         actorId,
        })
      )
    )
  } catch (err) {
    console.error('[triggerBudgetAlertEmail] failed:', err)
  }
}

// ─── NC assigned email ────────────────────────────────────────────────────────

export async function triggerNcAssignedEmail({
  ncId,
  ncReference,
  projectId,
  processAffected,
  description,
  deadline,
  detectedBy,
  detectedByName,
  assignedToId,
}: {
  ncId:            string
  ncReference:     string
  projectId:       string | null
  processAffected: string
  description:     string
  deadline:        Date | null
  detectedBy:      string
  detectedByName:  string
  assignedToId:    string
}) {
  try {
    const [assignee] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, assignedToId))
      .limit(1)
    if (!assignee) return

    let projectName = '—'
    let projectReference = '—'
    if (projectId) {
      const [proj] = await db
        .select({ name: projects.name, reference: projects.reference })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
      if (proj) { projectName = proj.name; projectReference = proj.reference }
    }

    await sendEmail({
      to:               assignee.email,
      subject:          `[SOPAT] Non-conformité ${ncReference} — action requise`,
      template:         'nc-assigned',
      props: {
        recipientName:    assignee.name,
        ncReference,
        ncId,
        projectName,
        projectReference,
        processAffected,
        description,
        deadline:         deadline?.toISOString() ?? null,
        detectedBy:       detectedByName,
        detectedAt:       new Date().toISOString(),
      },
      projectId:         projectId ?? undefined,
      recipientId:       assignee.id,
      relatedEntityType: 'non_conformance',
      relatedEntityId:   ncId,
      createdBy:         detectedBy,
    })
  } catch (err) {
    console.error('[triggerNcAssignedEmail] failed:', err)
  }
}
