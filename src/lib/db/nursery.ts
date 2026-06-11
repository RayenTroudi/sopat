import { db } from '../../../db/index'
import {
  nurseryStock,
  nurseryStockMovements,
  users,
  projects,
} from '../../../db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

export type NurseryStockRow = {
  id:               string
  botanicalName:    string
  commonName:       string | null
  category:         string
  currentQuantity:  string
  reservedQuantity: string
  availableQty:     number  // currentQuantity - reservedQuantity, computed
  unit:             string
  location:         string | null
  healthStatus:     string
  notes:            string | null
  photoUrl:         string | null
  createdAt:        Date
}

export type NurseryMovementRow = {
  id:              string
  stockId:         string
  movementType:    string
  quantityDelta:   string
  projectId:       string | null
  projectName:     string | null
  projectRef:      string | null
  notes:           string | null
  movedAt:         Date
  movedByName:     string | null
}

export type CreateStockInput = {
  botanicalName:     string
  commonName?:       string
  category:          string
  currentQuantity:   string
  unit:              string
  location?:         string
  healthStatus?:     string
  notes?:            string
  photoCloudinaryId?: string
  createdBy:         string
}

export type UpdateStockInput = Partial<Omit<CreateStockInput, 'createdBy'>>

export type CreateMovementInput = {
  stockId:          string
  movementType:     string
  quantityDelta:    string
  projectId?:       string
  plantListItemId?: string
  purchaseOrderId?: string
  notes?:           string
  movedAt?:         Date
  movedBy:          string
}

