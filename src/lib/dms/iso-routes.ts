// src/lib/dms/iso-routes.ts
// Résolution canonique « code ISO → page ERP ».
//
// Pourquoi ce module existe
// -------------------------
// Un code du registre LIS-MI-01 (FOR-CO-02, FOR-AC-10, PLA-MI-04…) désigne un
// document maîtrisé. Ce document est, dans l'immense majorité des cas, mis en
// œuvre par une page opérationnelle de l'ERP — pas par le registre lui-même.
// La recherche globale renvoyait auparavant TOUTE information documentée vers
// `/admin/documents`, c'est-à-dire vers LIS-MI-01, ce qui affichait une
// destination fausse dès que le document avait une vraie page.
//
// Règle appliquée ici, sans exception :
//   • LIS-MI-01                       → la page du registre LIS-MI-01
//   • code avec une page opérationnelle → cette page
//   • tout le reste                    → AUCUNE destination (`href: null`)
//
// Il n'existe volontairement pas de repli générique : un code inconnu ne doit
// jamais prétendre que sa destination est LIS-MI-01.
//
// Provenance du tableau
// ---------------------
// Chaque entrée vient d'une preuve dans le dépôt — la page ou le composant qui
// affiche le code, ou `docs/SMQ-GAP-ANALYSIS.md` qui trace document ↔ module.
// Rien n'est deviné : un document sans page identifiée reste `reference`.

import { PROCESS_CODES, TYPE_CODES } from './codes'

/** Page du registre des informations documentées internes (LIS-MI-01). */
export const DOCUMENT_INDEX_HREF = '/admin/documents'

export type IsoRouteKind =
  /** Le document est mis en œuvre par une page opérationnelle de l'ERP. */
  | 'operational'
  /** Le document EST le registre documentaire (LIS-MI-01). */
  | 'document_index'
  /** Document maîtrisé sans page opérationnelle : consultable, non navigable. */
  | 'reference'

export type IsoRouteResolution = {
  /** Code officiel normalisé pour l'affichage, ex. « FOR-CO-02 ». */
  code: string
  kind: IsoRouteKind
  /** Destination réelle, ou `null` quand aucune page ne met en œuvre le document. */
  href: string | null
  /** Fil d'Ariane affiché sous le résultat de recherche. */
  destination: string
}

type RouteEntry = { href: string; destination: string; kind?: IsoRouteKind }

const TYPE_ALT = TYPE_CODES.join('|')
const PROCESS_ALT = PROCESS_CODES.join('|')

/**
 * Numéro de séquence : un ou deux chiffres (« 2 », « 02 »), ou trois chiffres
 * ne commençant pas par zéro (« 100 »).
 *
 * Le refus de « 021 » est délibéré. La forme canonique complète à deux
 * positions, jamais à trois : un zéro de tête suivi de deux chiffres n'est donc
 * jamais un code du registre, c'est une coquille. L'accepter la ferait passer
 * pour valide ; la tronquer en « 02 » ferait pire encore — le code d'un autre
 * document.
 */
const SEQ = '([1-9]\\d{2}|\\d{1,2})'

/** Séparateurs tolérés entre les segments : « FOR CO 02 », « for.co.02 », « FOR_CO_02 ». */
const SEP = '[\\s._/-]*'

/** Code isolé, ponctuation et casse déjà retirées : « forco02 », « FORCO02VA ». */
const COMPACT_CODE = new RegExp(`^(${TYPE_ALT})(${PROCESS_ALT})${SEQ}(VA)?$`, 'i')

/**
 * Code repéré dans une chaîne plus longue (« FOR-CO-02 bordereau », « (for co 02) »).
 *
 * Trois garde-fous, chacun contre un faux positif précis :
 *
 *   `(?<![A-Z0-9])`  rien d'alphanumérique devant, sinon « XFOR-CO-02 »
 *                    livrerait FOR-CO-02.
 *   `(?!\d)`         aucun chiffre derrière, sinon « FOR-MI-100 » serait tronqué
 *                    en FOR-MI-10 et « FOR-CO-021 » en FOR-CO-02.
 *   `(?![A-Za-z]{1,2}(?![A-Za-z]))`
 *                    aucun suffixe d'une ou deux lettres collé au code. Une ou
 *                    deux lettres qui s'arrêtent net se lisent comme une
 *                    variante inconnue (« PRC-MI-01B ») ; à partir de trois,
 *                    c'est le mot suivant (« FOR-CO-02and let me know ») et le
 *                    code doit être reconnu. Le suffixe officiel `-VA` échappe
 *                    au garde-fou : le groupe optionnel l'a déjà consommé.
 */
