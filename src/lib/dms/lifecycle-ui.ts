// src/lib/dms/lifecycle-ui.ts
//
// Miroir client du cycle de vie documentaire ISO 9001 §7.5.2 : intitulés,
// couleurs de statut et transitions offertes à un acteur donné.
//
// Extrait de DocumentsClient.tsx pour que le registre LIS-MI-01 et la page
// « Structure du document » proposent exactement les mêmes actions. Deux copies
// auraient dérivé, et un écran aurait fini par offrir une transition que
// l'autre refuse.
//
// Ce module ne décide rien : le serveur revalide chaque action dans
// src/lib/dms/workflow.ts (`canPerformAction` + `TRANSITIONS`), qui reste seul
// juge. Ce qui est ici ne sert qu'à ne pas afficher un bouton voué au 403.

export type WorkflowAction =
  | 'submit_for_review' | 'review_approved' | 'review_rejected'
  | 'approve' | 'reject' | 'publish'
  | 'request_revision' | 'mark_obsolete' | 'archive'

export const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit_for_review: 'Soumettre pour révision',
  review_approved:   'Valider la révision',
  review_rejected:   'Rejeter la révision',
  approve:           'Approuver',
  reject:            'Rejeter',
  publish:           'Publier (en vigueur)',
  request_revision:  'Demander une révision',
  mark_obsolete:     'Marquer obsolète',
  archive:           'Archiver',
}

export const NEXT_ACTIONS: Record<string, WorkflowAction[]> = {
  draft:            ['submit_for_review'],
  under_revision:   ['submit_for_review', 'mark_obsolete'],
  in_review:        ['review_approved', 'review_rejected'],
  pending_approval: ['approve', 'reject'],
  approved:         ['publish', 'request_revision', 'mark_obsolete'],
  effective:        ['request_revision', 'mark_obsolete'],
  obsolete:         ['archive'],
  archived:         [],
}

/** Doit rester aligné sur DEPARTMENT_REVIEWER_ROLE dans src/lib/dms/workflow.ts. */
const DEPARTMENT_REVIEWER_ROLE: Record<string, string> = {
  etudes:      'etudes_chef',
  realisation: 'realisation_chef',
  entretien:   'entretien_chef',
  rh:          'rh_manager',
}

export const STATUS_LABELS: Record<string, string> = {
  draft:            'Brouillon',
  in_review:        'En révision',
  pending_approval: 'En attente approbation',
  approved:         'Approuvé',
  effective:        'En vigueur',
  under_revision:   'En cours de révision',
  obsolete:         'Obsolète',
  archived:         'Archivé',
}

export const STATUS_COLORS: Record<string, string> = {
  draft:            'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  in_review:        'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  pending_approval: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approved:         'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  effective:        'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  under_revision:   'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  obsolete:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
  archived:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
}

/** Transitions qu'un acteur peut réellement déclencher sur ce document. */
export function allowedActions(
  doc: { status: string; department: string; ownerId: string; authorId: string },
  actor: { userId: string; role: string },
): WorkflowAction[] {
  const candidates = NEXT_ACTIONS[doc.status] ?? []
  if (actor.role === 'admin' || actor.role === 'direction') return candidates
  const chefRole = DEPARTMENT_REVIEWER_ROLE[doc.department]
  return candidates.filter((a) => {
    if (a === 'submit_for_review') {
      return actor.userId === doc.ownerId || actor.userId === doc.authorId || actor.role === chefRole
    }
    if (a === 'review_approved' || a === 'review_rejected') return actor.role === chefRole
    return false
  })
}

/**
 * Statut simplifie tel que le registre papier LIS-MI-01 le presente :
 * « En vigueur », « Modifie », « Elimine ». Le marquage rouge du registre prime
 * sur le statut du cycle de vie, comme sur la feuille Excel d'origine.
 */
export function simplifiedStatus(status: string, highlight?: string): { label: string; className: string } {
  if (status === 'obsolete' || status === 'archived') {
    return { label: 'Éliminé', className: 'bg-gray-100 text-gray-500' }
  }
  if (highlight === 'red') {
    return { label: 'Modifié', className: 'bg-red-50 text-red-600' }
  }
  if (status === 'effective' || status === 'approved') {
    return { label: 'En vigueur', className: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]' }
  }
  return { label: 'En cours', className: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]' }
}

export const CATEGORY_LABELS: Record<string, string> = {
  manuel_qualite:        'Manuel qualité',
  politique:             'Politique',
  procedure:             'Procédure',
  instruction:           'Instruction',
  formulaire:            'Formulaire / Fiche',
  enregistrement:        'Enregistrement',
  plan_qualite:          'Plan',
  cartographie_processus:'Cartographie / Processus',
  etude_technique:       'Étude technique',
  devis:                 'Devis',
  contrat:               'Contrat',
  bon_commande:          'Bon de commande',
  facture:               'Facture',
  rapport_inspection:    "Rapport d'inspection",
  rapport_audit:         "Rapport d'audit",
  ncr:                   'NCR',
  capa:                  'CAPA',
  document_fournisseur:  'Document fournisseur',
  document_client:       'Document client',
  externe:               'Document externe',
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  direction:   'Direction',
  etudes:      'Études',
  realisation: 'Réalisation',
  entretien:   'Entretien',
  qualite:     'Qualité',
  finance:     'Finance / Achat',
  rh:          'Ressources Humaines',
  rse:         'RSE',
  transverse:  'Transverse',
}
