/**
 * Runtime schemas for the project-document API routes.
 *
 * These routes previously did `await req.json() as SomeType` — a compile-time
 * cast that validates nothing — so any JSON body reached the data layer intact.
 * Each schema below mirrors the shape the corresponding data-layer function
 * already declares; unknown keys are stripped (zod's default for z.object), so
 * a payload cannot reach a column the function never intended to expose.
 *
 * Shared here rather than inlined per route because several routes feed the same
 * upsert and must stay in step with it.
 */
import { z } from 'zod'

// ─── JSONB element shapes ────────────────────────────────────────────────────

export const monthlyTaskSchema = z.object({
  taskLabel:      z.string(),
  outil:          z.string(),
  frequency:      z.string(),
  prevu:          z.boolean(),
  realise:        z.boolean(),
  observation:    z.string(),
  nonApplicable:  z.boolean().optional(),
})

export const monthDataSchema = z.object({
  month:        z.number().int().min(1).max(12),
  frequence:    z.string(),
  jours:        z.string(),
  nbrePrevu:    z.number(),
  nbreRealise:  z.number(),
})

export const checklistItemSchema = z.object({
  designation: z.string(),
  observation: z.string(),
  decision:    z.string(),
  action:      z.string(),
  responsable: z.string(),
  delai:       z.string(),
  reserve:     z.boolean(),
})

export const signatorySchema = z.object({
  name:         z.string(),
  role:         z.string(),
  organisation: z.string(),
  signed:       z.boolean(),
  signedDate:   z.string().optional(),
})

export const ganttRowSchema = z.object({
  rowId:    z.string(),
  label:    z.string(),
  type:     z.enum(['phase', 'activity', 'subactivity'] as const),
  prWeeks:  z.array(z.number()),
  reWeeks:  z.array(z.number()),
})

export const weeklyRowSchema = z.object({
  equipe:   z.string(),
  lundi:    z.string(),
  mardi:    z.string(),
  mercredi: z.string(),
  jeudi:    z.string(),
  vendredi: z.string(),
  samedi:   z.string(),
  realise:  z.boolean(),
  causeNon: z.string(),
  suivi:    z.string(),
})

export const lineItemSchema = z.object({
  id:            z.string().optional(),
  phaseCode:     z.string(),
  phaseLabel:    z.string(),
  designation:   z.string().nullable().optional(),
  quantity:      z.string().nullable().optional(),
  unit:          z.string().nullable().optional(),
  norme:         z.string().nullable().optional(),
  unitPriceHtva: z.string().nullable().optional(),
  totalHtva:     z.string().nullable().optional(),
  observation:   z.string().nullable().optional(),
  sortOrder:     z.number().optional(),
  isPhaseHeader: z.boolean().optional(),
})

export const checklistItemQualitySchema = z.object({
  itemId:      z.string(),
  label:       z.string(),
  phase:       z.string().optional(),
  checked:     z.boolean(),
  observation: z.string(),
})

// ─── Route bodies ────────────────────────────────────────────────────────────

export const monthlyPlanSchema = z.object({
  moisAnnee:            z.string().min(1),
  scheduleId:           z.string().uuid().optional(),
  nombreInterventions:  z.number().int().optional(),
  tasks:                z.array(monthlyTaskSchema).optional(),
  fournitures:          z.string().optional(),
  intervenants:         z.string().optional(),
  clientIntervenants:   z.string().optional(),
  clientObservations:   z.string().optional(),
  clientBesoins:        z.string().optional(),
  clientName:           z.string().optional(),
  pmObservations:       z.string().optional(),
  pmName:               z.string().optional(),
  pmSignedDate:         z.string().optional(),
  clientSignedDate:     z.string().optional(),
  isFinalized:          z.boolean().optional(),
})