const EMBEDDED_CODE = new RegExp(
  `(?<![A-Z0-9])(${TYPE_ALT})${SEP}(${PROCESS_ALT})${SEP}${SEQ}(?:${SEP}(VA))?(?!\\d)(?![A-Za-z]{1,2}(?![A-Za-z]))`,
  'i',
)

function format(type: string, process: string, seq: string, va: string | undefined): string {
  const n = seq.length >= 2 ? seq : seq.padStart(2, '0')
  return `${type.toUpperCase()}-${process.toUpperCase()}-${n}${va ? '-VA' : ''}`
}

/**
 * Normalise une saisie en code officiel, ou `null` si ce n'en est pas un.
 * Accepte « for-co-02 », « FOR CO 02 », « forco02 », « FOR.CO.02-va ».
 */
export function normalizeIsoCode(input: string): string | null {
  const compact = input.replace(/[^a-zA-Z0-9]/g, '')
  const m = COMPACT_CODE.exec(compact)
  if (!m) return null
  return format(m[1], m[2], m[3], m[4])
}

/**
 * Extrait le premier code ISO présent dans un texte libre — saisie de recherche
 * (« FOR-CO-02 bordereau ») ou titre de document. `null` si aucun.
 */
export function extractIsoCode(text: string): string | null {
  const m = EMBEDDED_CODE.exec(text)
  if (!m) return null
  return format(m[1], m[2], m[3], m[4])
}

// ─────────────────────────────────────────────────────────────────────────────
// Tableau de routage
//
// Les codes absents de ce tableau sont volontairement `reference` : documents
// statiques (instructions INS/ISN, politiques hors publication, processus), ou
// enregistrements historiques dont la page reste à construire. Voir
// `INTENTIONALLY_UNMAPPED` plus bas pour les cas notables et leur raison.
// ─────────────────────────────────────────────────────────────────────────────

