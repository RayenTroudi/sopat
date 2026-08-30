// src/lib/dms/search.ts
// Recherche globale par code / référence à travers toutes les entités qui en
// portent un — alimente la barre de recherche de l'en-tête admin.
//
// Le rapprochement est volontairement permissif : on cherche le fragment saisi
// n'importe où dans le code (pas seulement en préfixe) et on ignore la
// ponctuation / la casse, si bien que « mi05 », « MI 05 » ou « for-mi-05 »
// retrouvent tous « FOR-MI-05 ». À défaut de code, le libellé de l'entité est
// également inspecté. Les résultats sont classés du plus exact au plus large.
import { sql, type SQL } from 'drizzle-orm'
import { db } from '../../../db/index'
import { extractIsoCode, normalizeIsoCode, resolveIsoDocumentRoute, UNMAPPED_DESTINATION } from './iso-routes'

export type DmsSearchEntityType =
  | 'project'
  | 'client'
  | 'supplier'
  | 'non_conformance'
  | 'corrective_action'
  | 'audit_log'
  | 'audit_program'
  | 'purchase_order'
  | 'rse_event'
  | 'risk_opportunity'
  | 'stakeholder'
  | 'environmental_aspect'
  | 'commercial_offer'
  | 'delivery_note'
  | 'management_review'
  | 'meeting_minutes'
  | 'job_position'
  | 'decorative_material'
  | 'phytosanitary_product'
  | 'regulatory_watch'
  | 'extra_expense'
  | 'document'
  | 'dms_document'
  | 'document_review'
  | 'organizational_knowledge'
  | 'study_record'
  | 'client_account_entry'
  | 'plant_species'
  | 'hse_checklist_item'
  | 'recruitment_request'
  | 'training_session'

export type DmsSearchResult = {
  code: string
  entityType: DmsSearchEntityType
  label: string
  sublabel: string | null
  /**
   * Destination de navigation, ou `null` quand le résultat est un document
   * maîtrisé qu'aucune page opérationnelle ne met en œuvre. Un `href` nul n'est
   * jamais remplacé par un repli : le composant affiche alors le résultat sans
   * cible plutôt que de promettre une page qui ne traite pas le document.
   */
  href: string | null
  /**
   * Fil d'Ariane de la destination pour les codes ISO (« Commercial / Bordereau
   * des prix »), ou le motif d'absence de page. `null` pour les entités
   * métier, dont la puce de type suffit à situer la destination.
   */
  destination: string | null
}

export const DMS_SEARCH_ENTITY_LABELS: Record<DmsSearchEntityType, string> = {
  project:                  'Projet',
  client:                   'Client',
  supplier:                 'Fournisseur',
  non_conformance:          'Non-conformité',
  corrective_action:        'Action corrective',
  audit_log:                'Audit',
  audit_program:            "Programme d'audit",
  purchase_order:           'Bon de commande',
  rse_event:                'Événement RSE',
  risk_opportunity:         'Risque / Opportunité',
  stakeholder:              'Partie intéressée',
  environmental_aspect:     'Aspect environnemental',
  commercial_offer:         'Offre commerciale',
  delivery_note:            'Bon de livraison',
  management_review:        'Revue de direction',
  meeting_minutes:          'PV de réunion',
  job_position:             'Fiche de poste',
  decorative_material:      'Matériau décoratif',
  phytosanitary_product:    'Produit phytosanitaire',
  regulatory_watch:         'Veille réglementaire',
  extra_expense:            'Dépense extra',
  document:                 'Document',
  dms_document:             'Information documentée',
  document_review:          'Revue documentaire',
  organizational_knowledge: 'Connaissance',
  study_record:             "Fiche d'étude",
  client_account_entry:     'Écriture client',
  plant_species:            'Espèce végétale',
  hse_checklist_item:       'Point HSE',
  recruitment_request:      'Demande de recrutement',
  training_session:         'Formation',
}

