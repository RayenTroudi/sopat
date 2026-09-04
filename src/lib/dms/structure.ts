// src/lib/dms/structure.ts
//
// Fiche d'une information documentée de LIS-MI-01, telle qu'un responsable
// qualité doit la lire : identification, maquette, contrôle, historique.
//
// ── Ce que ce module ne renvoie pas ──────────────────────────────────────────
// Aucun nom de table, aucun nom de colonne, aucun type SQL, aucun identifiant
// technique. La base reste la source de vérité ; elle n'est pas le langage de
// l'écran. Un responsable qualité lit « Version 5 — En vigueur depuis le
// 27/08/2019 », pas « version_label varchar(20) NULL ».
//
// La seule exception est l'identifiant de route, qui sert à construire les
// liens et n'est jamais affiché.
//
// ── Trois choses distinctes ──────────────────────────────────────────────────
//   IDENTIFICATION & CONTRÔLE  ← dms_documents (la fiche du registre)
//   MAQUETTE                   ← document-structures.ts (ce que contient le doc)
//   ENREGISTREMENTS RÉELS      ← le module opérationnel, atteint par un bouton
//
// La page montre les deux premiers et compte les troisièmes, sans les déverser.

import { desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import {
  dmsAuditLog,
  dmsDocumentLinks,
  dmsDocuments,
  dmsDocumentVersions,
  users,
} from '../../../db/schema'
import { INTENTIONALLY_UNMAPPED, resolveIsoDocumentRoute } from './iso-routes'
import { parseCode, PROCESS_LABELS, TYPE_LABELS, type ProcessCode, type TypeCode } from './codes'
import { resolveDocumentStructure, type DocumentStructure } from './document-structures'
import { allowedActions, type WorkflowAction } from './lifecycle-ui'

export type DmsPerson = { name: string; email: string | null; role: string | null }

/** En-tête d'identification du document. */
export type DmsIdentification = {
  reference: string
  designation: string
  /** « Formulaire / Fiche », « Procédure »… d'après le type du code. */
  type: string
  /** « Achat », « Management Intégré »… d'après le processus du code. */
  process: string
  department: string
  category: string
  version: string | null
  status: string
  effectiveDate: Date | null
  confidentiality: string
  isoClauses: string[]
  storageType: string | null
  managedByPassword: boolean
  observations: string | null
}

/** Éléments de maîtrise documentaire (ISO 9001 §7.5.3). */
export type DmsControl = {
  version: string | null
  effectiveDate: Date | null
  nextReviewDate: Date | null
  retentionYears: number
  owner: DmsPerson | null
  author: DmsPerson | null
  departmentManager: DmsPerson | null
  /** Approbation de la version en vigueur, si une version est enregistrée. */
  approval: { by: string | null; at: Date | null } | null
  /** Règle d'accès réellement appliquée par l'ERP — pas une intention. */
  access: { read: string; write: string }
  lastUpdatedAt: Date
  /**
   * Quels éléments de maîtrise l'ERP APPLIQUE, par opposition à ceux qu'il se
   * contente d'enregistrer.
   *
   * La distinction n'est pas cosmétique. Afficher « Confidentialité :
   * Confidentiel » à côté de « Consultation : tout utilisateur authentifié »
   * laisserait croire à un cloisonnement qui n'existe pas — la confidentialité
   * est saisie et conservée, jamais opposée à un lecteur. De même, la durée de
   * conservation sert à calculer une échéance à la mise en obsolescence, mais
   * aucune purge ne s'y déclenche.
   *
   * La date de revue, elle, est bien appliquée : alerts.ts la relève à trente
   * jours et signale les retards.
   */
  enforcement: {
    /** Consultation : toute page du registre exige une session. */
    access: boolean
    /** Modification : PATCH/POST/DELETE passent par requireApiRole. */
    modification: boolean
    /** Approbation : `publish` n'est ouvert que depuis l'état `approved`. */
    approval: boolean
    /** Version : horodatée par le cycle de vie dès qu'une version existe. */
    version: boolean
    /** Date d'effet : posée à la publication, si une version a été publiée. */
    effectiveDate: boolean
    /** Revue : alerts.ts relève les échéances à 30 jours et les retards. */
    review: boolean
    confidentiality: boolean
    retention: boolean
    passwordManaged: boolean
  }
}

export type DmsRevision = {
  version: string
  revision: number
  status: string
  summary: string
  reason: string | null
  author: string | null
  approvedBy: string | null
  approvedAt: Date | null
  effectiveDate: Date | null
  isCurrent: boolean
}

export type DmsHistoryEntry = { event: string; at: Date; actor: string | null }

export type DmsImplementation = {
  /**
   * `kind` de la table de routage n'est volontairement PAS exposé : c'est un
   * terme interne ('operational', 'document_index'). L'écran n'a besoin que de
   * savoir si le document est mis en œuvre, et où.
   */
  implemented: boolean
  href: string | null
  destination: string
  within: string | null
  reason: string | null
}

export type DmsDocumentSheet = {
  /** Identifiant de route uniquement — jamais affiché. */
  id: string
  documentNumber: string
  title: string
  retiredAt: Date | null
  identification: DmsIdentification
  control: DmsControl
  implementation: DmsImplementation
  /** Maquette du document, ou `null` si elle n'a pas été relevée. */
  structure: DocumentStructure | null
  /** `true` quand la maquette est le plan type de la famille, pas ce document. */
  structureIsTypicalPlan: boolean
  revisions: DmsRevision[]
  history: DmsHistoryEntry[]
  /** Nombre d'enregistrements opérationnels établis sur ce document. */
  recordCount: number
  relatedDocuments: { relation: string; reference: string; title: string; id: string }[]
  /**
   * Transitions de cycle de vie ouvertes à l'acteur, calculées par le module
   * partagé avec le registre. Les recalculer dans l'écran aurait créé une
   * seconde table de règles, vouée à diverger de celle du registre.
   */
  availableActions: WorkflowAction[]
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', in_review: 'En révision', pending_approval: 'En attente approbation',
  approved: 'Approuvé', effective: 'En vigueur', under_revision: 'En cours de révision',
  obsolete: 'Obsolète', archived: 'Archivé',
}

const CATEGORY_LABELS: Record<string, string> = {
  manuel_qualite: 'Manuel qualité', politique: 'Politique', procedure: 'Procédure',
  instruction: 'Instruction', formulaire: 'Formulaire / Fiche', enregistrement: 'Enregistrement',
  plan_qualite: 'Plan', cartographie_processus: 'Cartographie / Processus',
  etude_technique: 'Étude technique', devis: 'Devis', contrat: 'Contrat',
  bon_commande: 'Bon de commande', facture: 'Facture', rapport_inspection: "Rapport d'inspection",
  rapport_audit: "Rapport d'audit", ncr: 'NCR', capa: 'CAPA',
  document_fournisseur: 'Document fournisseur', document_client: 'Document client',
  externe: 'Document externe',
}

const DEPARTMENT_LABELS: Record<string, string> = {
  direction: 'Direction', etudes: 'Études', realisation: 'Réalisation', entretien: 'Entretien',
  qualite: 'Qualité', finance: 'Finance / Achat', rh: 'Ressources Humaines', rse: 'RSE',
  transverse: 'Transverse',
}

const CONFIDENTIALITY_LABELS: Record<string, string> = {
  public: 'Public', internal: 'Interne', confidential: 'Confidentiel', restricted: 'Restreint',
}

/** Évènements de traçabilité, en langage documentaire. */
const EVENT_LABELS: Record<string, string> = {
  created: 'Création', updated: 'Modification', version_created: 'Nouvelle version',
  status_changed: 'Changement de statut', reviewed: 'Revue effectuée', approved: 'Approbation',
  rejected: 'Rejet', published: 'Mise en vigueur', obsoleted: 'Mise en obsolescence',
  archived: 'Archivage', viewed: 'Consultation', downloaded: 'Téléchargement',
  signed: 'Signature', linked: 'Rattachement d’un enregistrement', unlinked: 'Détachement',
  permission_changed: 'Modification des accès', soft_deleted: 'Retrait du registre',
  restored: 'Restauration',
}

function person(u: { name: string | null; email: string | null; role: string | null } | undefined): DmsPerson | null {
  if (!u) return null
  return { name: u.name ?? 'Inconnu', email: u.email, role: u.role }
}

/**
 * Fiche complète d'un document du registre, ou `null` s'il n'existe pas.
 *
 * Les documents retirés sont renvoyés, pas masqués : un retrait est un état
 * documentaire et la fiche reste consultable (ISO 9001 §7.5.3).
 */
export async function getDmsDocumentSheet(
  id: string,
  actor?: { userId: string; role: string },
): Promise<DmsDocumentSheet | null> {
  const [doc] = await db.select().from(dmsDocuments).where(eq(dmsDocuments.id, id)).limit(1)
  if (!doc) return null

  const parsed = parseCode(doc.documentNumber)

  const [versions, links, audit] = await Promise.all([
    db.select().from(dmsDocumentVersions)
      .where(eq(dmsDocumentVersions.documentId, id))
      .orderBy(desc(dmsDocumentVersions.revisionNumber)),
    db.select({ n: sql<number>`count(*)` }).from(dmsDocumentLinks)
      .where(eq(dmsDocumentLinks.documentId, id)),
    db.select({ event: dmsAuditLog.event, at: dmsAuditLog.occurredAt, actorId: dmsAuditLog.actorId })
      .from(dmsAuditLog)
      .where(eq(dmsAuditLog.documentId, id))
      .orderBy(desc(dmsAuditLog.occurredAt))
      .limit(25),
  ])

  // ── Personnes ──────────────────────────────────────────────────────────────
  const peopleIds = [
    doc.ownerId, doc.authorId, doc.departmentManagerId,
    ...versions.map((v) => v.authorId), ...versions.map((v) => v.approvedById),
    ...audit.map((a) => a.actorId),
  ].filter((v): v is string => !!v)

  const people = peopleIds.length
    ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users).where(inArray(users.id, [...new Set(peopleIds)]))
    : []
  const byId = new Map(people.map((p) => [p.id, p]))
  const nameOf = (uid: string | null) => (uid ? byId.get(uid)?.name ?? null : null)

  // ── Documents liés ─────────────────────────────────────────────────────────
  const chainIds = [doc.supersedesId, doc.supersededById].filter((v): v is string => !!v)
  const chain = chainIds.length
    ? await db.select({ id: dmsDocuments.id, documentNumber: dmsDocuments.documentNumber, title: dmsDocuments.title })
        .from(dmsDocuments).where(inArray(dmsDocuments.id, chainIds))
    : []
  const chainById = new Map(chain.map((c) => [c.id, c]))
  const relatedDocuments: DmsDocumentSheet['relatedDocuments'] = []
  if (doc.supersedesId && chainById.has(doc.supersedesId)) {
    const c = chainById.get(doc.supersedesId)!
    relatedDocuments.push({ relation: 'Remplace', reference: c.documentNumber, title: c.title, id: c.id })
  }
  if (doc.supersededById && chainById.has(doc.supersededById)) {
    const c = chainById.get(doc.supersededById)!
    relatedDocuments.push({ relation: 'Remplacé par', reference: c.documentNumber, title: c.title, id: c.id })
  }

  // ── Mise en œuvre et maquette ──────────────────────────────────────────────
  const route = resolveIsoDocumentRoute(doc.documentNumber)
  const implemented = (route?.kind ?? 'reference') !== 'reference'
  const implementation: DmsImplementation = {
    implemented,
    href: route?.href ?? null,
    destination: route?.destination ?? 'Page opérationnelle non configurée',
    within: route?.within ?? null,
    reason: INTENTIONALLY_UNMAPPED[doc.documentNumber] ?? null,
  }

  // La maquette n'est proposée que pour un document réellement mis en œuvre :
  // l'afficher ailleurs laisserait croire à une implémentation inexistante.
  const resolved = implemented ? resolveDocumentStructure(doc.documentNumber) : null

  const current = versions.find((v) => v.id === doc.currentVersionId) ?? versions[0] ?? null

  return {
    id: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    retiredAt: doc.deletedAt,

    identification: {
      reference: doc.documentNumber,
      designation: doc.title,
      type: parsed ? TYPE_LABELS[parsed.type as TypeCode] ?? parsed.type : '—',
      process: parsed ? PROCESS_LABELS[parsed.process as ProcessCode] ?? parsed.process : '—',
      department: DEPARTMENT_LABELS[doc.department] ?? doc.department,
      category: CATEGORY_LABELS[doc.category] ?? doc.category,
      version: doc.versionLabel,
      status: STATUS_LABELS[doc.status] ?? doc.status,
      effectiveDate: doc.effectiveDate,
      confidentiality: CONFIDENTIALITY_LABELS[doc.confidentiality] ?? doc.confidentiality,
      isoClauses: doc.isoClauses,
      storageType: doc.storageType,
      managedByPassword: doc.managedByPassword,
      observations: doc.observations,
    },

    control: {
      version: doc.versionLabel,
      effectiveDate: doc.effectiveDate,
      nextReviewDate: doc.nextReviewDate,
      retentionYears: doc.retentionYears,
      owner: person(byId.get(doc.ownerId)),
      author: person(byId.get(doc.authorId)),
      departmentManager: doc.departmentManagerId ? person(byId.get(doc.departmentManagerId)) : null,
      approval: current ? { by: nameOf(current.approvedById), at: current.approvedAt } : null,
      // Règle appliquée par la page et l'API du registre, pas une déclaration
      // d'intention : voir documents/page.tsx et api/dms/[id]/route.ts.
      access: { read: 'Tout utilisateur authentifié', write: 'Administrateur, Direction' },
      lastUpdatedAt: doc.updatedAt,
      enforcement: {
        // documents/page.tsx et documents/[id]/page.tsx exigent une session.
        access: true,
        // api/dms : requireApiRole(['admin','direction']) sur PATCH/POST/DELETE.
        modification: true,
        // workflow.ts : `publish` n'accepte que l'état `approved`, et
        // l'approbation horodate approvedById / approvedAt.
        approval: true,
        // `versionLabel` et `effectiveDate` sont librement saisissables sur la
        // fiche tant qu'aucune version n'a été enregistrée : ce n'est alors
        // qu'une mention du registre. Dès qu'une version existe, le cycle de
        // vie les pose lui-même (workflow.ts) et les tient.
        version: versions.length > 0,
        effectiveDate: versions.length > 0,
        // src/lib/db/alerts.ts releve les revues a echeance et en retard.
        review: true,
        // Saisie et conservee, mais aucun controle d'acces ne s'en sert.
        confidentiality: false,
        // workflow.ts calcule une echeance a l'obsolescence ; rien ne purge.
        retention: false,
        // Mention du registre papier ; l'ERP ne protege rien par mot de passe.
        passwordManaged: false,
      },
    },

    implementation,
    structure: resolved?.structure ?? null,
    structureIsTypicalPlan: resolved?.isTypicalPlan ?? false,

    revisions: versions.map((v) => ({
      version: v.versionLabel,
      revision: v.revisionNumber,
      status: STATUS_LABELS[v.status] ?? v.status,
      summary: v.changeSummary,
      reason: v.changeReason,
      author: nameOf(v.authorId),
      approvedBy: nameOf(v.approvedById),
      approvedAt: v.approvedAt,
      effectiveDate: v.effectiveDate,
      isCurrent: v.id === doc.currentVersionId,
    })),

    history: audit.map((a) => ({
      event: EVENT_LABELS[a.event] ?? a.event,
      at: a.at,
      actor: nameOf(a.actorId),
    })),

    recordCount: Number(links[0]?.n ?? 0),
    relatedDocuments,

    availableActions: actor
      ? allowedActions(
          { status: doc.status, department: doc.department, ownerId: doc.ownerId, authorId: doc.authorId },
          actor,
        )
      : [],
  }
}
