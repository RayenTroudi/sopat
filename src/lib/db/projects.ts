import { db } from '../../../db/index'
import {
  projects,
  projectPhases,
  projectActivityLog,
  cloudinaryAssets,
  clients,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql } from 'drizzle-orm'
import { attachDmsCode } from '../dms/attach'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'draft' | 'etudes' | 'realisation' | 'entretien' | 'completed' | 'cancelled'
export type PhaseStatus = 'pending' | 'in_progress' | 'awaiting_signoff' | 'completed'
export type Phase = 'etudes' | 'realisation' | 'entretien'
export type ProjectType =
  | 'ingenierie_territoriale'
  | 'espace_public'
  | 'siege_social'
  | 'hotelier_touristique'
  | 'residentiel'
  | 'interieur'

export type Currency = 'TND' | 'EUR' | 'OMR' | 'XOF' | 'QAR' | 'LYD' | 'USD'

export type ClientSector =
  | 'banque' | 'hotellerie' | 'automobile'
  | 'institutionnel_public' | 'institutionnel_prive'
  | 'residentiel_prive' | 'diplomatique' | 'autre'

// Phase state machine: each status maps to the phase it belongs to, and what comes next
const PHASE_ORDER: Phase[] = ['etudes', 'realisation', 'entretien']
const PHASE_TO_STATUS: Record<Phase, ProjectStatus> = {
  etudes: 'etudes',
  realisation: 'realisation',
  entretien: 'entretien',
}
const NEXT_PHASE: Record<Phase, Phase | 'completed'> = {
  etudes: 'realisation',
  realisation: 'entretien',
  entretien: 'completed',
}

