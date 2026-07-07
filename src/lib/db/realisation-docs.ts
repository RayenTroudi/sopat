import { db } from '../../../db/index'
import {
  pvReceptionProvisoire,
  pvReceptionDefinitive,
  realisationLineItems,
  weeklyProjectPlans,
  realisationGantt,
  realisationChecklists,
  users,
} from '../../../db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistItem = {
  designation: string
  observation: string
  decision: string
  action: string
  responsable: string
  delai: string
  reserve: boolean
}

export type Signatory = {
  name: string
  role: string
  organisation: string
  signed: boolean
  signedDate?: string
}

export type PvProvisioreRow = {
  id: string
  projectId: string
  date: string | null
  maitreOuvrage: string | null
  startDate: string | null
  endDate: string | null
  checklistItems: ChecklistItem[]
  signatories: Signatory[]
  reserves: string | null
  hasReserves: boolean
  isFinalized: boolean
  createdAt: Date
}

export type PvDefinitiveRow = {
  id: string
  projectId: string
  date: string | null
  titulaireDuMarche: string | null
  dateApprobationMarche: string | null
  delaiExecution: string | null
  dateDebutTravaux: string | null
  dateFinTravaux: string | null
  signatories: Signatory[]
  attestationText: string | null
  isFinalized: boolean
  createdAt: Date
}

export type LineItem = {
  id?: string
  phaseCode: string
  phaseLabel: string
  designation?: string | null
  quantity?: string | null
  unit?: string | null
  norme?: string | null
  unitPriceHtva?: string | null
  totalHtva?: string | null
  observation?: string | null
  sortOrder?: number
  isPhaseHeader?: boolean
}

export type WeeklyPlanRow = {
  id: string
  region: string | null
  chefEquipe: string | null
  weekStartDate: string
  weekEndDate: string
  rows: WeeklyRow[]
  nombreActionsPrevues: number | null
  pourcentageRealisation: string | null
  createdByName: string | null
  createdAt: Date
}

export type WeeklyRow = {
  equipe: string
  lundi: string
  mardi: string
  mercredi: string
  jeudi: string
  vendredi: string
  samedi: string
  realise: boolean
  causeNon: string
  suivi: string
}

// ─── PV Réception Provisoire ──────────────────────────────────────────────────

export async function getPvProvisoire(projectId: string): Promise<PvProvisioreRow | null> {
  const [row] = await db
    .select()
    .from(pvReceptionProvisoire)
    .where(eq(pvReceptionProvisoire.projectId, projectId))
    .limit(1)
  if (!row) return null
  return {
    ...row,
    checklistItems: (row.checklistItems ?? []) as ChecklistItem[],
    signatories: (row.signatories ?? []) as Signatory[],
  } as PvProvisioreRow
}

export async function upsertPvProvisoire(projectId: string, data: {
  date?: string
  maitreOuvrage?: string
  startDate?: string
  endDate?: string
  checklistItems?: ChecklistItem[]
  signatories?: Signatory[]
  reserves?: string
  hasReserves?: boolean
  isFinalized?: boolean
}, userId: string) {
  const existing = await getPvProvisoire(projectId)
  if (existing) {
    const [row] = await db.update(pvReceptionProvisoire)
      .set({ ...data, checklistItems: (data.checklistItems ?? existing.checklistItems) as never, signatories: (data.signatories ?? existing.signatories) as never, updatedAt: new Date() })
      .where(eq(pvReceptionProvisoire.projectId, projectId))
      .returning()
    return row
  }
  const [row] = await db.insert(pvReceptionProvisoire).values({
    projectId,
    ...data,
    checklistItems: (data.checklistItems ?? []) as never,
    signatories: (data.signatories ?? []) as never,
    createdBy: userId,
  }).returning()
  return row
}

// ─── PV Réception Définitive ──────────────────────────────────────────────────

export async function getPvDefinitive(projectId: string): Promise<PvDefinitiveRow | null> {
  const [row] = await db
    .select()
    .from(pvReceptionDefinitive)
    .where(eq(pvReceptionDefinitive.projectId, projectId))
    .limit(1)
  if (!row) return null
  return {
    ...row,
    signatories: (row.signatories ?? []) as Signatory[],
  } as PvDefinitiveRow
}

