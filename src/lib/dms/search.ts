// src/lib/dms/search.ts
// Recherche globale par code / référence à travers toutes les entités qui en
// portent un — alimente la barre de recherche de l'en-tête admin.
import { sql } from 'drizzle-orm'
import { db } from '../../../db/index'

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
  | 'document_review'
  | 'organizational_knowledge'
  | 'study_record'
  | 'client_account_entry'

export type DmsSearchResult = {
  code: string
  entityType: DmsSearchEntityType
  label: string
  sublabel: string | null
  href: string
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
  document_review:          'Revue documentaire',
  organizational_knowledge: 'Connaissance',
  study_record:             "Fiche d'étude",
  client_account_entry:     'Écriture client',
}

function buildHref(entityType: DmsSearchEntityType, entityId: string, parentId: string | null): string {
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
    case 'document':               return `/admin/documents`
    case 'document_review':        return `/admin/document-reviews`
    case 'organizational_knowledge': return `/admin/knowledge`
    case 'study_record':           return parentId ? `/admin/projects/${parentId}/etudes` : `/admin/etude/study-register`
    case 'client_account_entry':   return `/admin/commercial/client-balances`
    default:                       return '/admin'
  }
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
 * Recherche par préfixe de code / référence (ex. « FOR-MI », « EVT-2025 »,
 * « AES-001 ») à travers toutes les entités qui portent un identifiant lisible :
 * soit un `dms_document_code`, soit leur propre `reference` / `code` métier.
 * Chaque résultat porte déjà son URL de destination — le composant appelant
 * n'a qu'à naviguer.
 */
export async function searchByDmsCode(query: string, limit = 12): Promise<DmsSearchResult[]> {
  const pattern = `${query}%`

  const result = await db.execute(sql`
    -- Entités portant un dms_document_code (code ISO)
    SELECT dms_document_code AS code, 'project'::text AS entity_type, id AS entity_id, NULL::uuid AS parent_id, name AS label, reference AS sublabel
    FROM projects WHERE dms_document_code ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT dms_document_code, 'client', id, NULL::uuid, display_name, company_name
    FROM clients WHERE dms_document_code ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT dms_document_code, 'supplier', id, NULL::uuid, name, supplier_code
    FROM suppliers WHERE dms_document_code ILIKE ${pattern}

    UNION ALL
    SELECT dms_document_code, 'non_conformance', id, NULL::uuid, description, reference
    FROM non_conformances WHERE dms_document_code ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT dms_document_code, 'corrective_action', id, nc_id, action_description, NULL::text
    FROM corrective_actions WHERE dms_document_code ILIKE ${pattern}

    UNION ALL
    SELECT dms_document_code, 'audit_log', id, NULL::uuid, process_audited, reference
    FROM audit_logs WHERE dms_document_code ILIKE ${pattern}

    UNION ALL
    SELECT dms_document_code, 'audit_program', id, NULL::uuid, title, reference
    FROM audit_programs WHERE dms_document_code ILIKE ${pattern}

    UNION ALL
    SELECT dms_document_code, 'purchase_order', id, project_id, item_description, NULL::text
    FROM purchase_orders WHERE dms_document_code ILIKE ${pattern}

    -- Entités portant leur propre référence / code métier
    UNION ALL
    SELECT event_reference, 'rse_event', id, NULL::uuid, title, location
    FROM rse_events WHERE event_reference ILIKE ${pattern}

    UNION ALL
    SELECT reference, 'risk_opportunity', id, NULL::uuid, description, category::text
    FROM risks_opportunities WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'stakeholder', id, NULL::uuid, name, type::text
    FROM stakeholders WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'environmental_aspect', id, NULL::uuid, aspect, activity
    FROM environmental_aspects WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'commercial_offer', id, NULL::uuid, project_title, client_name
    FROM commercial_offers WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'delivery_note', id, NULL::uuid, counterparty, note_type::text
    FROM delivery_notes WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'management_review', id, NULL::uuid, 'Revue de direction'::text, review_date::text
    FROM management_reviews WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'meeting_minutes', id, NULL::uuid, COALESCE(meeting_type, 'Réunion'), location
    FROM meeting_minutes WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT code, 'job_position', id, NULL::uuid, title, department
    FROM job_positions WHERE code ILIKE ${pattern}

    UNION ALL
    SELECT code, 'decorative_material', id, NULL::uuid, name, main_material
    FROM decorative_materials WHERE code ILIKE ${pattern}

    UNION ALL
    SELECT code, 'phytosanitary_product', id, NULL::uuid, commercial_name, active_ingredient
    FROM phytosanitary_products WHERE code ILIKE ${pattern}

    UNION ALL
    SELECT reference, 'regulatory_watch', id, NULL::uuid, title, domain
    FROM regulatory_watch WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'extra_expense', id, NULL::uuid, description, category
    FROM extra_expenses WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT code, 'document', id, NULL::uuid, title, category::text
    FROM documents WHERE code ILIKE ${pattern}

    UNION ALL
    SELECT reference, 'document_review', id, NULL::uuid, 'Revue documentaire'::text, review_date::text
    FROM document_reviews WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'organizational_knowledge', id, NULL::uuid, title, domain
    FROM organizational_knowledge WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    UNION ALL
    SELECT reference, 'study_record', id, project_id, COALESCE(project_title, 'Fiche d''étude'), client_name
    FROM project_study_records WHERE reference ILIKE ${pattern}

    UNION ALL
    SELECT reference, 'client_account_entry', id, client_id, COALESCE(notes, 'Écriture'), entry_type::text
    FROM client_account_entries WHERE reference ILIKE ${pattern} AND deleted_at IS NULL

    ORDER BY code
    LIMIT ${limit}
  `)

  return (result.rows as Row[]).map((r) => ({
    code:       r.code,
    entityType: r.entity_type,
    label:      r.label,
    sublabel:   r.sublabel,
    href:       buildHref(r.entity_type, r.entity_id, r.parent_id),
  }))
}