export type CreateProjectInput = {
  name: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  siteAddress: string
  siteAreaM2?: string
  projectType: ProjectType
  country?: string
  currency?: Currency
  clientSector?: ClientSector
  clientAnonymized?: boolean
  conceptTitle?: string
  conceptDescription?: string
  designVocabulary?: string[]
  plantPalettePhilosophy?: string[]
  linearMeters?: string
  floorCount?: number
  municipalityClient?: string
  territorySurfaceKm2?: string
  numberOfMunicipalities?: number
  lightingIncluded?: boolean
  clientId?: string
  startDate?: Date
  estimatedDeliveryDate?: Date
  assignedEtudesChefId?: string
  notes?: string
  createdBy: string
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'createdBy'>> & {
  assignedRealisationChefId?: string
  assignedEntretienChefId?: string
  approvedBudget?: string
  status?: ProjectStatus
  clientId?: string | null
}

export type ProjectRow = typeof projects.$inferSelect & {
  etudesChef: { id: string; name: string } | null
  realisationChef: { id: string; name: string } | null
}

// ─── Reference generator ──────────────────────────────────────────────────────

async function generateReference(): Promise<string> {
  const year = new Date().getFullYear()
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(sql`extract(year from created_at) = ${year}`)
  const count = Number(result[0].count) + 1
  return `PRJ-${year}-${String(count).padStart(4, '0')}`
}

// ─── Activity log helper ──────────────────────────────────────────────────────

export async function logActivity({
  projectId,
  actorId,
  actorName,
  action,
  previousState,
  newState,
  metadata,
}: {
  projectId: string
  actorId: string
  actorName: string
  action: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}) {
  await db.insert(projectActivityLog).values({
    projectId,
    actorId,
    actorName,
    action,
    previousState: previousState ?? null,
    newState: newState ?? null,
    metadata: metadata ?? null,
    createdBy: actorId,
  })
}

// ─── Privacy helpers ──────────────────────────────────────────────────────────

export function maskClientName(clientName: string, anonymized: boolean, role: string): string {
  if (!anonymized) return clientName
  if (role === 'admin' || role === 'direction') return clientName
  // Build initials: "Mohamed Karim Ben Salah" → "M. K. B. S."
  const parts = clientName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return clientName
  return parts.map((p) => p[0].toUpperCase() + '.').join(' ')
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllProjects(filters?: {
  status?: ProjectStatus
  projectType?: ProjectType
  country?: string
  page?: number
  pageSize?: number
}) {
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 25
  const offset = (page - 1) * pageSize

  // Build where conditions
  const conditions = [isNull(projects.deletedAt)]
  if (filters?.status) conditions.push(eq(projects.status, filters.status))
  if (filters?.projectType) conditions.push(eq(projects.projectType, filters.projectType))
  if (filters?.country) conditions.push(eq(projects.country, filters.country))

  const rows = await db
    .select({
      id: projects.id,
      reference: projects.reference,
      name: projects.name,
      clientName: projects.clientName,
      clientEmail: projects.clientEmail,
      clientPhone: projects.clientPhone,
      siteAddress: projects.siteAddress,
      siteAreaM2: projects.siteAreaM2,
      projectType: projects.projectType,
      country: projects.country,
      currency: projects.currency,
      clientAnonymized: projects.clientAnonymized,
      status: projects.status,
      startDate: projects.startDate,
      estimatedDeliveryDate: projects.estimatedDeliveryDate,
      actualDeliveryDate: projects.actualDeliveryDate,
      assignedEtudesChefId: projects.assignedEtudesChefId,
      assignedRealisationChefId: projects.assignedRealisationChefId,
      assignedEntretienChefId: projects.assignedEntretienChefId,
      approvedBudget: projects.approvedBudget,
      notes: projects.notes,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      deletedAt: projects.deletedAt,
      createdBy: projects.createdBy,
      clientId: projects.clientId,
      clientDisplayName: clients.displayName,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(projects)
    .where(and(...conditions))

  return { rows, total: Number(total), page, pageSize }
}

export async function getProjectById(id: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) return null

  const phases = await db
    .select()
    .from(projectPhases)
    .where(eq(projectPhases.projectId, id))
    .orderBy(asc(projectPhases.createdAt))

  const activityLog = await db
    .select()
    .from(projectActivityLog)
    .where(eq(projectActivityLog.projectId, id))
    .orderBy(desc(projectActivityLog.occurredAt))
    .limit(100)

  const assets = await db
    .select({
      id: cloudinaryAssets.id,
      publicId: cloudinaryAssets.publicId,
      url: cloudinaryAssets.url,
      secureUrl: cloudinaryAssets.secureUrl,
      assetType: cloudinaryAssets.assetType,
      format: cloudinaryAssets.format,
      bytes: cloudinaryAssets.bytes,
      width: cloudinaryAssets.width,
      height: cloudinaryAssets.height,
    })
    .from(cloudinaryAssets)
    .where(eq(cloudinaryAssets.projectId, id))
    .orderBy(asc(cloudinaryAssets.createdAt))

  return { project, phases, activityLog, assets }
}

// ─── Authorization helpers ────────────────────────────────────────────────────

/** Lightweight project fetch — just the row, no joins. Returns null if not found / deleted. */
export async function getProjectRow(id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

type SessionUser = { userId: string; role: string }

/**
 * Returns the project row if the user is allowed to access it, or null if
 * not found, or throws a typed error string for the caller to turn into a
 * 403 response.
 *
 * Access rules (mirrors CLAUDE.md spec):
 *   - admin / direction → full access to every project
 *   - etudes_chef / etudes_team → only projects they are assigned to as études chef
 *   - realisation_chef / realisation_team → only their réalisation projects
 *   - entretien_chef / entretien_team → only their entretien projects
 */
export async function assertProjectAccess(
  projectId: string,
  user: SessionUser
): Promise<{ project: NonNullable<Awaited<ReturnType<typeof getProjectRow>>>} | { error: 'NOT_FOUND' | 'FORBIDDEN' }> {
  const project = await getProjectRow(projectId)
  if (!project) return { error: 'NOT_FOUND' }

  const role = user.role
  const uid = user.userId

  if (role === 'admin' || role === 'direction') return { project }

  const allowed =
    ((role === 'etudes_chef' || role === 'etudes_team') && project.assignedEtudesChefId === uid) ||
    ((role === 'realisation_chef' || role === 'realisation_team') && project.assignedRealisationChefId === uid) ||
    ((role === 'entretien_chef' || role === 'entretien_team') && project.assignedEntretienChefId === uid)

  return allowed ? { project } : { error: 'FORBIDDEN' }
}

// ─── Projects CRUD ────────────────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput) {
  const reference = await generateReference()

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        reference,
        name:                   input.name,
        clientName:             input.clientName,
        clientEmail:            input.clientEmail,
        clientPhone:            input.clientPhone,
        siteAddress:            input.siteAddress,
        siteAreaM2:             input.siteAreaM2,
        projectType:            input.projectType,
        status:                 'etudes',
        startDate:              input.startDate,
        estimatedDeliveryDate:  input.estimatedDeliveryDate,
        assignedEtudesChefId:   input.assignedEtudesChefId,
        notes:                  input.notes,
        country:                input.country ?? 'TN',
        currency:               input.currency ?? 'TND',
        clientSector:           input.clientSector,
        clientAnonymized:       input.clientAnonymized ?? false,
        conceptTitle:           input.conceptTitle,
        conceptDescription:     input.conceptDescription,
        designVocabulary:       input.designVocabulary,
        plantPalettePhilosophy: input.plantPalettePhilosophy,
        linearMeters:           input.linearMeters,
        floorCount:             input.floorCount,
        municipalityClient:     input.municipalityClient,
        territorySurfaceKm2:    input.territorySurfaceKm2,
        numberOfMunicipalities: input.numberOfMunicipalities,
        lightingIncluded:       input.lightingIncluded ?? false,
        clientId:               input.clientId ?? null,
        createdBy:              input.createdBy,
      })
      .returning()

    // Initial phase record — stays in same transaction
    await tx.insert(projectPhases).values({
      projectId: project.id,
      phase:     'etudes',
      status:    'in_progress',
      startedAt: new Date(),
      createdBy: input.createdBy,
    })

    const dmsCode = await attachDmsCode(tx, {
      typeCode:    'PRS',
      processCode: 'RE',
      designation: input.name,
      department:  'realisation',
      category:    'cartographie_processus',
      entityType:  'project',
      entityId:    project.id,
      authorId:    input.createdBy,
    })

    await tx
      .update(projects)
      .set({ dmsDocumentCode: dmsCode })
      .where(eq(projects.id, project.id))

    return { ...project, dmsDocumentCode: dmsCode }
  })
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actorId: string,
  actorName: string
) {
  const [before] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)

  if (!before) throw new Error('Projet introuvable')

  const [updated] = await db
    .update(projects)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning()

  await logActivity({
    projectId: id,
    actorId,
    actorName,
    action: 'project.updated',
    previousState: { status: before.status, name: before.name },
    newState: { status: updated.status, name: updated.name },
  })

  return updated
}

