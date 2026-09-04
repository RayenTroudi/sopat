// src/lib/dms/document-structures.ts
//
// Ce que CONTIENT chaque information documentee de LIS-MI-01 - vu par
// l'utilisateur, pas par la base.
//
// -- Pourquoi ce catalogue ---------------------------------------------------
// La page « Structure du document » doit repondre a « qu'y a-t-il dans ce
// document ? ». La reponse n'est ecrite nulle part : `dms_documents` porte la
// fiche de controle (code, version, statut), pas la maquette du formulaire.
// Ce module est donc l'unique source de verite de la MAQUETTE. Il ne duplique
// aucune table : il decrit ce qu'aucune table ne decrit.
//
// -- Provenance --------------------------------------------------------------
// Rien n'est invente. Les colonnes des registres sont relevees sur les ecrans
// qui les mettent reellement en oeuvre - l'en-tete de tableau du module, cite
// dans `screen`. Un document sans structure relevee n'en recoit aucune : la
// page l'affiche comme « structure non decrite » plutot que d'en fabriquer une.
//
// Les documents dont l'ecran est celui d'un CONTENANT (une check-list vit dans
// l'onglet d'un projet, le bordereau dans une offre) sont volontairement
// absents du releve automatique : reprendre les colonnes du contenant aurait
// decrit la liste des projets a la place de la check-list. Ceux qui comptent
// sont decrits a la main, plus bas.
//
// -- Structure != enregistrements --------------------------------------------
// Ce module decrit le MODELE VIERGE. Les enregistrements reels restent dans
// leur module operationnel, atteint par « Ouvrir le module ».

import { resolveIsoDocumentRoute } from './iso-routes'
import { parseCode } from './codes'

/** Rubrique d'un formulaire : des champs, ou un tableau. */
export type DocumentFormSection =
  | { title: string; fields: string[] }
  | { title: string; columns: string[] }

/** Representation visuelle appropriee au type de document. */
export type DocumentStructure =
  /** Tableau a lignes repetees : registre, liste, suivi. */
  | { kind: 'register'; screen?: string; columns: string[]; note?: string }
  /**
   * Formulaire : rubriques a renseigner. Une rubrique porte soit des champs,
   * soit un tableau — un PV de reception aligne une en-tete, un tableau de
   * reserves et un bloc de signatures, et le forcer en champs le trahirait.
   */
  | { kind: 'form'; screen?: string; sections: DocumentFormSection[]; note?: string }
  /**
   * Check-list : colonnes de controle, et les points eux-memes lorsqu'ils
   * sont imprimes sur le formulaire vierge.
   */
  | { kind: 'checklist'; screen?: string; columns: string[]; items?: string[]; note?: string }
  /** Procedure, instruction, processus, document organisationnel : plan redige. */
  | { kind: 'sections'; screen?: string; sections: string[]; note?: string }

export type DocumentStructureKind = DocumentStructure['kind']

export const STRUCTURE_KIND_LABELS: Record<DocumentStructureKind, string> = {
  register:  'Registre',
  form:      'Formulaire',
  checklist: 'Check-list',
  sections:  'Document rédigé',
}

/**
 * Plan type des procedures SOPAT.
 *
 * Aucune procedure n'est stockee en base - ce sont des documents Word/PDF
 * maitrises hors ERP. Le plan ci-dessous est celui que SOPAT applique a toutes
 * ses procedures ; il est affiche comme PLAN TYPE, jamais comme le contenu
 * propre d'une procedure donnee. L'ecran le signale explicitement.
 */
const PROCEDURE_PLAN = [
  'Objet',
  "Domaine d'application",
  "Responsabilités",
  "Déroulement",
  "Documents associés",
  "Enregistrements",
  "Indicateurs",
  "Historique des révisions",
]

/** Plan type des instructions de travail : plus court, oriente geste. */
const INSTRUCTION_PLAN = [
  'Objet',
  "Domaine d'application",
  "Moyens et équipements",
  "Mode opératoire",
  "Précautions et consignes de sécurité",
  "Enregistrements associés",
  "Historique des révisions",
]

/** Plan type des fiches de processus (cartographie). */
const PROCESS_PLAN = [
  "Finalité du processus",
  "Pilote du processus",
  "Données d'entrée",
  "Activités",
  "Données de sortie",
  "Ressources",
  "Indicateurs de performance",
  "Risques et opportunités",
]

/** Plan type des documents organisationnels : politiques, chartes, organigrammes. */
const ORGANISATIONAL_PLAN = [
  'Engagement de la direction',
  "Périmètre",
  "Axes et objectifs",
  "Moyens",
  "Communication et diffusion",
  "Revue et mise à jour",
]

/**
 * Structures relevees sur les ecrans qui mettent les documents en oeuvre.
 * Bloc genere depuis les en-tetes de tableau reels, puis fige ici.
 */