export const annualPlanSchema = z.object({
  annee:                            z.number().int().min(2000).max(2100),
  scheduleId:                       z.string().uuid().optional(),
  updatedDate:                      z.string().optional(),
  taciteReconduction:               z.boolean().optional(),
  majorationTaux:                   z.string().optional(),
  monthlyData:                      z.array(monthDataSchema).optional(),
  totalInterventionsContractuelles: z.number().int().optional(),
  totalInterventionsPrevues:        z.number().int().optional(),
  totalInterventionsRealisees:      z.number().int().optional(),
  montantContrat:                   z.string().optional(),
  montantPrevu:                     z.string().optional(),
  montantFacture:                   z.string().optional(),
})

export const pvProvisoireSchema = z.object({
  date:           z.string().optional(),
  maitreOuvrage:  z.string().optional(),
  startDate:      z.string().optional(),
  endDate:        z.string().optional(),
  checklistItems: z.array(checklistItemSchema).optional(),
  signatories:    z.array(signatorySchema).optional(),
  reserves:       z.string().optional(),
  hasReserves:    z.boolean().optional(),
  isFinalized:    z.boolean().optional(),
})

export const pvDefinitiveSchema = z.object({
  date:                  z.string().optional(),
  titulaireDuMarche:     z.string().optional(),
  dateApprobationMarche: z.string().optional(),
  delaiExecution:        z.string().optional(),
  dateDebutTravaux:      z.string().optional(),
  dateFinTravaux:        z.string().optional(),
  signatories:           z.array(signatorySchema).optional(),
  attestationText:       z.string().optional(),
  isFinalized:           z.boolean().optional(),
})

export const ganttSchema = z.object({
  localisation:       z.string().optional(),
  projectManager:     z.string().optional(),
  dateDemarragePrevu: z.string().optional(),
  dateDemarrageReel:  z.string().optional(),
  dateFinPrevue:      z.string().optional(),
  dateFinReelle:      z.string().optional(),
  dateMaj:            z.string().optional(),
  ganttRows:          z.array(ganttRowSchema).optional(),
})

export const lineItemsSchema = z.object({
  items: z.array(lineItemSchema),
})

export const qualityChecklistSchema = z.object({
  items:        z.array(checklistItemQualitySchema).optional(),
  signedByName: z.string().optional(),
  signedDate:   z.string().optional(),
  isFinalized:  z.boolean().optional(),
})

/** Creation requires the week bounds; createWeeklyPlan declares them non-optional. */
export const weeklyPlanCreateSchema = z.object({
  region:                 z.string().optional(),
  chefEquipe:             z.string().optional(),
  weekStartDate:          z.string().min(1),
  weekEndDate:            z.string().min(1),
  rows:                   z.array(weeklyRowSchema).optional(),
  nombreActionsPrevues:   z.number().int().optional(),
  pourcentageRealisation: z.string().optional(),
})

/** Updates are partial — the week bounds may be left untouched. */
export const weeklyPlanUpdateSchema = weeklyPlanCreateSchema.partial()

export const portfolioSettingsSchema = z.object({
  companyTagline:       z.string().optional(),
  ceoName:              z.string().optional(),
  ceoTitle:             z.string().optional(),
  ceoPhotoCloudinaryId: z.string().optional(),
  companyAddress:       z.string().optional(),
  email:                z.string().optional(),
  website:              z.string().optional(),
  facebookUrl:          z.string().optional(),
  instagramHandle:      z.string().optional(),
  isoCertNumber:        z.string().optional(),
  isoCertExpiry:        z.string().optional(),
  rseLabelLevel:        z.string().optional(),
  rseLabelExpiry:       z.string().optional(),
  coverBackgroundColor: z.string().optional(),
  accentColor:          z.string().optional(),
})

/**
 * Raising an NC from an audit finding.
 *
 * Deliberately narrow: everything that ties the NC to its audit — the clause
 * reference, the department, the auditor, the source — is read from the finding
 * itself, so a client cannot detach the NC from its origin, attach an existing
 * NC, or set a protected field such as reference, status or recordOrigin.
 */
export const ncFromFindingSchema = z.object({
  description: z.string().min(10, 'Description trop courte').optional(),
  ncType:      z.enum(['technique', 'documentaire', 'reclamation_client', 'audit', 'systeme'] as const).optional(),
  assignedTo:  z.string().uuid().optional(),
})