export async function upsertPvDefinitive(projectId: string, data: {
  date?: string
  titulaireDuMarche?: string
  dateApprobationMarche?: string
  delaiExecution?: string
  dateDebutTravaux?: string
  dateFinTravaux?: string
  signatories?: Signatory[]
  attestationText?: string
  isFinalized?: boolean
}, userId: string) {
  const existing = await getPvDefinitive(projectId)
  if (existing) {
    const [row] = await db.update(pvReceptionDefinitive)
      .set({ ...data, signatories: (data.signatories ?? existing.signatories) as never, updatedAt: new Date() })
      .where(eq(pvReceptionDefinitive.projectId, projectId))
      .returning()
    return row
  }
  const [row] = await db.insert(pvReceptionDefinitive).values({
    projectId,
    ...data,
    signatories: (data.signatories ?? []) as never,
    createdBy: userId,
  }).returning()
  return row
}

// ─── Line Items (Attachement + Décompte) ──────────────────────────────────────

export async function getLineItems(projectId: string, documentType: 'attachement' | 'decompte'): Promise<LineItem[]> {
  return db
    .select({
      id: realisationLineItems.id,
      phaseCode: realisationLineItems.phaseCode,
      phaseLabel: realisationLineItems.phaseLabel,
      designation: realisationLineItems.designation,
      quantity: realisationLineItems.quantity,
      unit: realisationLineItems.unit,
      norme: realisationLineItems.norme,
      unitPriceHtva: realisationLineItems.unitPriceHtva,
      totalHtva: realisationLineItems.totalHtva,
      observation: realisationLineItems.observation,
      sortOrder: realisationLineItems.sortOrder,
      isPhaseHeader: realisationLineItems.isPhaseHeader,
    })
    .from(realisationLineItems)
    .where(and(
      eq(realisationLineItems.projectId, projectId),
      eq(realisationLineItems.documentType, documentType)
    ))
    .orderBy(asc(realisationLineItems.sortOrder))
}

export async function upsertLineItems(projectId: string, documentType: 'attachement' | 'decompte', items: LineItem[], userId: string) {
  await db.delete(realisationLineItems).where(and(
    eq(realisationLineItems.projectId, projectId),
    eq(realisationLineItems.documentType, documentType)
  ))
  if (items.length === 0) return []
  return db.insert(realisationLineItems).values(
    items.map((item, i) => ({
      projectId,
      documentType,
      phaseCode: item.phaseCode,
      phaseLabel: item.phaseLabel,
      designation: item.designation ?? null,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      norme: item.norme ?? null,
      unitPriceHtva: item.unitPriceHtva ?? null,
      totalHtva: item.totalHtva ?? null,
      observation: item.observation ?? null,
      sortOrder: item.sortOrder ?? i,
      isPhaseHeader: item.isPhaseHeader ?? false,
      createdBy: userId,
    }))
  ).returning()
}

// ─── Weekly Plans ─────────────────────────────────────────────────────────────

export async function getWeeklyPlans(limit = 20): Promise<WeeklyPlanRow[]> {
  const rows = await db
    .select({
      id: weeklyProjectPlans.id,
      region: weeklyProjectPlans.region,
      chefEquipe: weeklyProjectPlans.chefEquipe,
      weekStartDate: weeklyProjectPlans.weekStartDate,
      weekEndDate: weeklyProjectPlans.weekEndDate,
      rows: weeklyProjectPlans.rows,
      nombreActionsPrevues: weeklyProjectPlans.nombreActionsPrevues,
      pourcentageRealisation: weeklyProjectPlans.pourcentageRealisation,
      createdByName: users.name,
      createdAt: weeklyProjectPlans.createdAt,
    })
    .from(weeklyProjectPlans)
    .leftJoin(users, eq(weeklyProjectPlans.createdBy, users.id))
    .orderBy(desc(weeklyProjectPlans.weekStartDate))
    .limit(limit)
  return rows.map((r) => ({ ...r, rows: (r.rows ?? []) as WeeklyRow[] })) as WeeklyPlanRow[]
}

export async function createWeeklyPlan(data: {
  region?: string
  chefEquipe?: string
  weekStartDate: string
  weekEndDate: string
  rows?: WeeklyRow[]
  nombreActionsPrevues?: number
  pourcentageRealisation?: string
}, userId: string) {
  const [row] = await db.insert(weeklyProjectPlans).values({
    ...data,
    rows: (data.rows ?? []) as never,
    createdBy: userId,
  }).returning()
  return row
}