const ROUTES: Record<string, RouteEntry> = {
  // ── Registre documentaire ────────────────────────────────────────────────
  // Seul LIS-MI-01 mène au registre. Aucun autre code n'y est renvoyé par défaut.
  'LIS-MI-01': { href: DOCUMENT_INDEX_HREF, destination: 'Documents / Registre LIS-MI-01', kind: 'document_index' },
  // PRC-MI-01 est la procédure que le module DMS applique (src/app/api/dms/route.ts).
  'PRC-MI-01': { href: DOCUMENT_INDEX_HREF, destination: 'Documents / Maîtrise des informations documentées' },

  // ── Achat ────────────────────────────────────────────────────────────────
  'FOR-AC-01': { href: '/admin/achat/extra-expenses',  destination: 'Achat / Extra dépenses' },
  'FOR-AC-03': { href: '/admin/achat/supply-tracking', destination: 'Achat / Bons de commande' },
  'FOR-AC-05': { href: '/admin/achat/delivery-notes',  destination: 'Achat / Bons de retour' },
  'FOR-AC-06': { href: '/admin/achat/delivery-notes',  destination: 'Achat / Bons de livraison' },
  'FOR-AC-10': { href: '/admin/achat/supply-tracking', destination: 'Achat / Suivi approvisionnement chantier' },
  'FOR-AC-11': { href: '/admin/suppliers',             destination: 'Achat / Évaluation des fournisseurs' },
  'LIS-AC-01': { href: '/admin/suppliers',             destination: 'Achat / Fournisseurs agréés' },
  'PRC-AC-02': { href: '/admin/suppliers',             destination: 'Achat / Sélection & évaluation des fournisseurs' },

  // ── Commercial ───────────────────────────────────────────────────────────
  'FOR-CO-01': { href: '/admin/commercial/offers',          destination: 'Commercial / Suivi des offres' },
  'FOR-CO-02': { href: '/admin/commercial/offers',          destination: 'Commercial / Bordereau des prix' },
  'FOR-CO-03': { href: '/admin/commercial/client-balances', destination: 'Commercial / État de solde client' },
  'LIS-CO-02': { href: '/admin/clients',                    destination: 'Commercial / Clients' },

  // ── Étude ────────────────────────────────────────────────────────────────
  'FOR-ET-01': { href: '/admin/etude/study-register',       destination: "Étude / Registre des projets d'étude" },
  'FOR-ET-02': { href: '/admin/etude/study-register',       destination: 'Étude / Fiche projet' },
  'FOR-ET-03': { href: '/admin/etude/decorative-materials', destination: 'Étude / Matières décoratives' },
  'FOR-ET-05': { href: '/admin/etude/phytosanitary',        destination: 'Étude / Produits phytosanitaires' },
  'FOR-ET-06': { href: '/admin/etude/project-articles',     destination: 'Étude / Articles projet' },
  'INS-ET-01': { href: '/admin/etude',                      destination: 'Étude / Instructions du processus' },
  'PRS-ET-01': { href: '/admin/etude',                      destination: 'Étude / Processus' },
  'LIS-ET-02': { href: '/admin/etude/plant-species',        destination: 'Étude / Palette végétale' },
  'LIS-ET-03': { href: '/admin/etude/plant-species',        destination: 'Étude / Spécifications des plantes' },

  // ── Management intégré : revue documentaire / veille / réunions ──────────
  'FOR-MI-01': { href: '/admin/document-reviews', destination: 'Qualité / Revue documentaire' },
  'FOR-MQ-01': { href: '/admin/document-reviews', destination: 'Qualité / Revue documentaire' },
  'FOR-MI-02': { href: '/admin/regulatory-watch', destination: 'Qualité / Veille réglementaire' },
  'FOR-MQ-02': { href: '/admin/regulatory-watch', destination: 'Qualité / Veille réglementaire' },
  'PRC-MI-05': { href: '/admin/regulatory-watch', destination: 'Qualité / Veille réglementaire & normative' },
  'PRC-MQ-05': { href: '/admin/regulatory-watch', destination: 'Qualité / Veille réglementaire & normative' },
  'FOR-MI-04': { href: '/admin/meetings',         destination: 'Qualité / PV de réunion' },
  'FOR-MQ-04': { href: '/admin/meetings',         destination: 'Qualité / PV de réunion' },

  // ── Non-conformités & actions correctives ────────────────────────────────
  'FOR-MI-05': { href: '/admin/nc', destination: 'Qualité / Registre des NC & réclamations' },
  'FOR-MQ-05': { href: '/admin/nc', destination: 'Qualité / Registre des NC & réclamations' },
  'FOR-MQ-06': { href: '/admin/nc', destination: 'Qualité / Traitement des NC' },
  'PRC-MI-02': { href: '/admin/nc', destination: 'Qualité / Traitement des non-conformités' },
  'PRC-MI-04': { href: '/admin/nc', destination: 'Qualité / Actions correctives (CAPA)' },
  'PRC-MI-06': { href: '/admin/nc', destination: 'Qualité / NC, PNC et réclamations clients' },
  'PRC-MQ-06': { href: '/admin/nc', destination: 'Qualité / NC, PNC et réclamations clients' },

  // ── Risques & opportunités ───────────────────────────────────────────────
  'FOR-MI-07': { href: '/admin/risks-opportunities', destination: 'Qualité / Risques & opportunités' },
  'FOR-MQ-07': { href: '/admin/risks-opportunities', destination: 'Qualité / Risques & opportunités' },
  'PRC-MI-08': { href: '/admin/risks-opportunities', destination: 'Qualité / Analyse des risques & opportunités' },
  'PRC-MQ-08': { href: '/admin/risks-opportunities', destination: 'Qualité / Analyse des risques & opportunités' },

  // ── Parties intéressées ──────────────────────────────────────────────────
  'FOR-MI-08': { href: '/admin/stakeholders', destination: "Qualité / Registre d'écoute PI" },
  'FOR-MQ-08': { href: '/admin/stakeholders', destination: "Qualité / Registre d'écoute PI" },
  'FOR-MI-09': { href: '/admin/stakeholders', destination: 'Qualité / Suggestions du personnel' },
  'FOR-MQ-09': { href: '/admin/stakeholders', destination: 'Qualité / Suggestions du personnel' },
  'LIS-MI-07': { href: '/admin/stakeholders', destination: 'Qualité / Registre des parties intéressées' },
  'LIS-MQ-07': { href: '/admin/stakeholders', destination: 'Qualité / Registre des parties intéressées' },
  'PRC-MI-07': { href: '/admin/stakeholders', destination: 'Qualité / Écoute des parties intéressées' },
  'PRC-MQ-07': { href: '/admin/stakeholders', destination: 'Qualité / Écoute des parties intéressées' },

  // ── Tableau de bord SMQ ──────────────────────────────────────────────────
  'FOR-MI-10': { href: '/admin/dashboard', destination: 'Direction / Tableau de bord SMQ' },
  'FOR-MQ-10': { href: '/admin/dashboard', destination: 'Direction / Tableau de bord SMQ' },

  // ── Environnement & SST ──────────────────────────────────────────────────
  'FOR-MI-11': { href: '/admin/environment/waste',         destination: 'Environnement / Registre des déchets' },
  'PRC-MI-12': { href: '/admin/environment/waste',         destination: 'Environnement / Gestion des déchets' },
  'FOR-MI-12': { href: '/admin/environment/hse-checklist', destination: 'Environnement / Check-list SME & SST' },
  'FOR-MQ-12': { href: '/admin/environment/hse-checklist', destination: 'Environnement / Check-list SME & SST' },
  'PLA-MI-04': { href: '/admin/environment/aspects',       destination: 'Environnement / Évaluation des AES' },
  'PLA-MI-05': { href: '/admin/environment/aspects',       destination: 'Environnement / Identification des AES' },
  'PRC-MI-11': { href: '/admin/environment/aspects',       destination: 'Environnement / Aspects environnementaux' },

  // ── Audits internes ──────────────────────────────────────────────────────
  'FOR-MI-13': { href: '/admin/audits',         destination: "Qualité / Rapports d'audit" },
  'FOR-MQ-13': { href: '/admin/audits',         destination: "Qualité / Rapports d'audit" },
  'PRC-MI-03': { href: '/admin/audits',         destination: 'Qualité / Audit interne' },
  'PRC-MI-09': { href: '/admin/audits',         destination: 'Qualité / Audits internes' },
  'PRC-MQ-09': { href: '/admin/audits',         destination: 'Qualité / Audits internes' },
  'FOR-MI-14': { href: '/admin/audit-programs', destination: "Qualité / Programme d'audit" },
  'FOR-MQ-14': { href: '/admin/audit-programs', destination: "Qualité / Programme d'audit" },
  'LIS-MI-05': { href: '/admin/auditors',       destination: 'Qualité / Auditeurs internes' },
  'LIS-MI-08': { href: '/admin/auditors',       destination: 'Qualité / Auditeurs internes' },
  'LIS-MQ-08': { href: '/admin/auditors',       destination: 'Qualité / Auditeurs internes' },

  // ── Revue de direction ───────────────────────────────────────────────────
  'FOR-MI-15': { href: '/admin/management-reviews', destination: 'Direction / Revue de direction' },
  'FOR-MQ-15': { href: '/admin/management-reviews', destination: 'Direction / Revue de direction' },
  'PRC-MI-10': { href: '/admin/management-reviews', destination: 'Direction / Revue de direction' },
  'PRC-MQ-10': { href: '/admin/management-reviews', destination: 'Direction / Revue de direction' },

  // ── Plans de management ──────────────────────────────────────────────────
  'PLA-MI-01': { href: '/admin/management-plan', destination: 'Direction / Plan annuel de management' },
  'PLA-MQ-01': { href: '/admin/management-plan', destination: 'Direction / Plan annuel de management' },
  'PLA-MI-02': { href: '/admin/management-plan', destination: 'Direction / Plan des initiatives solidaires' },
  'PLA-MQ-02': { href: '/admin/management-plan', destination: 'Direction / Plan des initiatives solidaires' },
  'PLA-MI-03': { href: '/admin/management-plan', destination: 'Direction / Plan de communication' },
  'PLA-MQ-03': { href: '/admin/management-plan', destination: 'Direction / Plan de communication' },

  // ── Contexte, politiques & connaissances (publiés depuis le DMS) ─────────
  // `/admin/context` publie ORG MI 01–08 (docs/SMQ-GAP-ANALYSIS.md §4.6).
  'ORG-MI-01': { href: '/admin/context', destination: "Direction / Cartographie de l'entreprise" },
  'ORG-MQ-01': { href: '/admin/context', destination: "Direction / Cartographie de l'entreprise" },
  'ORG-MI-02': { href: '/admin/context', destination: "Direction / Politique d'engagement RSE" },
  'ORG-MQ-02': { href: '/admin/context', destination: "Direction / Politique d'engagement RSE" },
  'ORG-MI-03': { href: '/admin/context', destination: 'Direction / Charte RSE' },
  'ORG-MQ-03': { href: '/admin/context', destination: 'Direction / Charte RSE' },
  'ORG-MI-04': { href: '/admin/context', destination: 'Direction / Politique environnementale' },
  'ORG-MQ-04': { href: '/admin/context', destination: 'Direction / Politique environnementale' },
  'ORG-MI-05': { href: '/admin/context', destination: "Direction / Code d'éthique des affaires" },
  'ORG-MQ-05': { href: '/admin/context', destination: "Direction / Code d'éthique des affaires" },
  'ORG-MI-06': { href: '/admin/context', destination: 'Direction / Charte qualité' },
  'ORG-MQ-06': { href: '/admin/context', destination: 'Direction / Charte qualité' },
  'ORG-MI-07': { href: '/admin/context', destination: "Direction / Contexte de l'entreprise" },
  'ORG-MQ-07': { href: '/admin/context', destination: "Direction / Contexte de l'entreprise" },
  'ORG-MI-08': { href: '/admin/context', destination: 'Direction / Politique qualité' },
  'ORG-MQ-08': { href: '/admin/context', destination: 'Direction / Politique qualité' },
  'ORG-MI-10': { href: '/admin/context', destination: 'Direction / Politique environnementale' },
  'ORG-MI-09': { href: '/admin/knowledge', destination: 'Qualité / Connaissances organisationnelles' },
  'ORG-MQ-09': { href: '/admin/knowledge', destination: 'Qualité / Connaissances organisationnelles' },

  // ── Réalisation ──────────────────────────────────────────────────────────
  // Ces documents vivent dans l'onglet « Réalisation » d'un projet ; le registre
  // transversal LIS-RE-02 est l'entrée depuis laquelle on ouvre ce projet.
  'LIS-RE-02': { href: '/admin/realisation',                  destination: 'Réalisation / Registre des projets' },
  'FOR-RE-03': { href: '/admin/realisation',                  destination: 'Réalisation / Fiche équipe projet (onglet projet)' },
  'FOR-RE-04': { href: '/admin/realisation',                  destination: 'Réalisation / Suivi journalier de chantier (onglet projet)' },
  'FOR-RE-05': { href: '/admin/realisation',                  destination: 'Réalisation / PV de réception provisoire (onglet projet)' },
  'FOR-RE-07': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list travaux préliminaires (onglet projet)' },
  'FOR-RE-08': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list réseaux & maçonnerie (onglet projet)' },
  'FOR-RE-09': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list plantations (onglet projet)' },
  'FOR-RE-10': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list engazonnement (onglet projet)' },
  'FOR-RE-11': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list matière décorative (onglet projet)' },
  'FOR-RE-12': { href: '/admin/realisation',                  destination: 'Réalisation / Check-list fourniture des plantes (onglet projet)' },
  'FOR-RE-13': { href: '/admin/realisation',                  destination: 'Réalisation / Attachement de projet (onglet projet)' },
  'FOR-RE-14': { href: '/admin/realisation',                  destination: 'Réalisation / PV de réception définitive (onglet projet)' },
  'FOR-RE-15': { href: '/admin/realisation',                  destination: 'Réalisation / Décompte de projet (onglet projet)' },
  'INS-RE-01': { href: '/admin/realisation',                  destination: 'Réalisation / Instruction projet (check-lists qualité)' },
  'PLA-RE-03': { href: '/admin/realisation',                  destination: "Réalisation / Plan d'action projet (onglet projet)" },
  'PLA-RE-05': { href: '/admin/realisation',                  destination: 'Réalisation / Planning Gantt (onglet projet)' },
  'PLA-RE-02': { href: '/admin/realisation/weekly-schedule',  destination: 'Réalisation / Planning hebdomadaire' },

  // ── Entretien ────────────────────────────────────────────────────────────
  'PLA-RE-01': { href: '/admin/calendrier-entretien', destination: "Entretien / Planning annuel d'entretien" },
  'PLA-RE-04': { href: '/admin/calendrier-entretien', destination: "Entretien / Plan d'action mensuel" },

  // ── Ressources humaines ──────────────────────────────────────────────────
  'FOR-RH-01': { href: '/admin/rh/recruitment',         destination: 'RH / Demandes de recrutement' },
  'FOR-RH-03': { href: '/admin/rh/performance',         destination: 'RH / Évaluation de performance' },
  'FOR-RH-05': { href: '/admin/rh/training',            destination: 'RH / Feuille de présence de formation' },
  'FOR-RH-06': { href: '/admin/rh/training',            destination: 'RH / Évaluation de formation à chaud' },
  'FOR-RH-07': { href: '/admin/rh/training',            destination: 'RH / Évaluation de formation à froid' },
  'FOR-RH-08': { href: '/admin/rh/job-positions',       destination: 'RH / Fiches de poste' },
  'FOR-RH-13': { href: '/admin/rh/attendance',          destination: 'RH / Pointage' },
  'FOR-RH-14': { href: '/admin/rh/leaves',              destination: 'RH / Demandes de congé' },
  'FOR-RH-15': { href: '/admin/rh/exit-authorizations', destination: 'RH / Autorisations de sortie' },
  'FOR-RH-28': { href: '/admin/rh/equipment',           destination: 'RH / Matériel de travail' },
  'FOR-RH-34': { href: '/admin/rh/employees',           destination: 'RH / Check-list dossier personnel' },
  'FOR-RH-41': { href: '/admin/rh/mission-orders',      destination: 'RH / Ordres de mission' },
  'FOR-RH-42': { href: '/admin/rh/leaves',              destination: 'RH / Solde individuel de congé' },
  'FOR-RH-43': { href: '/admin/rh/leaves',              destination: 'RH / Registre de suivi des congés' },
  'LIS-RH-01': { href: '/admin/rh/substitutes',         destination: 'RH / Suppléants' },
  'LIS-RH-02': { href: '/admin/rh/employees',           destination: 'RH / Suivi du personnel' },
  'PLA-RH-01': { href: '/admin/rh/integration',         destination: "RH / Plan d'intégration" },
  'PLA-RH-02': { href: '/admin/rh/training',            destination: 'RH / Planning de formation' },
  'PRC-RH-02': { href: '/admin/rh/training',            destination: 'RH / Formation du personnel' },
  'PRC-RH-03': { href: '/admin/rh/leaves',              destination: 'RH / Gestion des congés' },
  'PRC-RH-06': { href: '/admin/rh/attendance',          destination: 'RH / Gestion de présence' },
  'PRC-RH-07': { href: '/admin/rh/integration',         destination: 'RH / Intégration des stagiaires' },
}

