/**
 * Écriture du journal de traçabilité ISO 9001.
 *
 * Volontairement SANS `import 'server-only'` : les registres serveur
 * (src/lib/db/*.ts) doivent rester importables par les scripts tsx de
 * migration et de vérification, qui tournent hors du bundler Next. La
 * protection contre un import client reste assurée par `audit.ts`, qui
 * ré-exporte ce module pour les composants et server actions.
 */
import { db, type DB } from '@/db'
import { recordAuditLog } from '@/db/schema'
import type { UserRole } from '@/lib/auth-utils'

/** Transaction Drizzle, ou l'instance db pour un appel hors transaction. */
type Executor = DB | Parameters<Parameters<DB['transaction']>[0]>[0]

export type AuditActor = {
  userId: string
  name: string | null
  email: string | null
  role: UserRole
}

export type AuditEntityType =
  | 'extra_expense'
  | 'purchase_order'
  | 'delivery_note'
  | 'non_conformance'
  | 'corrective_action'
  /** FOR-AC-10 : le registre entier, ses lignes étant éditées comme une grille. */
  | 'supply_register'
  /** FOR-MI-04 : PV de réunion, y compris ceux produits par l'assistant IA. */
  | 'meeting_minute'
  | 'meeting_action_item'
  /**
   * FOR-MI-04 : UN participant d'une réunion. Entité à part entière parce que
   * retirer quelqu'un de la liste de présence d'un PV validé change qui est
   * réputé avoir pris les décisions — cela doit se lire ligne par ligne.
   */
  | 'meeting_participant'
  /**
   * FOR-MI-04 : UNE ligne de l'ordre du jour, soit un point prévu et ce qui a
   * réellement été traité dessus.
   */
  | 'meeting_agenda_item'
  /** FOR-CO-02 : le bordereau des prix, édité comme un document entier. */
  | 'commercial_offer'
  /**
   * FOR-CO-02 : UNE ligne du bordereau. Entité distincte de l'offre parce que
   * l'édition ligne à ligne est désormais le mode de travail normal dans l'ERP :
   * « prix unitaire 450 → 480 » doit se lire sur la ligne concernée, avec sa
   * valeur d'avant et sa valeur d'après, et pas seulement comme un compteur de
   * lignes sur le document entier (ISO 9001:2015 §7.5.3.2 c).
   */
  | 'bordereau_line'
  /** Le catalogue FOR-CO-02 vierge, importé depuis le formulaire officiel. */
  | 'bordereau_template'
  /**
   * Le montant contractuel d'un projet. Entité à part entière : c'est une
   * décision commerciale distincte du budget approuvé, qui reste, lui, le
   * plafond de coût interne écrit par la validation budgétaire.
   */
  | 'project_contract_amount'
  /**
   * LIS-MI-05 : la qualification d'un auditeur interne. Décision qualité à part
   * entière — l'impartialité exigée par § 9.2.2 c) repose sur ce registre, et
   * savoir qui a qualifié qui, et quand, fait partie de la preuve.
   */
  | 'internal_auditor'
  /**
   * FOR-MI-01 : le rapport de revue documentaire. Modifier une revue deja
   * terminee est une decision qualite — §7.5.3.2 c) exige d'en garder le motif,
   * qui voyage ici dans `metadata.changeReason`.
   */
  | 'document_review'
  /** FOR-MI-01 : UNE ligne de la grille, soit un document revu et sa decision. */
  | 'document_review_line'
  /**
   * FOR-MI-02 : le rapport annuel de veille normative et reglementaire. Meme
   * regle que FOR-MI-01 — modifier un rapport clos exige un motif, conserve
   * ici dans `metadata.changeReason` (ISO 9001:2015 §7.5.3.2 c).
   */
  | 'regulatory_watch_report'
  /**
   * FOR-MI-02 : UNE ligne de la grille, soit un texte consulte, son degre
   * d'application et l'evaluation de conformite qui en decoule.
   */
  | 'regulatory_watch_line'

export type AuditAction =
  | 'created'
  | 'updated'
  | 'approved'
  | 'rejected'
  | 'deleted'
  /** Soumission pour revue : l'acte que §7.5.2 b) distingue de l'approbation. */
  | 'submitted'
  /** Déplacement d'une ligne dans l'arbre du document (changement de catégorie). */
  | 'moved'
  /** NC / CAPA lifecycle: status transitions are quality decisions in their own right. */
  | 'status_changed'
  | 'closed'
  | 'reopened'
  /** Modification d'un enregistrement deja clos : cree une nouvelle revision. */
  | 'revised'
  | 'verified'
  /** One-off provenance entry written when a record is migrated from a legacy system. */
  | 'imported'
  /** Data-quality backfill performed by a migration script rather than a user. */
  | 'reclassified'
  /** Assistant de réunion IA : analyse produite, notification envoyée, étape en échec. */
  | 'analyzed'
  | 'notified'
  | 'failed'

/**
 * Écrire la trace DANS la transaction qui modifie l'enregistrement : un
 * montant ne doit jamais pouvoir changer sans sa ligne de journal. C'est plus
 * strict que logActivity(), qui insère après coup et laisse donc une fenêtre
 * où la modification est enregistrée mais pas la trace.
 */
export async function recordAudit(
  tx: Executor,
  entry: {
    entityType: AuditEntityType
    entityId: string
    action: AuditAction
    actor: AuditActor
    previousState?: Record<string, unknown> | null
    newState?: Record<string, unknown> | null
    metadata?: Record<string, unknown> | null
  },
) {
  await tx.insert(recordAuditLog).values({
    entityType:        entry.entityType,
    entityId:          entry.entityId,
    action:            entry.action,
    actorId:           entry.actor.userId,
    actorName:         entry.actor.name ?? entry.actor.email ?? 'Inconnu',
    // Autorité au moment du fait : le rôle de l'acteur peut changer ensuite.
    actorRoleSnapshot: entry.actor.role,
    previousState:     entry.previousState ?? null,
    newState:          entry.newState ?? null,
    metadata:          entry.metadata ?? null,
  })
}

/** Historique d'un enregistrement, du plus récent au plus ancien. */
export async function getRecordAuditTrail(entityType: AuditEntityType, entityId: string) {
  return db.query.recordAuditLog.findMany({
    where: (log, { and, eq }) => and(eq(log.entityType, entityType), eq(log.entityId, entityId)),
    orderBy: (log, { desc }) => [desc(log.occurredAt)],
  })
}
