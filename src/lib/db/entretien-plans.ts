import { db } from '../../../db/index'
import {
  maintenanceMonthlyPlans,
  maintenanceAnnualPlans,
  maintenanceSchedules,
  users,
} from '../../../db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'

// ─── Standard maintenance tasks from PLA-RE-04 (exact order and tools from file) ──

export const STANDARD_MAINTENANCE_TASKS: { taskLabel: string; outil: string; nonApplicable?: boolean }[] = [
  { taskLabel: 'Taille des arbres',                              outil: 'Sécateur/Scie' },
  { taskLabel: 'Taille des arbustes : Taille de formation',      outil: 'Sécateur' },
  { taskLabel: 'Taille des arbustes : Taille de rajeunissement', outil: 'Sécateur' },
  { taskLabel: 'Plantation / Remplacement de plantes',           outil: 'Manuel' },
  { taskLabel: 'Nettoyage de la matière décorative',             outil: 'Manuel',                        nonApplicable: true },
  { taskLabel: 'Désherbage',                                     outil: 'Manuel' },
  { taskLabel: 'Ramassage & dégagement des déchets',             outil: 'Manuel/Sacs poubelles' },
  { taskLabel: 'Tonte du gazon',                                 outil: 'Tondeuse',                      nonApplicable: true },
  { taskLabel: 'Taille des bordures du gazon',                   outil: 'Sécateur',                      nonApplicable: true },
  { taskLabel: 'Sablage du gazon',                               outil: 'Pelle',                         nonApplicable: true },
  { taskLabel: 'Aération & compactage du gazon',                 outil: '',                              nonApplicable: true },
  { taskLabel: 'Ratissage dans les zones nécessaires',           outil: 'Râteau/Balai à gazon' },
  { taskLabel: 'Arrosage en cas de nécessité',                   outil: 'Arrosage automatique/Tuyau' },
  { taskLabel: 'Traitement phytosanitaire',                      outil: 'Delfos / Decis / Pompe' },
  { taskLabel: 'Fertilisation minérale',                         outil: 'NPK' },
  { taskLabel: 'Fertilisation organique',                        outil: 'Composte' },
  { taskLabel: "Vérification du système d'arrosage automatique", outil: 'Visuellement' },
  { taskLabel: 'Vérification du circuit phytosanitaire automatique', outil: 'Visuellement' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyTask = {
  taskLabel: string
  outil: string
  frequency: string
  prevu: boolean
  realise: boolean
  observation: string
  nonApplicable?: boolean
}

export type MonthlyPlanRow = {
  id: string
  projectId: string
  scheduleId: string | null
  moisAnnee: string
  nombreInterventions: number | null
  tasks: MonthlyTask[]
  fournitures: string | null
  intervenants: string | null
  clientIntervenants: string | null
  clientObservations: string | null
  clientBesoins: string | null
  clientName: string | null
  pmObservations: string | null
  pmName: string | null
  pmSignedDate: string | null
  clientSignedDate: string | null
  isFinalized: boolean
  createdAt: Date
}

export type MonthData = {
  month: number          // 1..12
  frequence: string
  jours: string
  nbrePrevu: number
  nbreRealise: number
}

export type AnnualPlanRow = {
  id: string
  projectId: string
  scheduleId: string | null
  annee: number
  updatedDate: string | null
  taciteReconduction: boolean
  majorationTaux: string | null
  monthlyData: MonthData[]
  totalInterventionsContractuelles: number | null
  totalInterventionsPrevues: number | null
  totalInterventionsRealisees: number | null
  montantContrat: string | null
  montantPrevu: string | null
  montantFacture: string | null
  createdAt: Date
}

// ─── Monthly Plans ────────────────────────────────────────────────────────────

export async function getMonthlyPlans(projectId: string): Promise<MonthlyPlanRow[]> {
  const rows = await db
    .select()
    .from(maintenanceMonthlyPlans)
    .where(eq(maintenanceMonthlyPlans.projectId, projectId))
    .orderBy(desc(maintenanceMonthlyPlans.moisAnnee))
  return rows.map((r) => ({ ...r, tasks: (r.tasks ?? []) as MonthlyTask[] })) as MonthlyPlanRow[]
}

export async function getMonthlyPlan(projectId: string, moisAnnee: string): Promise<MonthlyPlanRow | null> {
  const [row] = await db
    .select()
    .from(maintenanceMonthlyPlans)
    .where(and(eq(maintenanceMonthlyPlans.projectId, projectId), eq(maintenanceMonthlyPlans.moisAnnee, moisAnnee)))
    .limit(1)
  if (!row) return null
  return { ...row, tasks: (row.tasks ?? []) as MonthlyTask[] } as MonthlyPlanRow
}

export async function upsertMonthlyPlan(projectId: string, moisAnnee: string, data: {
  scheduleId?: string
  nombreInterventions?: number
  tasks?: MonthlyTask[]
  fournitures?: string
  intervenants?: string
  clientIntervenants?: string
  clientObservations?: string
  clientBesoins?: string
  clientName?: string
  pmObservations?: string
  pmName?: string
  pmSignedDate?: string
  clientSignedDate?: string
  isFinalized?: boolean
}, userId: string) {
  const existing = await getMonthlyPlan(projectId, moisAnnee)
  if (existing) {
    const [row] = await db.update(maintenanceMonthlyPlans)
      .set({ ...data, tasks: (data.tasks ?? existing.tasks) as never, updatedAt: new Date() })
      .where(eq(maintenanceMonthlyPlans.id, existing.id))
      .returning()
    return row
  }
  const [row] = await db.insert(maintenanceMonthlyPlans).values({
    projectId,
    moisAnnee,
    scheduleId: data.scheduleId ?? null,
    nombreInterventions: data.nombreInterventions ?? null,
    tasks: (data.tasks ?? STANDARD_MAINTENANCE_TASKS.map((t) => ({ ...t, frequency: '', prevu: false, realise: false, observation: '' }))) as never,
    fournitures: data.fournitures ?? null,
    intervenants: data.intervenants ?? null,
    clientIntervenants: data.clientIntervenants ?? null,
    clientObservations: data.clientObservations ?? null,
    clientBesoins: data.clientBesoins ?? null,
    clientName: data.clientName ?? null,
    pmObservations: data.pmObservations ?? null,
    pmName: data.pmName ?? null,
    pmSignedDate: data.pmSignedDate ?? null,
    clientSignedDate: data.clientSignedDate ?? null,
    isFinalized: data.isFinalized ?? false,
    createdBy: userId,
  }).returning()
  return row
}

// ─── Annual Plans ─────────────────────────────────────────────────────────────

export async function getAnnualPlans(projectId: string): Promise<AnnualPlanRow[]> {
  const rows = await db
    .select()
    .from(maintenanceAnnualPlans)
    .where(eq(maintenanceAnnualPlans.projectId, projectId))
    .orderBy(desc(maintenanceAnnualPlans.annee))
  return rows.map((r) => ({ ...r, monthlyData: (r.monthlyData ?? []) as MonthData[] })) as AnnualPlanRow[]
}

export async function upsertAnnualPlan(projectId: string, annee: number, data: {
  scheduleId?: string
  updatedDate?: string
  taciteReconduction?: boolean
  majorationTaux?: string
  monthlyData?: MonthData[]
  totalInterventionsContractuelles?: number
  totalInterventionsPrevues?: number
  totalInterventionsRealisees?: number
  montantContrat?: string
  montantPrevu?: string
  montantFacture?: string
}, userId: string) {
  const [existing] = await db
    .select({ id: maintenanceAnnualPlans.id })
    .from(maintenanceAnnualPlans)
    .where(and(eq(maintenanceAnnualPlans.projectId, projectId), eq(maintenanceAnnualPlans.annee, annee)))
    .limit(1)

  if (existing) {
    const [row] = await db.update(maintenanceAnnualPlans)
      .set({ ...data, monthlyData: data.monthlyData as never, updatedAt: new Date() })
      .where(eq(maintenanceAnnualPlans.id, existing.id))
      .returning()
    return row
  }
  const [row] = await db.insert(maintenanceAnnualPlans).values({
    projectId,
    annee,
    ...data,
    monthlyData: (data.monthlyData ?? Array.from({ length: 12 }, (_, i) => ({ month: i + 1, frequence: '', jours: '', nbrePrevu: 0, nbreRealise: 0 }))) as never,
    createdBy: userId,
  }).returning()
  return row
}
