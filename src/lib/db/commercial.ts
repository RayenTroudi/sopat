import { db } from '@/db'
import { commercialOffers, offerLineItems, clients, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { recordAudit, type AuditActor } from '@/lib/audit-record'
import { assertEditable } from '@/lib/db/bordereau'

export type CommercialOffer = typeof commercialOffers.$inferSelect
export type OfferLineItem = typeof offerLineItems.$inferSelect

export type OfferStatus =
  | 'en_preparation'
  | 'envoyee'
  | 'en_negociation'
  | 'gagnee'
  | 'perdue'
  | 'annulee'

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  en_preparation: 'En préparation',
  envoyee: 'Envoyée',
  en_negociation: 'En négociation',
  gagnee: 'Gagnée',
  perdue: 'Perdue',
  annulee: 'Annulée',
}

export async function getOffers(filters?: { status?: OfferStatus }) {
  return db
    .select({
      offer: commercialOffers,
      clientCompany: clients.companyName,
      creatorName: users.name,
    })
    .from(commercialOffers)
    .leftJoin(clients, eq(commercialOffers.clientId, clients.id))
    .leftJoin(users, eq(commercialOffers.createdBy, users.id))
    .where(
      and(
        isNull(commercialOffers.deletedAt),
        filters?.status ? eq(commercialOffers.status, filters.status) : undefined,
      )
    )
    .orderBy(desc(commercialOffers.createdAt))
}

export async function getOfferById(id: string) {
  const [row] = await db
    .select({
      offer: commercialOffers,
      clientCompany: clients.companyName,
    })
    .from(commercialOffers)
    .leftJoin(clients, eq(commercialOffers.clientId, clients.id))
    .where(and(eq(commercialOffers.id, id), isNull(commercialOffers.deletedAt)))
  return row ?? null
}

export async function getOfferLineItems(offerId: string) {
  return db
    .select()
    .from(offerLineItems)
    .where(eq(offerLineItems.offerId, offerId))
    .orderBy(offerLineItems.position, offerLineItems.createdAt)
}

export async function getNextOfferReference() {
  const year = new Date().getFullYear()
  const [{ total }] = await db.select({ total: count() }).from(commercialOffers)
  const seq = String(Number(total) + 1).padStart(3, '0')
  return `OF-${year}-${seq}`
}

// ─── En-tête commercial ──────────────────────────────────────────────────────

/**
 * Champs qui portent L'ENGAGEMENT pris envers le client : à qui l'offre est
 * faite, pour quoi, à quel prix et jusqu'à quand.
 *
 * Ils suivent le verrou du bordereau. Le reste — statut, date de décision,
 * motif de perte, responsable interne, notes, rattachement projet — relève de
 * l'administration commerciale : marquer une offre « gagnée » APRÈS avoir
 * approuvé son bordereau est le déroulement normal, et l'interdire bloquerait
 * précisément le circuit qu'on cherche à protéger.
 */
export const OFFER_COMMITMENT_FIELDS = [
  'clientId', 'clientName', 'projectTitle', 'projectType',
  'description', 'amount', 'currency', 'sentDate', 'validityDate',
] as const

export type OfferHeaderPatch = Partial<{
  clientId: string | null
  clientName: string
  projectTitle: string
  projectType: string
  description: string
  amount: string
  currency: string
  sentDate: string
  validityDate: string
  status: OfferStatus
  decisionDate: string
  lostReason: string
  projectId: string
  responsible: string
  notes: string
}>

/**
 * Écrit l'en-tête d'une offre, sous verrou et avec sa trace.
 *
 * Séparé de la server action pour deux raisons : l'action fait l'authentification
 * et l'invalidation de cache, qui exigent un contexte de requête, alors que la
 * règle métier doit rester appelable — et donc vérifiable — sans serveur. C'est
 * la même séparation que pour `updateBordereauLine`.
 *
 * Le montant n'est PAS protégé ici contre la dérive : dès qu'un bordereau porte
 * des lignes, `syncOfferTotals` réécrit `amount` à chaque modification. C'est
 * l'interface qui refuse la saisie dans ce cas ; l'écrire malgré tout ne
 * corrompt rien, la prochaine synchronisation le corrige.
 */
export async function updateOfferRecord(
  id: string,
  data: OfferHeaderPatch,
  actor: AuditActor,
): Promise<{ success: true; changed: string[] } | { success: false; error: string }> {
  const [before] = await db
    .select().from(commercialOffers).where(eq(commercialOffers.id, id)).limit(1)
  if (!before) return { success: false, error: 'Offre introuvable' }

  const touchesCommitment = OFFER_COMMITMENT_FIELDS.some((f) => data[f] !== undefined)
  if (touchesCommitment) {
    const locked = await assertEditable(id)
    if (locked) return { success: false, error: locked }
  }

  // Champs listés explicitement : `...data` écrirait toute colonne présente dans
  // la charge utile. `reference`, `createdBy`, `createdAt` et `deletedAt`
  // restent hors d'atteinte.
  await db
    .update(commercialOffers)
    .set({
      ...(data.clientId !== undefined && { clientId: data.clientId }),
      ...(data.clientName !== undefined && { clientName: data.clientName }),
      ...(data.projectTitle !== undefined && { projectTitle: data.projectTitle }),
      ...(data.projectType !== undefined && { projectType: data.projectType }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.sentDate !== undefined && { sentDate: data.sentDate }),
      ...(data.validityDate !== undefined && { validityDate: data.validityDate }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.decisionDate !== undefined && { decisionDate: data.decisionDate }),
      ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
      ...(data.responsible !== undefined && { responsible: data.responsible }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(eq(commercialOffers.id, id))

  /*
   * Trace du changement, champ par champ.
   *
   * L'en-tête porte le client, le montant et la validité : des données
   * d'engagement au même titre qu'une ligne de prix, et qui n'avaient jusqu'ici
   * AUCUNE trace. Seuls les champs réellement modifiés sont journalisés — une
   * entrée « responsable : X → X » noierait celles qui disent quelque chose.
   */
  const normalise = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v === '' ? null : v ?? null

  const changed: Record<string, { from: unknown; to: unknown }> = {}
  for (const [key, next] of Object.entries(data) as [string, unknown][]) {
    if (next === undefined) continue
    const previous = (before as unknown as Record<string, unknown>)[key] ?? null
    if (normalise(previous) !== normalise(next)) {
      changed[key] = { from: normalise(previous), to: normalise(next) }
    }
  }

  if (Object.keys(changed).length > 0) {
    await recordAudit(db, {
      entityType: 'commercial_offer',
      entityId: id,
      action: 'updated',
      actor,
      previousState: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.from])),
      newState: Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.to])),
      metadata: { form: 'FOR-CO-02', scope: 'entete', reference: before.reference },
    })
  }

  return { success: true, changed: Object.keys(changed) }
}