/**
 * URL d'une entité métier. Les deux sources documentaires (`document` et
 * `dms_document`) ne sont volontairement pas traitées ici : leur destination
 * dépend du code ISO porté par la ligne et passe par
 * `resolveIsoDocumentRoute`. Renvoyer `/admin/documents` pour elles était
 * précisément le repli LIS-MI-01 qui affichait une destination fausse.
 */
function buildHref(entityType: DmsSearchEntityType, entityId: string, parentId: string | null): string | null {
  switch (entityType) {
    case 'project':                return `/admin/projects/${entityId}`
    case 'client':                 return `/admin/clients/${entityId}`
    case 'supplier':               return `/admin/suppliers`
    case 'non_conformance':        return `/admin/nc/${entityId}`
    case 'corrective_action':      return parentId ? `/admin/nc/${parentId}` : `/admin/nc`
    case 'audit_log':              return `/admin/audits`
    case 'audit_program':          return `/admin/audit-programs`
    case 'purchase_order':         return parentId ? `/admin/projects/${parentId}?tab=realisation` : `/admin/projects`
    case 'rse_event':              return `/admin/rse/events/${entityId}`
    case 'risk_opportunity':       return `/admin/risks-opportunities/${entityId}`
    case 'stakeholder':            return `/admin/stakeholders/${entityId}`
    case 'environmental_aspect':   return `/admin/environment/aspects/${entityId}`
    case 'commercial_offer':       return `/admin/commercial/offers/${entityId}`
    case 'delivery_note':          return `/admin/achat/delivery-notes/${entityId}`
    case 'management_review':      return `/admin/management-reviews/${entityId}`
    case 'meeting_minutes':        return `/admin/meetings/${entityId}`
    case 'job_position':           return `/admin/rh/job-positions/${entityId}`
    case 'decorative_material':    return `/admin/etude/decorative-materials/${entityId}`
    case 'phytosanitary_product':  return `/admin/etude/phytosanitary/${entityId}`
    case 'regulatory_watch':       return `/admin/regulatory-watch`
    case 'extra_expense':          return `/admin/achat/extra-expenses`
    case 'document':               return null
    case 'dms_document':           return null
    case 'document_review':        return `/admin/document-reviews`
    case 'organizational_knowledge': return `/admin/knowledge`
    case 'study_record':           return parentId ? `/admin/projects/${parentId}/etudes` : `/admin/etude/study-register`
    case 'client_account_entry':   return `/admin/commercial/client-balances`
    case 'plant_species':          return `/admin/etude/plant-species/${entityId}`
    case 'hse_checklist_item':     return `/admin/environment/hse-checklist`
    case 'recruitment_request':    return `/admin/rh/recruitment/${entityId}`
    case 'training_session':       return `/admin/rh/training/${entityId}`
    default:                       return '/admin'
  }
}

/**
 * Une source de recherche = une table et les colonnes qui y portent un code
 * lisible. `codes` est classé par priorité d'affichage ; `label` / `sublabel`
 * sont des expressions SQL servant à la fois à l'affichage et au repli sur une
 * recherche textuelle.
 */
type SearchSource = {
  entityType: DmsSearchEntityType
  table:      string
  codes:      string[]
  label:      string
  sublabel:   string
  parentId?:  string
  /** Colonnes textuelles supplémentaires inspectées en repli (hors label / sublabel). */
  text?:      string[]
  /** Filtre additionnel, typiquement l'exclusion des suppressions logiques. */
  where?:     string
}

const NOT_DELETED = 'deleted_at IS NULL'

