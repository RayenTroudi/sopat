import { SignJWT, jwtVerify } from 'jose'
import { db } from '../../db/index'
import { budgetValidations, budgetPredictions, projects, users } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

const raw = process.env.JWT_SECRET
if (!raw || raw.length < 32) {
  throw new Error('JWT_SECRET must be set to a strong random value of at least 32 characters')
}
const secret = new TextEncoder().encode(raw)

// ─── Token payload ────────────────────────────────────────────────────────────

export type ValidationTokenPayload = {
  projectId:    string
  predictionId: string
  chefUserId:   string
  action:       'validate' | 'edit'
}

// ─── Sign / verify ────────────────────────────────────────────────────────────

/** Signs a 7-day HS256 JWT. */
export async function signValidationToken(payload: ValidationTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * Verifies signature and expiry.
 * Returns the typed payload, or null if invalid / expired.
 */
export async function verifyValidationToken(
  token: string
): Promise<ValidationTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const { projectId, predictionId, chefUserId, action } = payload as Record<string, unknown>
    if (
      typeof projectId    !== 'string' ||
      typeof predictionId !== 'string' ||
      typeof chefUserId   !== 'string' ||
      (action !== 'validate' && action !== 'edit')
    ) return null
    return { projectId, predictionId, chefUserId, action }
  } catch {
    return null
  }
}

// ─── Token state helpers ──────────────────────────────────────────────────────

export type TokenState =
  | { state: 'valid';   validation: ValidationRow; prediction: PredictionRow; project: ProjectRow; chef: ChefRow }
  | { state: 'expired' }
  | { state: 'used';    action: 'validate' | 'edit' }
  | { state: 'invalid' }

export type ValidationRow = {
  id:                 string
  status:             string
  modificationReason: string | null
  modifiedValues:     unknown
  validatedAt:        Date | null
  modifiedAt:         Date | null
}

export type PredictionRow = {
  id:               string
  predictedTotal:   string
  confidenceLow:    string | null
  confidenceHigh:   string | null
  confidenceScore:  number | null
  breakdownPlants:  string | null
  breakdownSoil:    string | null
  breakdownLabor:   string | null
  breakdownEquipment: string | null
  breakdownLogistics: string | null
  topCostDrivers:   string[] | null
  modelVersion:     string | null
  isFallback:       boolean
}

export type ProjectRow = {
  id:        string
  name:      string
  reference: string
  clientName: string
  siteAreaM2: string | null
  projectType: string
}

export type ChefRow = {
  id:    string
  name:  string
  email: string
}

/**
 * Full token resolution: verifies JWT, checks DB state, loads all data
 * needed to render the validate/edit page.
 */
export async function resolveToken(rawToken: string): Promise<TokenState> {
  // 1. Cryptographic verification
  const payload = await verifyValidationToken(rawToken)
  if (!payload) return { state: 'invalid' }

  // 2. Load the pending validation row that was saved when the email was sent
  const [validation] = await db
    .select()
    .from(budgetValidations)
    .where(eq(budgetValidations.token, rawToken))
    .limit(1)

  // If no row found by exact token — could be a reused/forged token
  if (!validation) {
    // Check if a newer validation for this prediction already exists
    const [existing] = await db
      .select({ status: budgetValidations.status })
      .from(budgetValidations)
      .where(eq(budgetValidations.predictionId, payload.predictionId))
      .orderBy(desc(budgetValidations.createdAt))
      .limit(1)
    if (existing && (existing.status === 'validated' || existing.status === 'modified')) {
      return { state: 'used', action: payload.action }
    }
    return { state: 'invalid' }
  }

  // 3. Check if already resolved
  if (validation.status === 'validated' || validation.status === 'modified') {
    return { state: 'used', action: payload.action }
  }

  // 4. Check token expiry in DB (belt-and-suspenders beyond JWT expiry)
  if (validation.tokenExpiresAt < new Date()) {
    return { state: 'expired' }
  }

  // 5. Load prediction + project + chef
  const [prediction] = await db
    .select()
    .from(budgetPredictions)
    .where(eq(budgetPredictions.id, payload.predictionId))
    .limit(1)

  const [project] = await db
    .select({
      id:          projects.id,
      name:        projects.name,
      reference:   projects.reference,
      clientName:  projects.clientName,
      siteAreaM2:  projects.siteAreaM2,
      projectType: projects.projectType,
    })
    .from(projects)
    .where(eq(projects.id, payload.projectId))
    .limit(1)

  const [chef] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, payload.chefUserId))
    .limit(1)

  if (!prediction || !project || !chef) return { state: 'invalid' }

  return {
    state: 'valid',
    validation: {
      id:                 validation.id,
      status:             validation.status,
      modificationReason: validation.modificationReason,
      modifiedValues:     validation.modifiedValues,
      validatedAt:        validation.validatedAt,
      modifiedAt:         validation.modifiedAt,
    },
    prediction,
    project,
    chef,
  }
}

/** Mark a budget_validations row as validated (accept path). */
export async function markTokenValidated(validationId: string, chefUserId: string, predictionId: string, projectId: string, approvedAmount: number) {
  const now = new Date()
  await db
    .update(budgetValidations)
    .set({ status: 'validated', validatedAt: now, updatedAt: now })
    .where(eq(budgetValidations.id, validationId))

  await db
    .update(budgetPredictions)
    .set({ status: 'accepted', updatedAt: now })
    .where(eq(budgetPredictions.id, predictionId))

  await db
    .update(projects)
    .set({ approvedBudget: String(approvedAmount), updatedAt: now })
    .where(eq(projects.id, projectId))
}

/** Mark a budget_validations row as modified (edit path). */
export async function markTokenModified(
  validationId: string,
  predictionId: string,
  projectId: string,
  approvedAmount: number,
  modificationReason: string,
  modifiedValues: Record<string, number>
) {
  const now = new Date()
  await db
    .update(budgetValidations)
    .set({
      status:             'modified',
      modifiedAt:         now,
      modificationReason,
      modifiedValues,
      updatedAt:          now,
    })
    .where(eq(budgetValidations.id, validationId))

  await db
    .update(budgetPredictions)
    .set({ status: 'overridden', updatedAt: now })
    .where(eq(budgetPredictions.id, predictionId))

  await db
    .update(projects)
    .set({ approvedBudget: String(approvedAmount), updatedAt: now })
    .where(eq(projects.id, projectId))
}
