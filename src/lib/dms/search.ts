// src/lib/dms/search.ts
// Recherche globale par code ISO (dms_document_code) à travers toutes les
// entités qui en portent un — alimente la barre de recherche de l'en-tête admin.
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

export type DmsSearchResult = {
  code: string
  entityType: DmsSearchEntityType
  label: string
  sublabel: string | null
  href: string
}

export const DMS_SEARCH_ENTITY_LABELS: Record<DmsSearchEntityType, string> = {
  project:            'Projet',
  client:             'Client',
  supplier:           'Fournisseur',
  non_conformance:    'Non-conformité',
  corrective_action:  'Action corrective',
  audit_log:          'Audit',
  audit_program:      "Programme d'audit",
  purchase_order:     'Bon de commande',
}

function buildHref(entityType: DmsSearchEntityType, entityId: string, parentId: string | null): string {
  switch (entityType) {
    case 'project':           return `/admin/projects/${entityId}`
    case 'client':            return `/admin/clients/${entityId}`
    case 'supplier':          return `/admin/suppliers`
    case 'non_conformance':   return `/admin/nc/${entityId}`
    case 'corrective_action': return parentId ? `/admin/nc/${parentId}` : `/admin/nc`
    case 'audit_log':         return `/admin/audits`
    case 'audit_program':     return `/admin/audit-programs`
    case 'purchase_order':    return parentId ? `/admin/projects/${parentId}?tab=realisation` : `/admin/projects`
    default:                  return '/admin'
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
 * Recherche par préfixe de code ISO (LIS-MI-01) à travers les 8 entités qui
 * portent un dms_document_code. Chaque résultat porte déjà son URL de
 * destination — le composant appelant n'a qu'à naviguer.
 */
export async function searchByDmsCode(query: string, limit = 8): Promise<DmsSearchResult[]> {
  const pattern = `${query}%`

  const result = await db.execute(sql`
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