const SEARCH_SOURCES: SearchSource[] = [
  // ── Entités portant un code ISO (dms_document_code) ──────────────────────
  { entityType: 'project', table: 'projects', codes: ['dms_document_code', 'reference'],
    label: 'name', sublabel: 'reference', text: ['client_name', 'site_address'], where: NOT_DELETED },
  { entityType: 'client', table: 'clients', codes: ['dms_document_code'],
    label: 'display_name', sublabel: 'company_name', where: NOT_DELETED },
  { entityType: 'supplier', table: 'suppliers', codes: ['dms_document_code', 'supplier_code'],
    label: 'name', sublabel: 'supplier_code' },
  { entityType: 'non_conformance', table: 'non_conformances',
    codes: ['dms_document_code', 'reference'],
    label: 'description', sublabel: 'reference', text: ['client_response_ref'],
    where: NOT_DELETED },
  { entityType: 'corrective_action', table: 'corrective_actions', codes: ['dms_document_code'],
    label: 'action_description', sublabel: 'NULL', parentId: 'nc_id' },
  { entityType: 'audit_log', table: 'audit_logs', codes: ['dms_document_code', 'reference'],
    label: 'process_audited', sublabel: 'reference' },
  { entityType: 'audit_program', table: 'audit_programs', codes: ['dms_document_code', 'reference'],
    label: 'title', sublabel: 'reference' },
  { entityType: 'purchase_order', table: 'purchase_orders',
    codes: ['dms_document_code', 'supplier_invoice_number'],
    label: 'item_description', sublabel: 'NULL', parentId: 'project_id' },

  // ── Entités portant leur propre référence / code métier ──────────────────
  { entityType: 'rse_event', table: 'rse_events', codes: ['event_reference'],
    label: 'title', sublabel: 'location' },
  { entityType: 'risk_opportunity', table: 'risks_opportunities', codes: ['reference'],
    label: 'description', sublabel: 'category::text', where: NOT_DELETED },
  { entityType: 'stakeholder', table: 'stakeholders', codes: ['reference'],
    label: 'name', sublabel: 'type::text', where: NOT_DELETED },
  { entityType: 'environmental_aspect', table: 'environmental_aspects', codes: ['reference'],
    label: 'aspect', sublabel: 'activity', where: NOT_DELETED },
  { entityType: 'commercial_offer', table: 'commercial_offers', codes: ['reference'],
    label: 'project_title', sublabel: 'client_name', where: NOT_DELETED },
  { entityType: 'delivery_note', table: 'delivery_notes', codes: ['reference'],
    label: 'counterparty', sublabel: 'note_type::text', where: NOT_DELETED },
  { entityType: 'management_review', table: 'management_reviews', codes: ['reference'],
    label: `'Revue de direction'`, sublabel: 'review_date::text', where: NOT_DELETED },
  { entityType: 'meeting_minutes', table: 'meeting_minutes', codes: ['reference'],
    label: `COALESCE(meeting_type, 'Réunion')`, sublabel: 'location', where: NOT_DELETED },
  { entityType: 'job_position', table: 'job_positions', codes: ['code'],
    label: 'title', sublabel: 'department' },
  { entityType: 'decorative_material', table: 'decorative_materials', codes: ['code'],
    label: 'name', sublabel: 'main_material' },
  { entityType: 'phytosanitary_product', table: 'phytosanitary_products',
    codes: ['code', 'approval_number'],
    label: 'commercial_name', sublabel: 'active_ingredient' },
  { entityType: 'regulatory_watch', table: 'regulatory_watch', codes: ['reference'],
    label: 'title', sublabel: 'domain', where: NOT_DELETED },
  { entityType: 'extra_expense', table: 'extra_expenses', codes: ['reference'],
    label: 'description', sublabel: 'category', where: NOT_DELETED },
  { entityType: 'document', table: 'documents', codes: ['code'],
    label: 'title', sublabel: 'category::text' },
  // `legacy_reference` est du texte libre (jusqu'à 500 car.) : cherché comme
  // texte, jamais affiché comme code.
  { entityType: 'dms_document', table: 'dms_documents', codes: ['document_number'],
    label: 'title', sublabel: 'category::text', text: ['description', 'legacy_reference'],
    where: NOT_DELETED },
  { entityType: 'document_review', table: 'document_reviews', codes: ['reference'],
    label: `'Revue documentaire'`, sublabel: 'review_date::text', where: NOT_DELETED },
  { entityType: 'organizational_knowledge', table: 'organizational_knowledge', codes: ['reference'],
    label: 'title', sublabel: 'domain', where: NOT_DELETED },
  { entityType: 'study_record', table: 'project_study_records', codes: ['reference'],
    label: `COALESCE(project_title, 'Fiche d''étude')`, sublabel: 'client_name', parentId: 'project_id' },
  { entityType: 'client_account_entry', table: 'client_account_entries', codes: ['reference'],
    label: `COALESCE(notes, 'Écriture')`, sublabel: 'entry_type::text',
    parentId: 'client_id', where: NOT_DELETED },
  { entityType: 'plant_species', table: 'plant_species', codes: ['lis_code'],
    label: 'botanical_name', sublabel: 'common_name_fr' },
  { entityType: 'hse_checklist_item', table: 'hse_checklist_items', codes: ['code'],
    label: 'description', sublabel: 'category' },
  { entityType: 'recruitment_request', table: 'recruitment_requests', codes: ['ref_code'],
    label: 'post_title', sublabel: 'requesting_dept', where: NOT_DELETED },
  { entityType: 'training_session', table: 'training_sessions', codes: ['ref_code'],
    label: 'theme', sublabel: 'thematic', where: NOT_DELETED },
]