export async function updateWeeklyPlan(planId: string, data: Partial<{
  region: string
  chefEquipe: string
  weekStartDate: string
  weekEndDate: string
  rows: WeeklyRow[]
  nombreActionsPrevues: number
  pourcentageRealisation: string
}>) {
  const [row] = await db.update(weeklyProjectPlans)
    .set({ ...data, rows: data.rows as never, updatedAt: new Date() })
    .where(eq(weeklyProjectPlans.id, planId))
    .returning()
  return row ?? null
}

export async function deleteWeeklyPlan(planId: string) {
  await db.delete(weeklyProjectPlans).where(eq(weeklyProjectPlans.id, planId))
}

// ─── Gantt (PLA-RE-05) ────────────────────────────────────────────────────────

export type GanttRow = {
  rowId: string
  label: string
  type: 'phase' | 'activity' | 'subactivity'
  prWeeks: number[]
  reWeeks: number[]
}

export type GanttRecord = {
  id: string
  projectId: string
  localisation: string | null
  projectManager: string | null
  dateDemarragePrevu: string | null
  dateDemarrageReel: string | null
  dateFinPrevue: string | null
  dateFinReelle: string | null
  dateMaj: string | null
  ganttRows: GanttRow[]
  createdAt: Date
}

export async function getGantt(projectId: string): Promise<GanttRecord | null> {
  const [row] = await db.select().from(realisationGantt).where(eq(realisationGantt.projectId, projectId)).limit(1)
  if (!row) return null
  return { ...row, ganttRows: (row.ganttRows ?? []) as GanttRow[] } as GanttRecord
}

export async function upsertGantt(projectId: string, data: {
  localisation?: string
  projectManager?: string
  dateDemarragePrevu?: string
  dateDemarrageReel?: string
  dateFinPrevue?: string
  dateFinReelle?: string
  dateMaj?: string
  ganttRows?: GanttRow[]
}, userId: string) {
  const existing = await getGantt(projectId)
  if (existing) {
    const [row] = await db.update(realisationGantt)
      .set({ ...data, ganttRows: (data.ganttRows ?? existing.ganttRows) as never, updatedAt: new Date() })
      .where(eq(realisationGantt.projectId, projectId))
      .returning()
    return row
  }
  const [row] = await db.insert(realisationGantt).values({
    projectId,
    ...data,
    ganttRows: (data.ganttRows ?? []) as never,
    createdBy: userId,
  }).returning()
  return row
}

// ─── Quality Checklists (FOR-RE-07 to -12) ────────────────────────────────────

export type ChecklistItemQuality = {
  itemId: string
  label: string
  phase?: string
  checked: boolean
  observation: string
}

export type ChecklistRecord = {
  id: string
  projectId: string
  checklistType: string
  items: ChecklistItemQuality[]
  signedByName: string | null
  signedDate: string | null
  isFinalized: boolean
  createdAt: Date
}

export async function getChecklist(projectId: string, checklistType: string): Promise<ChecklistRecord | null> {
  const [row] = await db.select().from(realisationChecklists)
    .where(and(eq(realisationChecklists.projectId, projectId), eq(realisationChecklists.checklistType, checklistType)))
    .limit(1)
  if (!row) return null
  return { ...row, items: (row.items ?? []) as ChecklistItemQuality[] } as ChecklistRecord
}

export async function upsertChecklist(projectId: string, checklistType: string, data: {
  items?: ChecklistItemQuality[]
  signedByName?: string
  signedDate?: string
  isFinalized?: boolean
}, userId: string) {
  const existing = await getChecklist(projectId, checklistType)
  if (existing) {
    const [row] = await db.update(realisationChecklists)
      .set({ ...data, items: (data.items ?? existing.items) as never, updatedAt: new Date() })
      .where(and(eq(realisationChecklists.projectId, projectId), eq(realisationChecklists.checklistType, checklistType)))
      .returning()
    return row
  }
  const [row] = await db.insert(realisationChecklists).values({
    projectId,
    checklistType,
    ...data,
    items: (data.items ?? []) as never,
    createdBy: userId,
  }).returning()
  return row
}