export type NurseryReportData = {
  totalSpecies:     number
  totalUnits:       number
  byCategory:       { category: string; count: number; units: number }[]
  byHealth:         { status: string; count: number }[]
  movementsLast30:  { date: string; receptions: number; uses: number }[]
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listNurseryStock(filters?: {
  category?: string
  healthStatus?: string
}): Promise<NurseryStockRow[]> {
  const rows = await db
    .select({
      id:               nurseryStock.id,
      botanicalName:    nurseryStock.botanicalName,
      commonName:       nurseryStock.commonName,
      category:         nurseryStock.category,
      currentQuantity:  nurseryStock.currentQuantity,
      reservedQuantity: nurseryStock.reservedQuantity,
      unit:             nurseryStock.unit,
      location:         nurseryStock.location,
      healthStatus:     nurseryStock.healthStatus,
      notes:            nurseryStock.notes,
      photoCloudinaryId: nurseryStock.photoCloudinaryId,
      createdAt:        nurseryStock.createdAt,
    })
    .from(nurseryStock)
    .where(
      and(
        isNull(nurseryStock.deletedAt),
        filters?.category     ? eq(nurseryStock.category,     filters.category     as any) : undefined,
        filters?.healthStatus ? eq(nurseryStock.healthStatus, filters.healthStatus as any) : undefined,
      )
    )
    .orderBy(nurseryStock.botanicalName)

  return rows.map((r) => ({
    ...r,
    availableQty: Math.max(0, parseFloat(r.currentQuantity) - parseFloat(r.reservedQuantity)),
    photoUrl: r.photoCloudinaryId
      ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${r.photoCloudinaryId}`
      : null,
  }))
}

export async function getNurseryStockById(id: string): Promise<NurseryStockRow | null> {
  const rows = await listNurseryStock()
  return rows.find((r) => r.id === id) ?? null
}

export async function searchNurseryStock(
  q: string,
): Promise<Pick<NurseryStockRow, 'id' | 'botanicalName' | 'commonName' | 'availableQty' | 'unit' | 'healthStatus'>[]> {
  const all = await listNurseryStock()
  const lower = q.toLowerCase()
  return all
    .filter(
      (r) =>
        r.botanicalName.toLowerCase().includes(lower) ||
        (r.commonName ?? '').toLowerCase().includes(lower),
    )
    .map(({ id, botanicalName, commonName, availableQty, unit, healthStatus }) => ({
      id,
      botanicalName,
      commonName,
      availableQty,
      unit,
      healthStatus,
    }))
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createNurseryStock(input: CreateStockInput): Promise<string> {
  const [row] = await db
    .insert(nurseryStock)
    .values({
      botanicalName:     input.botanicalName,
      commonName:        input.commonName ?? null,
      category:          input.category as any,
      currentQuantity:   input.currentQuantity,
      unit:              input.unit as any,
      location:          input.location ?? null,
      healthStatus:      (input.healthStatus ?? 'healthy') as any,
      notes:             input.notes ?? null,
      photoCloudinaryId: input.photoCloudinaryId ?? null,
      createdBy:         input.createdBy,
    })
    .returning({ id: nurseryStock.id })
  return row.id
}

export async function updateNurseryStock(id: string, input: UpdateStockInput): Promise<boolean> {
  const result = await db
    .update(nurseryStock)
    .set({
      ...(input.botanicalName     !== undefined && { botanicalName:     input.botanicalName }),
      ...(input.commonName        !== undefined && { commonName:        input.commonName }),
      ...(input.category          !== undefined && { category:          input.category as any }),
      ...(input.currentQuantity   !== undefined && { currentQuantity:   input.currentQuantity }),
      ...(input.unit              !== undefined && { unit:              input.unit as any }),
      ...(input.location          !== undefined && { location:          input.location }),
      ...(input.healthStatus      !== undefined && { healthStatus:      input.healthStatus as any }),
      ...(input.notes             !== undefined && { notes:             input.notes }),
      ...(input.photoCloudinaryId !== undefined && { photoCloudinaryId: input.photoCloudinaryId }),
      updatedAt: new Date(),
    })
    .where(and(eq(nurseryStock.id, id), isNull(nurseryStock.deletedAt)))
  return (result.rowCount ?? 0) > 0
}

export async function softDeleteNurseryStock(id: string): Promise<boolean> {
  const result = await db
    .update(nurseryStock)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(nurseryStock.id, id), isNull(nurseryStock.deletedAt)))
  return (result.rowCount ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

export async function getMovementsForStock(stockId: string): Promise<NurseryMovementRow[]> {
  const rows = await db
    .select({
      id:            nurseryStockMovements.id,
      stockId:       nurseryStockMovements.stockId,
      movementType:  nurseryStockMovements.movementType,
      quantityDelta: nurseryStockMovements.quantityDelta,
      projectId:     nurseryStockMovements.projectId,
      projectName:   projects.name,
      projectRef:    projects.reference,
      notes:         nurseryStockMovements.notes,
      movedAt:       nurseryStockMovements.movedAt,
      movedByName:   users.name,
    })
    .from(nurseryStockMovements)
    .leftJoin(users, eq(nurseryStockMovements.movedBy, users.id))
    .leftJoin(projects, eq(nurseryStockMovements.projectId, projects.id))
    .where(eq(nurseryStockMovements.stockId, stockId))
    .orderBy(desc(nurseryStockMovements.movedAt))

  return rows.map((r) => ({
    ...r,
    projectName: r.projectName ?? null,
    projectRef:  r.projectRef  ?? null,
    movedByName: r.movedByName ?? null,
  }))
}

export async function createMovement(input: CreateMovementInput): Promise<string> {
  const delta = parseFloat(input.quantityDelta)

  const [row] = await db
    .insert(nurseryStockMovements)
    .values({
      stockId:          input.stockId,
      movementType:     input.movementType as any,
      quantityDelta:    input.quantityDelta,
      projectId:        input.projectId        ?? null,
      plantListItemId:  input.plantListItemId  ?? null,
      purchaseOrderId:  input.purchaseOrderId  ?? null,
      notes:            input.notes            ?? null,
      movedAt:          input.movedAt          ?? new Date(),
      movedBy:          input.movedBy,
    })
    .returning({ id: nurseryStockMovements.id })

  // Update currentQuantity or reservedQuantity atomically
  const isReservation       = input.movementType === 'reservation'
  const isReservationCancel = input.movementType === 'reservation_cancel'

  if (isReservation) {
    await db
      .update(nurseryStock)
      .set({ reservedQuantity: sql`${nurseryStock.reservedQuantity} + ${delta}`, updatedAt: new Date() })
      .where(eq(nurseryStock.id, input.stockId))
  } else if (isReservationCancel) {
    await db
      .update(nurseryStock)
      .set({ reservedQuantity: sql`GREATEST(0, ${nurseryStock.reservedQuantity} - ${Math.abs(delta)})`, updatedAt: new Date() })
      .where(eq(nurseryStock.id, input.stockId))
  } else {
    await db
      .update(nurseryStock)
      .set({ currentQuantity: sql`${nurseryStock.currentQuantity} + ${delta}`, updatedAt: new Date() })
      .where(eq(nurseryStock.id, input.stockId))
  }

  return row.id
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export async function getNurseryReport(): Promise<NurseryReportData> {
  const stocks = await listNurseryStock()

  const totalSpecies = stocks.length
  const totalUnits   = stocks.reduce((s, r) => s + parseFloat(r.currentQuantity), 0)

  const byCategoryMap = new Map<string, { count: number; units: number }>()
  for (const r of stocks) {
    const cur = byCategoryMap.get(r.category) ?? { count: 0, units: 0 }
    byCategoryMap.set(r.category, { count: cur.count + 1, units: cur.units + parseFloat(r.currentQuantity) })
  }
  const byCategory = [...byCategoryMap.entries()].map(([category, v]) => ({ category, ...v }))

  const byHealthMap = new Map<string, number>()
  for (const r of stocks) {
    byHealthMap.set(r.healthStatus, (byHealthMap.get(r.healthStatus) ?? 0) + 1)
  }
  const byHealth = [...byHealthMap.entries()].map(([status, count]) => ({ status, count }))

  // last 30 days movements grouped by day
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentMovements = await db
    .select({
      day:          sql<string>`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`,
      movementType: nurseryStockMovements.movementType,
      count:        sql<number>`count(*)::int`,
    })
    .from(nurseryStockMovements)
    .where(sql`${nurseryStockMovements.movedAt} >= ${since}`)
    .groupBy(sql`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`, nurseryStockMovements.movementType)
    .orderBy(sql`to_char(${nurseryStockMovements.movedAt}, 'YYYY-MM-DD')`)

  const movementsMap = new Map<string, { receptions: number; uses: number }>()
  for (const m of recentMovements) {
    const cur = movementsMap.get(m.day) ?? { receptions: 0, uses: 0 }
    if (m.movementType === 'reception') cur.receptions += m.count
    if (m.movementType === 'internal_use') cur.uses += m.count
    movementsMap.set(m.day, cur)
  }
  const movementsLast30 = [...movementsMap.entries()].map(([date, v]) => ({ date, ...v }))

  return { totalSpecies, totalUnits, byCategory, byHealth, movementsLast30 }
}