export async function softDeleteProject(
  id: string,
  actorId: string,
  actorName: string
) {
  const [before] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1)

  if (!before) throw new Error('Projet introuvable')

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, id))

  await logActivity({
    projectId: id,
    actorId,
    actorName,
    action: 'project.deleted',
    previousState: { status: before.status },
  })
}

// ─── Phase state machine ──────────────────────────────────────────────────────

export type PhaseTransitionError =
  | 'PROJECT_NOT_FOUND'
  | 'PHASE_NOT_FOUND'
  | 'PHASE_NOT_SIGNED_OFF'
  | 'ALREADY_COMPLETED'

export type PhaseTransitionResult =
  | { ok: true; newStatus: ProjectStatus }
  | { ok: false; error: PhaseTransitionError; message: string }

export async function transitionPhase(
  projectId: string,
  currentPhase: Phase,
  signOffData: {
    actorId: string
    actorName: string
    notes?: string
  }
): Promise<PhaseTransitionResult> {
  // Load project
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) return { ok: false, error: 'PROJECT_NOT_FOUND', message: 'Projet introuvable' }
  if (project.status === 'completed') {
    return { ok: false, error: 'ALREADY_COMPLETED', message: 'Le projet est déjà terminé' }
  }

  // Verify the phase we are signing off is actually in_progress or awaiting_signoff
  const [phase] = await db
    .select()
    .from(projectPhases)
    .where(
      and(
        eq(projectPhases.projectId, projectId),
        eq(projectPhases.phase, currentPhase)
      )
    )
    .limit(1)

  if (!phase) return { ok: false, error: 'PHASE_NOT_FOUND', message: 'Phase introuvable' }

  if (phase.status !== 'in_progress' && phase.status !== 'awaiting_signoff') {
    return {
      ok: false,
      error: 'PHASE_NOT_SIGNED_OFF',
      message: `La phase ${currentPhase} n'est pas en cours ou en attente de validation`,
    }
  }

  // Verify all previous phases are completed
  const phaseIndex = PHASE_ORDER.indexOf(currentPhase)
  for (let i = 0; i < phaseIndex; i++) {
    const prevPhase = PHASE_ORDER[i]
    const [prev] = await db
      .select()
      .from(projectPhases)
      .where(
        and(
          eq(projectPhases.projectId, projectId),
          eq(projectPhases.phase, prevPhase)
        )
      )
      .limit(1)

    if (!prev || prev.status !== 'completed') {
      return {
        ok: false,
        error: 'PHASE_NOT_SIGNED_OFF',
        message: `La phase précédente (${prevPhase}) n'a pas été validée`,
      }
    }
  }

  const now = new Date()
  const next = NEXT_PHASE[currentPhase]

  // Sign off the current phase
  await db
    .update(projectPhases)
    .set({
      status: 'completed',
      completedAt: now,
      signedOffAt: now,
      signedOffBy: signOffData.actorId,
      notes: signOffData.notes,
      updatedAt: now,
    })
    .where(eq(projectPhases.id, phase.id))

  let newStatus: ProjectStatus

  if (next === 'completed') {
    newStatus = 'completed'
    await db
      .update(projects)
      .set({ status: 'completed', actualDeliveryDate: now, updatedAt: now })
      .where(eq(projects.id, projectId))
  } else {
    newStatus = PHASE_TO_STATUS[next]
    // Create the next phase record
    await db.insert(projectPhases).values({
      projectId,
      phase: next as Phase,
      status: 'in_progress',
      startedAt: now,
      createdBy: signOffData.actorId,
    })
    await db
      .update(projects)
      .set({ status: newStatus, updatedAt: now })
      .where(eq(projects.id, projectId))
  }

  await logActivity({
    projectId,
    actorId: signOffData.actorId,
    actorName: signOffData.actorName,
    action: 'project.phase_transition',
    previousState: { phase: currentPhase, phaseStatus: 'in_progress', projectStatus: project.status },
    newState: { phase: next, projectStatus: newStatus },
    metadata: { notes: signOffData.notes },
  })

  return { ok: true, newStatus }
}
