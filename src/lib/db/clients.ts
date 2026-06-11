import { db } from '../../../db/index'
import { clients, clientInteractions, projects, users, cloudinaryAssets } from '../../../db/schema'
import { eq, and, isNull, desc, ilike, or, sql } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClientRow = {
  id: string
  companyName: string
  displayName: string
  clientType: string
  country: string
  city: string | null
  address: string | null
  primaryContactName: string | null
  primaryContactTitle: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  secondaryContactName: string | null
  secondaryContactEmail: string | null
  logoUrl: string | null
  isFeatured: boolean
  notes: string | null
  projectCount: number
  lastProjectDate: Date | null
  totalRevenueTND: number
  createdAt: Date
}

export type ClientInteractionRow = {
  id: string
  clientId: string
  interactionType: string
  date: string
  summary: string
  outcome: string | null
  nextAction: string | null
  nextActionDate: string | null
  loggedBy: string
  loggedByName: string | null
  createdAt: Date
}

export type CreateClientInput = {
  companyName: string
  displayName: string
  clientType: string
  country?: string
  city?: string
  address?: string
  primaryContactName?: string
  primaryContactTitle?: string
  primaryContactEmail?: string
  primaryContactPhone?: string
  secondaryContactName?: string
  secondaryContactEmail?: string
  logoCloudinaryId?: string
  isFeatured?: boolean
  notes?: string
  createdBy: string
}

export type UpdateClientInput = Partial<Omit<CreateClientInput, 'createdBy'>>

export type CreateInteractionInput = {
  clientId: string
  interactionType: string
  date: string
  summary: string
  outcome?: string
  nextAction?: string
  nextActionDate?: string
  loggedBy: string
}

// ─── Aggregate helper ─────────────────────────────────────────────────────────