const CATALOGUE: Record<string, DocumentStructure> = {
  'FOR-AC-01': { kind: 'register', screen: 'achat/extra-expenses/page.tsx',
    columns: ["Réf.", "Date", "Projet", "Catégorie", "Description", "Scan", "Montant", "Statut", "Demandeur", "Actions"] },
  'FOR-AC-11': { kind: 'register', screen: 'suppliers/SuppliersClient.tsx',
    columns: ["Code", "Fournisseur", "Catégorie", "Contact", "Sélection", "Évaluation", "Classe ISO", "Prochaine éval."] },
  'FOR-CO-01': { kind: 'register', screen: 'commercial/offers/page.tsx',
    columns: ["Réf.", "Client", "Projet", "Montant", "Envoyée le", "Statut", "Responsable"] },
  'FOR-CO-03': { kind: 'register', screen: 'commercial/client-balances/page.tsx',
    columns: ["Client", "Facturé", "Avoirs", "Encaissé", "Solde"] },
  'FOR-ET-01': { kind: 'register', screen: 'etude/study-register/page.tsx',
    columns: ["Réf.", "Projet / Titre", "Client", "Localisation", "Responsable", "Délai prévu", "Début", "Fin", "Taux résistance"] },
  'FOR-ET-06': { kind: 'register', screen: 'etude/project-articles/page.tsx',
    columns: ["Espèce (botanique)", "Nom commun", "Catégorie", "Qté", "Unité", "Projet", "Observations"] },
  'FOR-MI-01': { kind: 'register', screen: 'document-reviews/page.tsx',
    columns: ["Réf.", "Date", "Périmètre", "Docs revus", "Constats", "Prochaine revue", "Statut"] },
  'FOR-MI-02': { kind: 'register', screen: 'regulatory-watch/page.tsx',
    columns: ["Réf.", "Titre", "Domaine", "Organisme", "Date effet", "Statut", "Prochaine révision"] },
  'FOR-MI-05': { kind: 'register', screen: 'nc/NcPageClient.tsx',
    columns: ["N° / DMS", "Dépt.", "Statut", "Source", "Type", "Description", "Correction (prévu)", "Assigné à"] },
  'FOR-MI-07': { kind: 'register', screen: 'risks-opportunities/page.tsx',
    columns: ["Réf.", "Type", "Catégorie", "Description", "Score", "Statut", "Responsable"] },
  'FOR-MI-08': { kind: 'register', screen: 'stakeholders/page.tsx',
    columns: ["Réf.", "Nom", "Type", "Besoins / Attentes", "Influence", "Interaction", "PIP"] },
  'FOR-MI-11': { kind: 'register', screen: 'environment/waste/page.tsx',
    columns: ["Mois", "Type de déchet", "Qté (kg)", "Mode d'élimination", "Prestataire", "Coût (TND)", "Notes"] },
  'FOR-MI-15': { kind: 'register', screen: 'management-reviews/page.tsx',
    columns: ["Réf.", "Date", "Statut", "Participants", "Créée par"] },
  'FOR-MQ-01': { kind: 'register', screen: 'document-reviews/page.tsx',
    columns: ["Réf.", "Date", "Périmètre", "Docs revus", "Constats", "Prochaine revue", "Statut"] },
  'FOR-MQ-02': { kind: 'register', screen: 'regulatory-watch/page.tsx',
    columns: ["Réf.", "Titre", "Domaine", "Organisme", "Date effet", "Statut", "Prochaine révision"] },
  'FOR-MQ-04': { kind: 'register', screen: 'meetings/page.tsx',
    columns: ["Réf.", "Date", "Type", "Lieu", "Participants", "Rédigé par"] },
  'FOR-MQ-05': { kind: 'register', screen: 'nc/NcPageClient.tsx',
    columns: ["N° / DMS", "Dépt.", "Statut", "Source", "Type", "Description", "Correction (prévu)", "Assigné à"] },
  'FOR-MQ-06': { kind: 'register', screen: 'nc/NcPageClient.tsx',
    columns: ["N° / DMS", "Dépt.", "Statut", "Source", "Type", "Description", "Correction (prévu)", "Assigné à"] },
  'FOR-MQ-07': { kind: 'register', screen: 'risks-opportunities/page.tsx',
    columns: ["Réf.", "Type", "Catégorie", "Description", "Score", "Statut", "Responsable"] },
  'FOR-MQ-08': { kind: 'register', screen: 'stakeholders/page.tsx',
    columns: ["Réf.", "Nom", "Type", "Besoins / Attentes", "Influence", "Interaction", "PIP"] },
  'FOR-MQ-09': { kind: 'register', screen: 'stakeholders/page.tsx',
    columns: ["Réf.", "Nom", "Type", "Besoins / Attentes", "Influence", "Interaction", "PIP"] },
  'FOR-MQ-12': { kind: 'register', screen: 'environment/hse-checklist/page.tsx',
    columns: ["Date", "Département", "Statut global", "Soumis par"] },
  'FOR-MQ-15': { kind: 'register', screen: 'management-reviews/page.tsx',
    columns: ["Réf.", "Date", "Statut", "Participants", "Créée par"] },
  'FOR-RH-42': { kind: 'register', screen: 'rh/leaves/page.tsx',
    columns: ["Employé", "Type", "Du", "Au", "Durée", "Sup.", "RH", "Dir.", "Statut"] },
  'FOR-RH-43': { kind: 'register', screen: 'rh/leaves/page.tsx',
    columns: ["Employé", "Type", "Du", "Au", "Durée", "Sup.", "RH", "Dir.", "Statut"] },
  'LIS-AC-01': { kind: 'register', screen: 'suppliers/SuppliersClient.tsx',
    columns: ["Code", "Fournisseur", "Catégorie", "Contact", "Sélection", "Évaluation", "Classe ISO", "Prochaine éval."] },
  'LIS-ET-02': { kind: 'register', screen: 'etude/plant-species/page.tsx',
    columns: ["Code", "Nom latin", "Nom commun", "Catégorie", "Hauteur adulte", "Période plantation", "Floraison"] },
  'LIS-MI-05': { kind: 'register', screen: 'auditors/page.tsx',
    columns: ["Nom", "Rôle", "Domaine d'audit", "Date qualification", "Preuve"] },
  'LIS-MI-07': { kind: 'register', screen: 'stakeholders/page.tsx',
    columns: ["Réf.", "Nom", "Type", "Besoins / Attentes", "Influence", "Interaction", "PIP"] },
  'LIS-MI-08': { kind: 'register', screen: 'auditors/page.tsx',
    columns: ["Nom", "Rôle", "Domaine d'audit", "Date qualification", "Preuve"] },
  'LIS-MQ-07': { kind: 'register', screen: 'stakeholders/page.tsx',
    columns: ["Réf.", "Nom", "Type", "Besoins / Attentes", "Influence", "Interaction", "PIP"] },
  'LIS-MQ-08': { kind: 'register', screen: 'auditors/page.tsx',
    columns: ["Nom", "Rôle", "Domaine d'audit", "Date qualification", "Preuve"] },
  'LIS-RE-02': { kind: 'register', screen: 'realisation/page.tsx',
    columns: ["Projet", "Statut", "Phase réalisation", "Accès"] },
  'LIS-RH-01': { kind: 'register', screen: 'rh/substitutes/page.tsx',
    columns: ["Poste", "Titulaire", "Suppléant", "Mis à jour"] },
  'LIS-RH-02': { kind: 'register', screen: 'rh/employees/page.tsx',
    columns: ["Matricule", "Nom", "Poste", "Département", "Contrat", "Solde congés"] },
  'PLA-MI-04': { kind: 'register', screen: 'environment/aspects/page.tsx',
    columns: ["Réf.", "Activité", "Aspect", "Condition", "F×G", "Significatif", "Statut"] },
  'PLA-MI-05': { kind: 'register', screen: 'environment/aspects/page.tsx',
    columns: ["Réf.", "Activité", "Aspect", "Condition", "F×G", "Significatif", "Statut"] },
  'PLA-MQ-01': { kind: 'register', screen: 'management-plan/page.tsx',
    columns: ["Direction", "Sujet", "Cible", "Moyen", "Fréquence", "Responsable", "Date prévue"] },
  'PLA-MQ-02': { kind: 'register', screen: 'management-plan/page.tsx',
    columns: ["Direction", "Sujet", "Cible", "Moyen", "Fréquence", "Responsable", "Date prévue"] },
  'PLA-MQ-03': { kind: 'register', screen: 'management-plan/page.tsx',
    columns: ["Direction", "Sujet", "Cible", "Moyen", "Fréquence", "Responsable", "Date prévue"] },
  'PLA-RH-02': { kind: 'register', screen: 'rh/training/page.tsx',
    columns: ["Réf.", "Thème", "Thématique", "Organisme", "Période prévue", "Statut"] },

  // -- Structures decrites a la main -----------------------------------------
  // Chacune vient d'un ecran precis, cite dans `screen`. Le releve automatique
  // ne pouvait pas les atteindre : soit le document vit dans un contenant, soit
  // l'ecran porte plusieurs tableaux et le premier n'est pas le bon.


  // FOR-AC-10 est le suivi ligne a ligne du chantier, rendu par SupplySection.
  'FOR-AC-10': { kind: 'register', screen: 'components/achat/SupplySection.tsx',
    columns: ["Désignation", "Norme", "Qté prévue", "P.U. HTVA", "Total prévu",
              "Qté livrée", "Écart qté", "P.U. réel", "Total réel", "Écart total"] },

  // Le bordereau vit dans une offre : ses colonnes sont celles de BordereauPanel,
  // pas celles de la liste des offres.
  'FOR-CO-02': { kind: 'register', screen: 'commercial/offers/[id]/BordereauPanel.tsx',
    columns: ["N°", "Désignation des prestations", "Norme", "Unité", "Qté", "P.U.", "Montant"] },

  // Feuille de presence : le tableau des participants d'une session.
  'FOR-RH-05': { kind: 'register', screen: 'rh/training/[id]/page.tsx',
    columns: ["Nom", "Présent", "Éval. chaud", "Éval. froid"] },

  // Fiche de pointage mensuelle : une ligne par jour.
  'FOR-RH-13': { kind: 'register', screen: 'rh/attendance/[id]/page.tsx',
    columns: ["Jour", "Entrée", "Sortie déjeuner", "Retour déjeuner", "Sortie", "Notes"] },

  // Bon de remise de materiel : les articles remis a un employe.
  'FOR-RH-28': { kind: 'register', screen: 'rh/equipment/[id]/page.tsx',
    columns: ["Description", "Quantité", "N° série"] },

  // -- Formulaires -----------------------------------------------------------
  // Documents remplis une fois par cas, et non tenus ligne a ligne. Les
  // rubriques reprennent les champs des ecrans de saisie correspondants.

  'FOR-RH-14': { kind: 'form', screen: 'rh/leaves/new',
    sections: [
      { title: 'Demandeur',  fields: ["Employé", "Département", "Fonction"] },
      { title: 'Demande',    fields: ["Type de congé", "Du", "Au", "Durée", "Motif"] },
      { title: 'Validation', fields: ["Supérieur hiérarchique", "Ressources humaines", "Direction", "Statut"] },
    ] },

  'FOR-RH-15': { kind: 'form', screen: 'rh/exit-authorizations',
    sections: [
      { title: 'Demandeur',  fields: ["Employé"] },
      { title: 'Sortie',     fields: ["Départ", "Retour", "Durée", "Motif"] },
      { title: 'Validation', fields: ["Supérieur hiérarchique", "Ressources humaines"] },
    ] },

  'FOR-RH-41': { kind: 'form', screen: 'rh/mission-orders',
    sections: [
      { title: 'Missionnaire', fields: ["Employé"] },
      { title: 'Mission',      fields: ["Destination", "Objet", "Du", "Au"] },
      { title: 'Validation',   fields: ['Statut'] },
    ] },


  // -- Corrections issues de l'audit d'exactitude ----------------------------
  // Bon de commande : l'ecran Suivi d'approvisionnement recense les bons ;
  // le bon lui-meme est saisi dans PurchaseDrawer.
  'FOR-AC-03': { kind: 'form', screen: 'components/realisation/PurchaseDrawer.tsx',
    sections: [
      { title: 'Article commandé', fields: ["Description de l'article", 'Quantité', 'Prix unitaire TND'] },
      { title: 'Fournisseur', fields: ['Fournisseur', 'N° de facture fournisseur', 'Facture (PDF)'] },
      { title: 'Commande', fields: ["Date d'achat", 'Notes'] },
    ] },

  // PV de reunion : la liste recense les PV, le PV est la fiche de seance.
  'FOR-MI-04': { kind: 'form', screen: 'meetings/[id]/page.tsx',
    sections: [
      { title: 'Séance', fields: ['Référence', 'Date', 'Type', 'Lieu', 'Rédigé par'] },
      { title: 'Présences', fields: ['Participants', 'Absents excusés'] },
      { title: 'Déroulement', fields: ["Ordre du jour", 'Points discutés', 'Décisions prises'] },
    ] },

  // Le releve automatique prenait l'ecran de LISTE d'un module pour la maquette
  // du document. Une liste est le REGISTRE des documents produits ; le document
  // lui-meme est la fiche que la liste ouvre. Chaque entree ci-dessous vient de
  // cette fiche.

  // Bon de livraison / de retour : la liste recense les bons, le bon est la
  // fiche et ses articles.
  'FOR-AC-06': { kind: 'form', screen: 'achat/delivery-notes/[id]/page.tsx',
    sections: [
      { title: 'Identification', fields: ['Projet', 'Fournisseur / Destinataire', 'Chauffeur / livreur', 'Réceptionné par', 'Observations'] },
      { title: 'Articles', columns: ['Désignation', 'Unité', 'Quantité', 'Observation'] },
    ] },
  'FOR-AC-05': { kind: 'form', screen: 'achat/delivery-notes/[id]/page.tsx',
    sections: [
      { title: 'Identification', fields: ['Projet', 'Fournisseur / Destinataire', 'Chauffeur / livreur', 'Réceptionné par', 'Observations'] },
      { title: 'Articles retournés', columns: ['Désignation', 'Unité', 'Quantité', 'Observation'] },
    ] },

  // Fiches de specifications techniques : ce sont des FICHES, pas des listes.
  'FOR-ET-03': { kind: 'form', screen: 'etude/decorative-materials/[id]/page.tsx',
    sections: [
      { title: 'Caractéristiques', fields: ['Matière principale', 'Aspect', 'Couleur', 'Calibre', "Absorption d'eau", 'Conditionnement'] },
      { title: 'Mise en œuvre', fields: ['Manutention', 'Conditionnement', 'Conditions de stockage', 'Entretien', 'Remarques'] },
    ] },
  'FOR-ET-05': { kind: 'form', screen: 'etude/phytosanitary/[id]/page.tsx',
    sections: [
      { title: 'Caractéristiques générales', fields: ['N° Homologation', 'Matière active', 'Formulation', 'Concentration', "Dose d'utilisation", 'Dépredateurs / Cibles', 'Culture'] },
      { title: 'Classement toxicologique & sécurité', fields: ['Classement', 'EPI exigés', 'Délai de rentrée', 'Conditionnement', 'Conditions de stockage'] },
      { title: 'Consignes', fields: ["Avant l'utilisation", "Lors de l'utilisation", 'Déchets', 'Remarques'] },
    ] },
  'LIS-ET-03': { kind: 'form', screen: 'etude/plant-species/[id]/page.tsx',
    sections: [
      { title: 'Caractéristiques', fields: ['Caduque', 'Toxique', 'Épines', 'Fleurs', 'Couleur de fleur', 'Période de floraison', 'Fruits', 'Période de fructification'] },
      { title: 'Plantation & entretien', fields: ['Hauteur adulte', 'Diamètre adulte', 'Période de plantation', 'Type de sol', 'Exposition plantation', 'Exposition stockage', 'Environnement adapté', 'Maladies & insectes'] },
    ] },

  // Fiche de recueil des suggestions : formulaire propre, distinct du registre
  // d'ecoute des parties interessees auquel le releve l'avait rattachee.
  'FOR-MI-09': { kind: 'form', screen: 'stakeholders/suggestions/new/page.tsx',
    sections: [
      { title: 'Recueil', fields: ['Date', 'Département', 'Suggestion / Remontée'] },
    ] },

  // Check-list SME & SST : c'est une check-list, pas la liste de ses depots.
  // Les points de controle sont saisis par departement, donc non figes ici.
  'FOR-MI-12': { kind: 'checklist', screen: 'environment/hse-checklist/[id]/page.tsx',
    columns: ['Conformité', 'Observation'] },

  // Check-list du dossier de personnel : douze pieces exigees, reprises telles
  // quelles de l'ecran, puis les signatures.
  'FOR-RH-34': { kind: 'checklist', screen: 'rh/employees/[id]/checklist/page.tsx',
    columns: ['Fourni le', 'Observation'],
    items: [
      "Copie CIN",
      "Acte de naissance",
      "2 photos",
      "Bulletin N°3 (chefs de projet / jardiniers)",
      "Numéro CNSS",
      "RIB bancaire",
      "Certificat médical (si maladie chronique)",
      "Copies de diplômes",
      "Dernier bulletin de salaire",
      "Copie permis de conduire (si applicable)",
      "Attestation emploi précédent (si applicable)",
      "Contrat de travail signé",
    ] },

  // Demande de recrutement : le formulaire de demande, pas le suivi des postes.
  'FOR-RH-01': { kind: 'form', screen: 'rh/recruitment/new/page.tsx',
    sections: [
      { title: 'Identification', fields: ['Référence', "Date d'ouverture", 'Statut'] },
      { title: 'Poste demandé', fields: ['Intitulé du poste', 'Département demandeur', 'Supérieur hiérarchique', 'Statut proposé', 'Motif du recrutement'] },
      { title: 'Profil recherché', fields: ["Niveau d'études", 'Spécialité', "Durée d'expérience requise"] },
      { title: 'Contenu du poste', fields: ['Missions principales', 'Compétences requises', 'Notes'] },
    ] },

  // Fiche d'evaluation : les douze criteres notes, dans leurs trois rubriques.
  'FOR-RH-03': { kind: 'form', screen: 'rh/performance/[id]/page.tsx',
    sections: [
      { title: 'Identification', fields: ['Employé', "Date d'évaluation", 'Poste actuel', "Ancienneté dans l'entreprise", 'Ancienneté dans le poste'] },
      { title: 'Compétences techniques & présence', fields: ['Techniques de travail', 'Assiduité / Ponctualité'] },
      { title: 'Comportement & discipline', fields: ['Rigueur & organisation', 'Discipline', "Esprit d'amélioration", 'Respect SMQ', 'Analyse des risques'] },
      { title: 'Qualité & communication', fields: ['Qualité du travail', 'Communication', 'Travail en équipe', 'Management / encadrement', "Capacité d'apprentissage"] },
      { title: 'Commentaires', fields: ["Besoins exprimés par l'évalué", 'Objectifs pour la prochaine période', 'Remarques'] },
    ] },

  // Fiche de poste : la fiche elle-meme, pas l'annuaire des postes.
  'FOR-RH-08': { kind: 'form', screen: 'rh/job-positions/new/page.tsx',
    sections: [
      { title: 'Identification', fields: ['Code', 'Date de mise à jour', 'Intitulé du poste', 'Département', 'Supérieur hiérarchique'] },
      { title: 'Formation', fields: ['Formation initiale', 'Formation continue'] },
      { title: 'Contenu du poste', fields: ['Missions principales', 'Attributions'] },
      { title: 'Critères', fields: ['Critères indispensables', 'Critères souhaitables'] },
    ] },

  // Plan d'integration : le plan d'un stagiaire, pas la liste des plans.
  'PLA-RH-01': { kind: 'register', screen: 'rh/integration/[id]/page.tsx',
    columns: ['Thème / Activité', 'Responsable', 'Date prévue', 'Date réelle', 'Statut', 'Commentaire'] },

  // -- Les trois plans de management ------------------------------------------
  // L'ecran /admin/management-plan porte DEUX tableaux, un par document :
  //   1. la grille annuelle, semaine par semaine        -> PLA-MI-01
  //   2. le plan de communication                       -> PLA-MI-03
  //
  // Le second etait intitule « (PLA-MI-02) » a l'ecran. C'est une erreur
  // heritee du plan de construction (docs/superpowers/plans/
  // 2026-07-01-smq-integration.md), qui nommait le plan de communication
  // PLA-MI-02 dans son code alors que son propre script de seed — et le
  // registre 2025 — attribuent PLA-MI-02 aux « initiatives solidaires » et
  // PLA-MI-03 au « Plan de communication ». Le registre fait foi : le libelle
  // de l'ecran a ete corrige, pas le registre.
  //
  // PLA-MI-02 « Plan des initiatives solidaires » n'a aucun tableau sur cet
  // ecran : il est mis en oeuvre par /admin/rse/events, ou chaque initiative
  // est planifiee au moyen d'un assistant en cinq etapes. Sa maquette est
  // celle de cet assistant, plus bas.
  'PLA-MI-01': { kind: 'register', screen: 'management-plan/page.tsx',
    columns: ['Objectif / Action', 'Dépt', 'Responsable', 'Planification hebdomadaire (semaines 1 à 52)'] },

  'PLA-MI-03': { kind: 'register', screen: 'management-plan/page.tsx',
    columns: ['Direction', 'Sujet', 'Cible', 'Moyen', 'Fréquence', 'Responsable', 'Date prévue'] },

  // Plan des initiatives solidaires : une initiative se planifie par l'assistant
  // en cinq etapes de /admin/rse/events, dont les rubriques sont reprises ici.
  'PLA-MI-02': { kind: 'form', screen: 'components/rse/wizard',
    sections: [
      { title: 'Général', fields: ['Titre', 'Type', 'Date', 'Lieu', 'Coordinateur SOPAT', 'Partenariat RSE', 'Participants prévus', 'Notes'] },
      { title: 'Équipes', columns: ["Nom de l'équipe", "Chef d'équipe", 'Missions', 'Notes'] },
      { title: 'Logistique', columns: ['Article', 'Qté', 'Unité', 'Fournisseur', 'Coût (DT)'] },
      { title: 'Rétroplanning', columns: ['Description', 'Échéance', 'Statut', 'Notes'] },
      { title: 'Communication', columns: ["Description de l'action", 'Responsable'] },
    ] },

  // -- Documents vivant dans un conteneur -------------------------------------
  // Ces documents s'ouvrent dans l'onglet d'un projet ou d'une offre. Leur
  // maquette vient du composant qui represente LE DOCUMENT, jamais du tableau
  // du conteneur : reprendre celui-ci decrirait la liste des projets a la
  // place de la fiche.

  // Onglet Etudes du projet : deux tableaux, les documents recus puis le
  // suivi des phases d'etude.
  'FOR-ET-02': { kind: 'form', screen: 'projects/[id]/etudes/FicheProjetSection.tsx',
    sections: [
      { title: 'Documents reçus', columns: ['Document', 'Date de réception', 'Nécessaire', 'Observation'] },
      { title: "Phases d'étude", columns: ['Phase', 'Jours prévus', 'Jours réalisés', 'Avancement', 'Moyen validation', 'Date valid.', 'Observations'] },
    ] },

  'FOR-RE-03': { kind: 'register', screen: 'components/realisation/FicheEquipeSection.tsx',
    columns: ['Poste', 'Titulaire', 'Suppléant', 'Sous-traitant', 'Nom sous-traitant'] },

  'FOR-RE-04': { kind: 'form', screen: 'components/realisation/JournalChantierSection.tsx',
    sections: [
      { title: 'Journée', fields: ['Date', 'Chef de projet'] },
      { title: 'Déroulement', fields: ['Travaux du jour', 'Approvisionnement', 'Autres intervenants'] },
      { title: 'Constats', fields: ['Anomalie / Réclamation', 'Remarques (RMQ)', 'Ordre du jour (lendemain)'] },
    ] },

  // Les deux PV partagent le meme composant mais pas le meme en-tete : le
  // provisoire identifie le maitre d'ouvrage, le definitif le marche.
  'FOR-RE-05': { kind: 'form', screen: 'components/realisation/PvReceptionSection.tsx',
    sections: [
      { title: 'Identification', fields: ['Date du PV', "Maître d'ouvrage", 'Date démarrage', 'Date fin'] },
      { title: 'Réserves', columns: ['Désignation', 'Observations', 'Décision', 'Action', 'Responsable', 'Délai', 'Réserve'] },
      { title: 'Signataires', columns: ['Nom', 'Fonction', 'Organisme', 'Signature'] },
    ] },

  'FOR-RE-14': { kind: 'form', screen: 'components/realisation/PvReceptionSection.tsx',
    sections: [
      { title: 'Identification', fields: ['Date du PV', 'Titulaire du marché', "Délai d'exécution", 'Date approbation marché', 'Date début travaux'] },
      { title: 'Réserves levées', columns: ['Désignation', 'Observations', 'Décision', 'Action', 'Responsable', 'Délai', 'Réserve'] },
      { title: 'Signataires', columns: ['Nom', 'Fonction', 'Organisme', 'Signature'] },
    ] },

  'FOR-RE-13': { kind: 'register', screen: 'components/realisation/AttachementSection.tsx',
    columns: ['Désignation', 'Qté', 'Unité', 'Norme', 'Observation'] },

  'FOR-RE-15': { kind: 'register', screen: 'components/realisation/DecompteSection.tsx',
    columns: ['Désignation', 'Qté', 'Unité', 'Norme', 'P.U HTVA (DT)', 'Total HTVA (DT)', 'Observation'] },

  'PLA-RE-03': { kind: 'register', screen: 'components/realisation/PlanActionSection.tsx',
    columns: ['Code', 'Phase / Étape', 'Début prévu', 'Fin prévue', 'Début réel', 'Fin réelle', '%'] },

  'PLA-RE-05': { kind: 'form', screen: 'components/realisation/GanttSection.tsx',
    sections: [
      { title: 'Identification du planning', fields: ['Projet', 'Localisation', 'Project Manager', 'Date démarrage prév.', 'Date démarrage réel', 'Date fin prév.', 'Date fin réelle', 'Date mise à jour'] },
      { title: 'Phases', columns: ['Phase', 'Prévu (PR)', 'Réalisé (RE)'] },
    ] },

  // -- Entretien : onglet Entretien du projet ---------------------------------
  'PLA-RE-01': { kind: 'register', screen: 'components/entretien/AnnualPlanSection.tsx',
    columns: ['Mois', 'Fréquence', 'Jours/interv.', 'Nbre prévu', 'Nbre réalisé'] },

  'PLA-RE-04': { kind: 'register', screen: 'components/entretien/MonthlyPlanSection.tsx',
    columns: ['Tâches des interventions', 'Fourniture(s) / Équipement(s)', 'Fréquence', 'Prévu', 'Réalisé', 'Observation(s)'] },

  // -- Planning transversal ---------------------------------------------------
  'PLA-RE-02': { kind: 'register', screen: 'realisation/weekly-schedule/WeeklyScheduleClient.tsx',
    columns: ['Équipe / Projet', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Réalisé', 'Cause non-réal.'] },

  // -- Audits : formulaires de saisie ----------------------------------------
  'FOR-MI-13': { kind: 'form', screen: 'audits/AuditsClient.tsx',
    sections: [
      { title: 'Identification', fields: ['Auditeur', "Date de l'audit", 'Statut'] },
      { title: 'Processus audité', fields: ['Processus audité'] },
      { title: 'Constats', fields: ['Périmètre / Scope', 'Constats'] },
    ] },

  'FOR-MI-14': { kind: 'form', screen: 'audit-programs/AuditProgramsClient.tsx',
    sections: [
      { title: 'Département', fields: ['Titre du programme', 'Département', 'Statut'] },
      { title: 'Planification', fields: ['Auditeur', 'Responsable audité', 'Date prévue', 'Date réalisée', 'Début', 'Fin'] },
      { title: 'Référentiel', fields: ['Clauses ISO 9001 applicables', 'Documents de référence'] },
      { title: 'Agenda', fields: ['Notes'] },
    ] },

  // -- Le registre lui-meme ---------------------------------------------------
  // LIS-MI-01 est le document que cette page sert : ses colonnes sont celles
  // du tableau du registre.
  'LIS-MI-01': { kind: 'register', screen: 'documents/DocumentsClient.tsx',
    columns: ['Type', 'Processus', 'Code', 'Désignation', 'Version', 'Statut', 'Date', 'Classement', 'MDP', 'Observations'] },

  // -- Check-lists qualite de chantier ---------------------------------------
  // Les points de controle sont ceux que l'onglet Qualite du projet affiche
  // reellement : ils font partie du document, comme sur le formulaire papier.
  // Travaux Préliminaires — 10 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-07': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Installation du chantier conforme au plan",
      "Clôture et signalisation du chantier effectuées",
      "Piquetage et implantation vérifiés",
      "Nivellement du terrain exécuté",
      "Débroussaillage et nettoyage préliminaire",
      "Excavations et terrassements conformes aux plans",
      "Évacuation des déblais effectuée",
      "Essai du sol réalisé (si requis)",
      "Rapport géotechnique disponible",
      "Zone de stockage des matériaux délimitée",
    ] },
  // Réseaux & Maçonnerie — 10 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-08': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Tranchées pour réseaux d'irrigation réalisées",
      "Canalisation posée et jointée correctement",
      "Test étanchéité du réseau effectué",
      "Réseau électrique (éclairage) installé",
      "Remblaiement des tranchées conforme",
      "Fondations maçonnerie conformes aux plans",
      "Murs et ouvrages en béton coulés",
      "Dallages et allées réalisés",
      "Mobilier urbain ancré et fixé",
      "Inspection finale réseaux & maçonnerie",
    ] },
  // Plantations — 10 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-09': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Fosses de plantation dimensionnées selon espèces",
      "Substrat de plantation conforme aux spécifications",
      "Amendements organiques incorporés",
      "Arbres et arbustes plantés selon plan de masse",
      "Tuteurage des arbres effectué",
      "Espacement entre plants respecté",
      "Arrosage de reprise effectué après plantation",
      "Étiquetage des espèces réalisé",
      "Vérification du bon état sanitaire des plants",
      "PV de réception pépinière signé",
    ] },
  // Engazonnement — 8 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-10': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Préparation du sol (labour, scarification)",
      "Amendements et fertilisation du sol",
      "Nivellement et planage final",
      "Semis ou pose de gazon conforme aux specs",
      "Arrosage immédiat après pose",
      "Densité de semis respectée",
      "Espèces gazon conformes aux plans",
      "Zones d'engazonnement délimitées correctement",
    ] },
  // Matière Décorative — 8 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-11': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Graviers décoratifs posés selon plan",
      "Épaisseur de graviers conforme (5–10 cm)",
      "Géotextile posé sous les graviers",
      "Pierres décoratives positionnées selon plan",
      "Rocailles et murets décoratifs stabilisés",
      "Paillage organique appliqué autour des plants",
      "Conformité des teintes et granulométries",
      "Nettoyage final de la zone décorative",
    ] },
  // Fourniture des Plantes — 10 points de controle, repris tels quels de l'onglet Qualite du projet.
  'FOR-RE-12': { kind: 'checklist', screen: 'components/realisation/QualityChecklistSection.tsx',
    columns: ['Phase', 'Observation'],
    items: [
      "Bon de commande plantes émis",
      "Espèces livrées conformes au BPU",
      "Quantités livrées conformes au bon de commande",
      "Hauteur / calibre des plants conforme aux specs",
      "État sanitaire des plants vérifié à la livraison",
      "Étiquetage des espèces présent",
      "Motte intacte et bien hydratée",
      "Facture pépinière jointe",
      "Certificat phytosanitaire disponible (si requis)",
      "Bon de livraison signé par le chef de chantier",
    ] },
}

