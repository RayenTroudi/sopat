// src/lib/dms/attach.ts
//
// Relier un enregistrement ERP à l'information documentée maîtrisée qui le régit.
//
// ── Le bug que ce module remplace ────────────────────────────────────────────
// La version précédente exportait `attachDmsCode()`, qui, à CHAQUE création
// d'une entité ERP (bon de commande, fournisseur, projet, client, NC, CAPA,
// audit…) :
//   1. incrémentait un compteur dans `dms_code_sequences`,
//   2. INSÉRAIT une nouvelle ligne dans `dms_documents`,
//   3. la reliait à l'entité via `dms_document_links` (link_role = 'origin').
//
// Autrement dit, chaque transaction ERP fabriquait une nouvelle « information
// documentée interne ». Le registre LIS-MI-01 a ainsi gonflé à 714 lignes dont
// 485 étaient des transactions — d'où des entrées absurdes comme
// « FOR-AC-12 — Phoenix dactylifera T60 — 3 unités », une ligne de bon de
// commande promue au rang de formulaire maîtrisé.
//
// ── La distinction que ce module rétablit ────────────────────────────────────
//   DÉFINITION MAÎTRISÉE   FOR-AC-03 « Bon de commande »   → vit dans LIS-MI-01
//   INSTANCE / ENREGISTREMENT   BC-2026-001, BC-2026-002…  → vit dans l'ERP,
//                                                             et RÉFÉRENCE la
//                                                             définition.
//
// `linkControlledDocument()` n'insère JAMAIS dans `dms_documents` et ne touche
// JAMAIS `dms_code_sequences`. Il résout une définition qui existe déjà dans le
// registre et pose une simple relation (link_role = 'instance'). Créer une
// définition maîtrisée reste un acte explicite : QMS → Informations
// documentées → « Nouveau document » (POST /api/dms).
//
// Les données de référence (client, projet, fournisseur) ne sont pas des
// enregistrements produits par un formulaire : elles ne sont donc reliées à
// aucune définition et n'apparaissent nulle part dans LIS-MI-01.

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../../../db/index'
import { dmsDocuments, dmsDocumentLinks } from '../../../db/schema'
import { logDmsAudit } from './audit'

type Tx = Parameters<Parameters<(typeof db)['transaction']>[0]>[0]

type DmsLinkEntity = typeof dmsDocumentLinks.$inferInsert['entityType']

/**
 * Le rôle porté par le lien « cet enregistrement ERP applique ce formulaire ».
 *
 * Volontairement distinct de 'origin', le rôle qu'utilisait `attachDmsCode` :
 * la migration 0038 s'appuie sur cette différence pour retrouver, sans
 * ambiguïté, les 485 lignes fabriquées par le bug.
 */
export const CONTROLLED_INSTANCE_LINK_ROLE = 'instance'

/**
 * Quelle définition maîtrisée régit quel type d'enregistrement ERP.
 *
 * Une entité absente de cette table n'est reliée à rien — c'est le cas voulu
 * pour les données de référence (`client`, `project`, `supplier`), qui ne sont
 * produites par aucun formulaire du registre.
 */
export const CONTROLLED_DOCUMENT_BY_ENTITY = {
  purchase_order:    'FOR-AC-03', // Bon de commande
  non_conformance:   'FOR-MI-05', // Registre de suivi des NC, PNC et réclamations
  // PRC-MI-04 « Procédure d'actions correctives et préventives » a été retirée
  // du registre entre 2023 et 2025 : le traitement des actions correctives est
  // désormais couvert par PRC-MI-06. Voir la migration 0039.
  corrective_action: 'PRC-MI-06', // Procédure de traitement des NC, PNC et réclamations clients
  audit_log:         'FOR-MI-13', // Rapport d'audit
  audit_program:     'FOR-MI-14', // Programme d'audit
} as const satisfies Partial<Record<DmsLinkEntity, string>>

export type ControlledLinkedEntity = keyof typeof CONTROLLED_DOCUMENT_BY_ENTITY

/**
 * Relie un enregistrement ERP à la définition maîtrisée qui le régit et
 * renvoie le code de cette définition (ex. 'FOR-AC-03'), destiné à la colonne
 * `dms_document_code` de l'entité.
 *
 * Renvoie `null` — sans rien écrire — si la définition est absente du registre
 * ou n'est plus en vigueur. Un registre incomplet ne doit jamais empêcher la
 * saisie d'un bon de commande : l'entité est créée, simplement sans référence
 * documentaire.
 *
 * N'insère jamais dans `dms_documents`.
 */
export async function linkControlledDocument(
  tx: Tx,
  opts: {
    entityType: ControlledLinkedEntity
    entityId:   string
    actorId:    string
  },
): Promise<string | null> {
  const controlledCode = CONTROLLED_DOCUMENT_BY_ENTITY[opts.entityType]
  if (!controlledCode) return null

  const [definition] = await tx
    .select({ id: dmsDocuments.id, documentNumber: dmsDocuments.documentNumber })
    .from(dmsDocuments)
    .where(
      and(
        eq(dmsDocuments.documentNumber, controlledCode),
        isNull(dmsDocuments.deletedAt),
      ),
    )
    .limit(1)

  if (!definition) return null

  await tx
    .insert(dmsDocumentLinks)
    .values({
      documentId: definition.id,
      entityType: opts.entityType,
      entityId:   opts.entityId,
      linkRole:   CONTROLLED_INSTANCE_LINK_ROLE,
      createdBy:  opts.actorId,
    })
    .onConflictDoNothing()

  // Traçabilité ISO 9001 §7.5.3 : l'évènement porte sur la définition, pas sur
  // un nouveau document — c'est précisément ce que le registre doit refléter.
  await logDmsAudit(tx, {
    documentId: definition.id,
    event:      'linked',
    actorId:    opts.actorId,
    metadata: {
      linkedEntityType: opts.entityType,
      linkedEntityId:   opts.entityId,
      linkRole:         CONTROLLED_INSTANCE_LINK_ROLE,
    },
  })

  return definition.documentNumber
}