/** Expression SQL normalisant un code : minuscules, sans ponctuation ni espaces. */
function normalized(expr: string): string {
  return `regexp_replace(lower(coalesce(${expr}, '')), '[^a-z0-9]', '', 'g')`
}

/** Même normalisation, côté applicatif, pour la saisie utilisateur. */
function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Rangs : 0 = code identique, 1 = code commençant par, 2 = code contenant,
// 3 = libellé contenant, NO_MATCH = pas de correspondance.
const NO_MATCH = 99

function codeRank(expr: string, nq: string): SQL {
  const n = sql.raw(normalized(expr))
  return sql`CASE
    WHEN ${n} = '' THEN ${NO_MATCH}
    WHEN ${n} = ${nq} THEN 0
    WHEN ${n} LIKE ${`${nq}%`} THEN 1
    WHEN ${n} LIKE ${`%${nq}%`} THEN 2
    ELSE ${NO_MATCH}
  END`
}

function codeMatches(expr: string, nq: string): SQL {
  const n = sql.raw(normalized(expr))
  return sql`(${n} <> '' AND ${n} LIKE ${`%${nq}%`})`
}

function buildBranch(source: SearchSource, nq: string, pattern: string, perSource: number): SQL {
  const hasCodeQuery = nq.length > 0
  const parent = source.parentId ? sql.raw(source.parentId) : sql.raw('NULL::uuid')

  // Colonne « code » affichée : celle qui a effectivement matché, sinon la
  // première renseignée.
  const fallback = sql.raw(`COALESCE(${source.codes.map((c) => `${c}::text`).join(', ')}, '—')`)
  const displayCases = hasCodeQuery
    ? source.codes.map((c) => sql`WHEN ${codeMatches(c, nq)} THEN ${sql.raw(c)}::text`)
    : []
  // `left(...)` protège l'affichage d'une colonne anormalement longue.
  const codeExpr = displayCases.length > 0
    ? sql`left(CASE ${sql.join(displayCases, sql` `)} ELSE ${fallback} END, 60)`
    : sql`left(${fallback}, 60)`

  // Repli textuel : libellé, sous-libellé et colonnes additionnelles.
  const textConds = [source.label, source.sublabel, ...(source.text ?? [])]
    .filter((c) => c !== 'NULL')
    .map((c) => sql`${sql.raw(c)}::text ILIKE ${pattern}`)
  const textRank = textConds.length > 0
    ? sql`CASE WHEN ${sql.join(textConds, sql` OR `)} THEN 3 ELSE ${NO_MATCH} END`
    : sql`${NO_MATCH}`

  const ranks = hasCodeQuery
    ? [...source.codes.map((c) => codeRank(c, nq)), textRank]
    : [textRank]
  const rankExpr = ranks.length === 1 ? ranks[0] : sql`LEAST(${sql.join(ranks, sql`, `)})`

  const where = source.where ? sql.raw(source.where) : sql.raw('TRUE')

  return sql`(
    SELECT * FROM (
      SELECT
        ${codeExpr}                                  AS code,
        ${source.entityType}::text                   AS entity_type,
        id::text                                     AS entity_id,
        ${parent}::text                              AS parent_id,
        COALESCE(${sql.raw(source.label)}::text, '') AS label,
        ${sql.raw(source.sublabel)}::text            AS sublabel,
        (${rankExpr})::int                           AS rank
      FROM ${sql.raw(source.table)}
      WHERE ${where}
    ) s
    WHERE s.rank < ${NO_MATCH}
    ORDER BY s.rank, length(s.code), s.code
    LIMIT ${perSource}
  )`
}