async function getAggregatesForClients(
  clientIds: string[]
): Promise<Map<string, { projectCount: number; lastProjectDate: Date | null; totalRevenueTND: number }>> {
  if (clientIds.length === 0) return new Map()

  const rows = await db
    .select({
      clientId: projects.clientId,
      projectCount: sql<number>`count(${projects.id})::int`,
      lastProjectDate: sql<string>`max(${projects.createdAt})`,
      totalRevenueTND: sql<string>`coalesce(sum(${projects.approvedBudget}::numeric), 0)::text`,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .groupBy(projects.clientId)

  const map = new Map<string, { projectCount: number; lastProjectDate: Date | null; totalRevenueTND: number }>()
  for (const r of rows) {
    if (r.clientId && clientIds.includes(r.clientId)) {
      map.set(r.clientId, {
        projectCount: Number(r.projectCount),
        lastProjectDate: r.lastProjectDate ? new Date(r.lastProjectDate) : null,
        totalRevenueTND: parseFloat(r.totalRevenueTND),
      })
    }
  }
  return map
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listClients(filters?: {
  type?: string
  country?: string
  isFeatured?: boolean
}): Promise<ClientRow[]> {
  const conditions = [isNull(clients.deletedAt)]
  if (filters?.type) conditions.push(eq(clients.clientType, filters.type))
  if (filters?.country) conditions.push(eq(clients.country, filters.country))
  if (filters?.isFeatured !== undefined) conditions.push(eq(clients.isFeatured, filters.isFeatured))

  const rows = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      displayName: clients.displayName,
      clientType: clients.clientType,
      country: clients.country,
      city: clients.city,
      address: clients.address,
      primaryContactName: clients.primaryContactName,
      primaryContactTitle: clients.primaryContactTitle,
      primaryContactEmail: clients.primaryContactEmail,
      primaryContactPhone: clients.primaryContactPhone,
      secondaryContactName: clients.secondaryContactName,
      secondaryContactEmail: clients.secondaryContactEmail,
      logoUrl: cloudinaryAssets.secureUrl,
      isFeatured: clients.isFeatured,
      notes: clients.notes,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .leftJoin(cloudinaryAssets, eq(clients.logoCloudinaryId, cloudinaryAssets.id))
    .where(and(...conditions))
    .orderBy(desc(clients.createdAt))

  const ids = rows.map((r) => r.id)
  const aggMap = await getAggregatesForClients(ids)

  return rows.map((r) => ({
    ...r,
    ...(aggMap.get(r.id) ?? { projectCount: 0, lastProjectDate: null, totalRevenueTND: 0 }),
  }))
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getClientById(id: string): Promise<ClientRow | null> {
  const [row] = await db
    .select({
      id: clients.id,
      companyName: clients.companyName,
      displayName: clients.displayName,
      clientType: clients.clientType,
      country: clients.country,
      city: clients.city,
      address: clients.address,
      primaryContactName: clients.primaryContactName,
      primaryContactTitle: clients.primaryContactTitle,
      primaryContactEmail: clients.primaryContactEmail,
      primaryContactPhone: clients.primaryContactPhone,
      secondaryContactName: clients.secondaryContactName,
      secondaryContactEmail: clients.secondaryContactEmail,
      logoUrl: cloudinaryAssets.secureUrl,
      isFeatured: clients.isFeatured,
      notes: clients.notes,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .leftJoin(cloudinaryAssets, eq(clients.logoCloudinaryId, cloudinaryAssets.id))
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .limit(1)

  if (!row) return null

  const aggMap = await getAggregatesForClients([id])
  return { ...row, ...(aggMap.get(id) ?? { projectCount: 0, lastProjectDate: null, totalRevenueTND: 0 }) }
}

// ─── Get client's projects ────────────────────────────────────────────────────

export async function getClientProjects(clientId: string) {
  return db
    .select({
      id: projects.id,
      reference: projects.reference,
      name: projects.name,
      projectType: projects.projectType,
      status: projects.status,
      country: projects.country,
      approvedBudget: projects.approvedBudget,
      currency: projects.currency,
      estimatedDeliveryDate: projects.estimatedDeliveryDate,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(eq(projects.clientId, clientId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt))
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function getClientInteractions(clientId: string): Promise<ClientInteractionRow[]> {
  return db
    .select({
      id: clientInteractions.id,
      clientId: clientInteractions.clientId,
      interactionType: clientInteractions.interactionType,
      date: clientInteractions.date,
      summary: clientInteractions.summary,
      outcome: clientInteractions.outcome,
      nextAction: clientInteractions.nextAction,
      nextActionDate: clientInteractions.nextActionDate,
      loggedBy: clientInteractions.loggedBy,
      loggedByName: users.name,
      createdAt: clientInteractions.createdAt,
    })
    .from(clientInteractions)
    .leftJoin(users, eq(clientInteractions.loggedBy, users.id))
    .where(eq(clientInteractions.clientId, clientId))
    .orderBy(desc(clientInteractions.date))
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createClient(input: CreateClientInput): Promise<string> {
  const [row] = await db
    .insert(clients)
    .values({
      companyName: input.companyName,
      displayName: input.displayName,
      clientType: input.clientType,
      country: input.country ?? 'TN',
      city: input.city ?? null,
      address: input.address ?? null,
      primaryContactName: input.primaryContactName ?? null,
      primaryContactTitle: input.primaryContactTitle ?? null,
      primaryContactEmail: input.primaryContactEmail ?? null,
      primaryContactPhone: input.primaryContactPhone ?? null,
      secondaryContactName: input.secondaryContactName ?? null,
      secondaryContactEmail: input.secondaryContactEmail ?? null,
      logoCloudinaryId: input.logoCloudinaryId ?? null,
      isFeatured: input.isFeatured ?? false,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    })
    .returning({ id: clients.id })
  return row.id
}

export async function updateClient(id: string, input: UpdateClientInput): Promise<boolean> {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (input.companyName !== undefined) updates.companyName = input.companyName
  if (input.displayName !== undefined) updates.displayName = input.displayName
  if (input.clientType !== undefined) updates.clientType = input.clientType
  if (input.country !== undefined) updates.country = input.country
  if (input.city !== undefined) updates.city = input.city
  if (input.address !== undefined) updates.address = input.address
  if (input.primaryContactName !== undefined) updates.primaryContactName = input.primaryContactName
  if (input.primaryContactTitle !== undefined) updates.primaryContactTitle = input.primaryContactTitle
  if (input.primaryContactEmail !== undefined) updates.primaryContactEmail = input.primaryContactEmail
  if (input.primaryContactPhone !== undefined) updates.primaryContactPhone = input.primaryContactPhone
  if (input.secondaryContactName !== undefined) updates.secondaryContactName = input.secondaryContactName
  if (input.secondaryContactEmail !== undefined) updates.secondaryContactEmail = input.secondaryContactEmail
  if (input.logoCloudinaryId !== undefined) updates.logoCloudinaryId = input.logoCloudinaryId
  if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured
  if (input.notes !== undefined) updates.notes = input.notes

  const result = await db
    .update(clients)
    .set(updates)
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .returning({ id: clients.id })
  return result.length > 0
}

export async function softDeleteClient(id: string): Promise<boolean> {
  const result = await db
    .update(clients)
    .set({ deletedAt: new Date() })
    .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
    .returning({ id: clients.id })
  return result.length > 0
}

export async function createInteraction(input: CreateInteractionInput): Promise<string> {
  const [row] = await db
    .insert(clientInteractions)
    .values({
      clientId: input.clientId,
      interactionType: input.interactionType as 'appel' | 'email' | 'reunion' | 'visite_site' | 'autre',
      date: input.date,
      summary: input.summary,
      outcome: input.outcome ?? null,
      nextAction: input.nextAction ?? null,
      nextActionDate: input.nextActionDate ?? null,
      loggedBy: input.loggedBy,
    })
    .returning({ id: clientInteractions.id })
  return row.id
}

export async function deleteInteraction(id: string, clientId: string): Promise<boolean> {
  const result = await db
    .delete(clientInteractions)
    .where(and(eq(clientInteractions.id, id), eq(clientInteractions.clientId, clientId)))
    .returning({ id: clientInteractions.id })
  return result.length > 0
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchClients(q: string): Promise<{ id: string; displayName: string; clientType: string; country: string }[]> {
  return db
    .select({
      id: clients.id,
      displayName: clients.displayName,
      clientType: clients.clientType,
      country: clients.country,
    })
    .from(clients)
    .where(
      and(
        isNull(clients.deletedAt),
        q.trim()
          ? or(
              ilike(clients.companyName, `%${q}%`),
              ilike(clients.displayName, `%${q}%`),
            )
          : undefined,
      )
    )
    .orderBy(clients.displayName)
    .limit(20)
}
