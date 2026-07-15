import { db } from '../../../db/index'
import { budgetPredictions, budgetValidations, projects, users } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'

export type PredictionBreakdown = {
  plants: number
  soil_substrates: number
  labor: number
  equipment: number
  logistics: number
}

export type PredictionOutput = {
  predicted_total: number
  confidence_low: number
  confidence_high: number
  confidence_score: number
  breakdown: PredictionBreakdown
  top_cost_drivers: string[]
  model_version: string
  similar_projects_used: number
}

export type SavePredictionInput = {
  projectId: string
  output: PredictionOutput
  rawInput: Record<string, unknown>
  isFallback: boolean
  createdBy: string
}

export async function savePrediction(input: SavePredictionInput) {
  const { projectId, output, rawInput, isFallback, createdBy } = input

  // Version = count of existing predictions + 1
  const existing = await db
    .select({ id: budgetPredictions.id })
    .from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, projectId))
  const version = existing.length + 1

  const [row] = await db
    .insert(budgetPredictions)
    .values({
      projectId,
      version,
      predictedTotal:   String(output.predicted_total),
      confidenceLow:    String(output.confidence_low),
      confidenceHigh:   String(output.confidence_high),
      confidenceScore:  output.confidence_score,
      breakdownPlants:  String(output.breakdown.plants),
      breakdownSoil:    String(output.breakdown.soil_substrates),
      breakdownLabor:   String(output.breakdown.labor),
      breakdownEquipment: String(output.breakdown.equipment),
      breakdownLogistics: String(output.breakdown.logistics),
      topCostDrivers:   output.top_cost_drivers,
      modelVersion:     output.model_version,
      similarProjectsUsed: output.similar_projects_used,
      isFallback,
      rawInput,
      status:           'pending',
      createdBy,
    })
    .returning()

  return row
}

export async function getLatestPrediction(projectId: string) {
  const [row] = await db
    .select()
    .from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, projectId))
    .orderBy(desc(budgetPredictions.version))
    .limit(1)
  return row ?? null
}

export async function getPredictionsForProject(projectId: string) {
  return db
    .select()
    .from(budgetPredictions)
    .where(eq(budgetPredictions.projectId, projectId))
    .orderBy(desc(budgetPredictions.version))
}

// ─── Budget validation (accept / modify) ─────────────────────────────────────

export type ValidationStatus = 'pending' | 'validated' | 'modified' | 'expired'

export type SaveValidationInput = {
  projectId: string
  predictionId: string
  chefUserId: string
  status: 'validated' | 'modified'
  approvedAmount: number          // the final TND amount written to projects.approved_budget
  modificationReason?: string
  modifiedValues?: Record<string, number>
  createdBy: string
}

export async function saveBudgetValidation(input: SaveValidationInput) {
  const now = new Date()
  const tokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Placeholder token (not used for chef email flow here, just required by schema)
  const token = `internal-${crypto.randomUUID()}`

  const [validation] = await db
    .insert(budgetValidations)
    .values({
      projectId:           input.projectId,
      predictionId:        input.predictionId,
      chefUserId:          input.chefUserId,
      status:              input.status,
      token,
      tokenExpiresAt:      tokenExpiry,
      validatedAt:         input.status === 'validated' ? now : null,
      modifiedAt:          input.status === 'modified'  ? now : null,
      modificationReason:  input.modificationReason ?? null,
      modifiedValues:      input.modifiedValues ?? null,
      createdBy:           input.createdBy,
    })
    .returning()

  // Update the prediction row status
  await db
    .update(budgetPredictions)
    .set({ status: input.status === 'validated' ? 'accepted' : 'overridden' })
    .where(eq(budgetPredictions.id, input.predictionId))

  // Write the approved budget to the project — reset the alert dedupe columns so
  // a re-approved budget starts a fresh 90%/100% notification cycle.
  await db
    .update(projects)
    .set({
      approvedBudget: String(input.approvedAmount),
      budgetAlert90NotifiedAt: null,
      budgetAlertOverNotifiedAt: null,
      updatedAt: now,
    })
    .where(eq(projects.id, input.projectId))

  return validation
}

export type BudgetValidationWithActor = {
  id: string
  projectId: string
  predictionId: string
  status: string
  approvedAmount: string | null
  modificationReason: string | null
  modifiedValues: unknown
  validatedAt: Date | null
  modifiedAt: Date | null
  chefName: string | null
  chefEmail: string | null
  createdAt: Date
}

export async function getLatestBudgetValidation(
  projectId: string
): Promise<BudgetValidationWithActor | null> {
  const rows = await db
    .select({
      id:                 budgetValidations.id,
      projectId:          budgetValidations.projectId,
      predictionId:       budgetValidations.predictionId,
      status:             budgetValidations.status,
      modificationReason: budgetValidations.modificationReason,
      modifiedValues:     budgetValidations.modifiedValues,
      validatedAt:        budgetValidations.validatedAt,
      modifiedAt:         budgetValidations.modifiedAt,
      createdAt:          budgetValidations.createdAt,
      chefName:           users.name,
      chefEmail:          users.email,
    })
    .from(budgetValidations)
    .leftJoin(users, eq(budgetValidations.chefUserId, users.id))
    .where(eq(budgetValidations.projectId, projectId))
    .orderBy(desc(budgetValidations.createdAt))
    .limit(1)

  if (!rows[0]) return null

  // Fetch the approved budget from the project itself (source of truth)
  const [proj] = await db
    .select({ approvedBudget: projects.approvedBudget })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  return {
    ...rows[0],
    approvedAmount: proj?.approvedBudget ?? null,
  }
}