/**
 * Documents laissés sans destination en connaissance de cause, avec la raison.
 * Sert de documentation exécutable : les tests vérifient qu'aucun d'eux ne
 * résout vers une page — et surtout pas vers LIS-MI-01.
 */
export const INTENTIONALLY_UNMAPPED: Record<string, string> = {
  'LIS-MI-02': 'Liste des informations documentées externes — pas de registre externe dans l\'ERP',
  'LIS-MI-03': 'Suivi des enregistrements — couvert transversalement, pas de page dédiée',
  'LIS-MI-04': 'Liste des mots de passe — volontairement non digitalisée (risque sécurité)',
  'LIS-MI-09': 'Registre des déchets dangereux — registre spécifique non implémenté',
  'LIS-MI-10': 'Liste de matériels & maintenance — pas de page de maintenance dédiée',
  'LIS-RE-01': "Liste des contrats d'entretien — pas de registre de contrats",
  'LIS-CO-01': 'Liste des références — le portefeuille direction s\'en approche sans la mettre en œuvre',
  'FOR-AC-04': 'Fiche de réception — pas de page dédiée',
  'FOR-AC-08': "Demande d'approvisionnement — pas de page dédiée",
  'FOR-ET-04': 'Fiche de spécifications de plante — obsolète, remplacée par LIS-ET-03',
  'FOR-ET-07': "Rendu d'aménagement paysager — livrable graphique, pas de page",
  'FOR-ET-08': "Présentation d'aménagement paysager — livrable graphique, pas de page",
  'FOR-MI-16': 'Fiche d\'analyse des changements — module de gestion des changements non implémenté',
  'FOR-MI-17': 'Registre de suivi des changements — module non implémenté',
  'PRC-MI-13': 'Procédure de gestion des changements — module non implémenté',
  'FOR-RE-01': "Fiche de suivi de projet d'entretien — pas de registre transversal",
  'FOR-RE-02': "Fiche d'intervention d'entretien — pas de registre transversal",
  'FOR-RE-06': 'Compte rendu de supervision chantier — pas de page dédiée',
  'FOR-RH-02': 'Fiche de renseignement — pas de page dédiée',
  'FOR-RH-04': 'Fiche de suivi de carrière — hors périmètre (PRC-RH-08 obsolète)',
  'FOR-RH-44': 'Grille de polyvalence — pas de page dédiée',
  'PRC-RH-04': 'Procédure de discipline — hors périmètre actuel',
  'PRC-RH-05': 'Procédure de gestion de paie — hors périmètre actuel',
  'PRC-RH-08': 'Procédure de gestion de carrière — obsolète',
  'ORG-CO-01': "Offre de prix d'étude — modèle de document, génération PDF",
  'ORG-CO-02': "Contrat de projet d'entretien — modèle de document, génération PDF",
  'ORG-RH-01': "Règlement interne — document statique publié hors ERP",
  'ORG-RH-02': "Organigramme — document statique publié hors ERP",
  'ORG-RH-03': 'Politique RH — document statique publié hors ERP',
  'ORG-RH-04': 'Organigramme fonctionnel — document statique publié hors ERP',
  'PRS-AC-01': 'Cartographie du processus Achat — document statique',
  'PRS-CO-01': 'Cartographie du processus Commercial — document statique',
  'PRS-MI-01': 'Cartographie du processus Management de la qualité — document statique',
  'PRS-MI-02': "Cartographie du processus Management de l'environnement — document statique",
  'PRS-MQ-01': 'Cartographie du processus Management de la qualité — document statique',
  'PRS-RE-01': 'Cartographie du processus Réalisation — document statique',
  'PRS-RE-02': 'Cartographie du processus Entretien — document statique',
  'PRS-RH-01': 'Cartographie du processus RH — document statique',
}

/** Libellé affiché lorsqu'aucune page opérationnelle ne met en œuvre le document. */
export const UNMAPPED_DESTINATION = 'Page opérationnelle non configurée'

/**
 * Résout un code ISO — exact, en minuscules, noyé dans une phrase ou dans un
 * titre — vers sa page ERP réelle.
 *
 * Renvoie `null` si l'entrée ne contient aucun code ISO. Renvoie une résolution
 * `reference` avec `href: null` si le code existe mais qu'aucune page ne le met
 * en œuvre : il n'y a **jamais** de repli vers LIS-MI-01.
 */
export function resolveIsoDocumentRoute(input: string | null | undefined): IsoRouteResolution | null {
  if (!input) return null
  const code = normalizeIsoCode(input) ?? extractIsoCode(input)
  if (!code) return null

  const entry = ROUTES[code]
  if (!entry) {
    return { code, kind: 'reference', href: null, destination: UNMAPPED_DESTINATION }
  }
  return {
    code,
    kind: entry.kind ?? 'operational',
    href: entry.href,
    destination: entry.destination,
  }
}

/** Copie en lecture seule du tableau de routage — utilisée par les tests. */
export function isoRouteTable(): Readonly<Record<string, RouteEntry>> {
  return ROUTES
}