type Row = {
  code: string
  entity_type: DmsSearchEntityType
  entity_id: string
  parent_id: string | null
  label: string
  sublabel: string | null
}

/**
 * Recherche par fragment de code / référence (ex. « MI-05 », « evt2025 »,
 * « aes 001 ») à travers toutes les entités qui portent un identifiant lisible,
 * avec repli sur le libellé de l'entité. Chaque résultat porte déjà son URL de
 * destination — le composant appelant n'a qu'à naviguer.
 */
export async function searchByDmsCode(query: string, limit = 25): Promise<DmsSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  // Une saisie peut mêler un code et du texte — « FOR-CO-02 bordereau ». La
  // normalisation brute donnerait « forco02bordereau », qui ne correspond à
  // aucun code ; on isole donc le code ISO présent et on cherche sur lui.
  const embedded = extractIsoCode(trimmed)
  const nq = embedded ? normalizeQuery(embedded) : normalizeQuery(trimmed)
  const pattern = `%${trimmed}%`
  const perSource = Math.max(3, Math.ceil(limit / 4))

  const branches = SEARCH_SOURCES.map((s) => buildBranch(s, nq, pattern, perSource))

  const result = await db.execute(sql`
    SELECT code, entity_type, entity_id, parent_id, label, sublabel
    FROM (
      ${sql.join(branches, sql` UNION ALL `)}
    ) u
    ORDER BY rank, length(code), code
    LIMIT ${limit}
  `)

  return resolveRows(result.rows as Row[])
}

/** Les deux sources qui décrivent un document maîtrisé plutôt qu'une opération. */
const DOCUMENT_ENTITY_TYPES = new Set<DmsSearchEntityType>(['document', 'dms_document'])

/**
 * Transforme les lignes SQL en résultats navigables.
 *
 * Deux règles, dans cet ordre :
 *
 * 1. **Déduplication.** Beaucoup de codes du registre sont en réalité des
 *    enregistrements : `FOR-MI-21` est une non-conformité, `FOR-AC-14` une ligne
 *    de commande, `PRS-RE-03` un projet. Ces entités portent le même code dans
 *    leur colonne `dms_document_code`, et leur ligne métier — qui, elle, mène à
 *    la bonne page — est déjà dans le jeu de résultats. On retire alors le
 *    doublon documentaire au lieu de proposer deux destinations pour un code.
 *
 * 2. **Résolution.** Ce qui reste est un document maîtrisé : sa destination
 *    vient du résolveur canonique. Sans page opérationnelle, `href` reste nul.
 */
function resolveRows(rows: Row[]): DmsSearchResult[] {
  const operationalCodes = new Set<string>()
  for (const r of rows) {
    if (DOCUMENT_ENTITY_TYPES.has(r.entity_type)) continue
    const code = normalizeIsoCode(r.code)
    if (code) operationalCodes.add(code)
  }

  const out: DmsSearchResult[] = []
  for (const r of rows) {
    if (!DOCUMENT_ENTITY_TYPES.has(r.entity_type)) {
      out.push({
        code:        r.code,
        entityType:  r.entity_type,
        label:       r.label,
        sublabel:    r.sublabel,
        href:        buildHref(r.entity_type, r.entity_id, r.parent_id),
        destination: null,
      })
      continue
    }

    const resolution = resolveIsoDocumentRoute(r.code)
    if (resolution && operationalCodes.has(resolution.code)) continue

    out.push({
      code:        resolution?.code ?? r.code,
      entityType:  r.entity_type,
      label:       r.label,
      sublabel:    r.sublabel,
      href:        resolution?.href ?? null,
      destination: resolution?.destination ?? UNMAPPED_DESTINATION,
    })
  }
  return out
}