/** Plan type applique a un type de code, a defaut d'entree au catalogue. */
const PLAN_BY_TYPE: Record<string, string[]> = {
  PRC: PROCEDURE_PLAN,
  INS: INSTRUCTION_PLAN,
  ISN: INSTRUCTION_PLAN,
  PRS: PROCESS_PLAN,
  ORG: ORGANISATIONAL_PLAN,
}

export type ResolvedStructure = {
  structure: DocumentStructure
  /**
   * `true` quand la structure est le PLAN TYPE de la famille et non le releve
   * de ce document precis. L'ecran doit le dire, sans quoi le lecteur croirait
   * lire le sommaire reel de la procedure qu'il consulte.
   */
  isTypicalPlan: boolean
}

/**
 * Maquette d'un document du registre, ou `null` si elle n'a pas ete relevee.
 *
 * `null` est une reponse valable et voulue : mieux vaut afficher « structure
 * non decrite » que fabriquer un tableau vraisemblable et faux.
 */
export function resolveDocumentStructure(code: string): ResolvedStructure | null {
  const direct = CATALOGUE[code]
  if (direct) return { structure: direct, isTypicalPlan: false }

  const parsed = parseCode(code)
  const plan = parsed ? PLAN_BY_TYPE[parsed.type] : undefined
  if (plan) return { structure: { kind: 'sections', sections: plan }, isTypicalPlan: true }

  return null
}

/**
 * Une structure n'est proposee que pour un document effectivement mis en oeuvre.
 * Pour les autres, la page affiche « Non implemente » et son motif : montrer
 * une maquette y ferait croire a une implementation.
 */
export function hasOperationalImplementation(code: string): boolean {
  return (resolveIsoDocumentRoute(code)?.kind ?? 'reference') !== 'reference'
}
