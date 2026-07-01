/**
 * Import script: FOR-MI-05 Registre de suivi des NC, PNC et réclamations 2025
 * Imports all 47 NC records from the Excel register into the non_conformances table.
 * Run once: node scripts/import-nc-register.mjs
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const { Client } = pg

// Load DATABASE_URL from .env if not already in environment
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(process.cwd(), '.env')
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^DATABASE_URL=(.+)$/)
      if (m) { process.env.DATABASE_URL = m[1].trim(); break }
    }
  } catch { /* ignore if .env not found */ }
}

const DB_URL = process.env.DATABASE_URL
if (!DB_URL) throw new Error('DATABASE_URL environment variable is required')

// Admin user as system author for imported records
const SYSTEM_USER_ID = '8490ab62-a88e-4e00-8e17-a307922f9a40'

// ─── Column indices from the Excel (0-based) ─────────────────────────────────
// A=0  B=1  C=2  D=3  E=4  F=5  G=6  H=7  I=8  J=9  K=10 L=11 M=12 N=13 O=14
// P=15 Q=16 R=17 S=18 T=19 U=20 V=21 W=22 X=23 Y=24 Z=25 AA=26 AB=27 AC=28
// AD=29 AE=30 AF=31 AG=32 AH=33 AI=34 AJ=35 AK=36 AL=37 AM=38 AN=39 AO=40 AP=41 AQ=42 AR=43

// Row 12 (header): N° Fiche | Type de NC | Source de NC | Détecteur | Coordonnées | Processus rattaché |
//   Document de référence | Mois | Date | Identification de la NC | [merged] | [merged] |
//   Impact | [merged] | [merged] | Correction: Autorisation déroga | Rebut | Action(s) | [merged] |
//   Responsable(s) | Date(s) prévues | Date(s) réalisées | Etat d'avancement |
//   Analyse des causes | [merged] | [merged] |
//   Actions correctives: Action(s) | [merged] | Responsable(s) | Date(s) prévues | Date(s) réalisées | Etat d'avancement |
//   Date évaluation prévue | Date évaluation réalisée |
//   Réponse Client: Date(s) | Référence | Risque | Opportunité | [merged] |
//   Nécessité d'une deuxième AC | Date de clôture | [merged] | [merged] | [merged] | [merged]

function d(v) {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'string' && v.trim()) {
    const p = Date.parse(v)
    if (!isNaN(p)) return new Date(p)
  }
  return null
}

function str(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

function mapNcType(v) {
  if (!v) return null
  const s = v.toLowerCase()
  if (s.includes('technique')) return 'technique'
  if (s.includes('système') || s.includes('systeme') || s.includes('syst')) return 'systeme'
  if (s.includes('réclamation') || s.includes('reclamation')) return 'reclamation_client'
  if (s.includes('documentaire')) return 'documentaire'
  if (s.includes('audit')) return 'audit'
  return null
}

function mapNcSource(v) {
  if (!v) return null
  const s = v.toLowerCase()
  if (s.includes('audit')) return 'audit'
  if (s.includes('réclamation client') || s.includes('reclamation client')) return 'reclamation_client'
  if (s.includes('pi')) return 'reclamation_pi'
  if (s.includes('interne')) return 'interne'
  return null
}

function mapDept(v) {
  if (!v) return null
  const s = String(v).toUpperCase().trim()
  const validDepts = ['AC', 'CO', 'ET', 'MI', 'RE1', 'RE2', 'RH']
  if (validDepts.includes(s)) return s
  // Match process codes like MI1→MI, RE1→RE1
  if (s.startsWith('MI')) return 'MI'
  return null
}

function bool(v) {
  if (!v) return false
  return String(v).trim() === 'X'
}

function progressRatio(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (isNaN(n)) return null
  if (n > 1) return n / 100 // percentage
  return n
}

// All 47 NC rows extracted from the Excel file (rows 14–60)
// Format: [ficheNum, ncType, ncSource, detector, detectorEmail, dept, refDoc, month, date,
//          description, _k, _l, impact, _n, _o,
//          derogationAuth(X), rebut(X), immediateCorrection, _s, correctionResponsible, corrDeadlinePlan, corrDeadlineActual,
//          correctionProgress,
//          rootCause, _y, _z,
//          capaAction, _ab, capaResponsible, capaDeadlinePlan, capaDeadlineActual, capaProgress,
//          evalDatePlan, evalDateActual,
//          clientRespDate, clientRespRef, isRisk(X), isOpportunity(X), _am,
//          needsSecondCapa(X), closureDate, ...]
const NC_ROWS = [
  [1,'NC Technique','Interne','MAM','benhassineaymen@yahoo.com','RE2','NC N°1','Janvier',new Date('2025-01-04'),'Je vous remercie de bien vouloir préparer un devis pour le remplacement de 70 plants d\' Eugenia Etna Fire, afin qu\'il puisse être transmis au BMW.',null,null,'Insatisfaction du client, perte d\'image professionnelle',null,null,'X','X','Envoyer un devis de mise en forme du siège RE--083/20 du 17/01/2025',null,'RMI',new Date('2025-01-17'),new Date('2025-01-17'),1,'Absence d\'un plan de suivi phytosanitaire régulier et manque de procédure de réaction rapide en cas de dépérissement détecté\nManque de sensibilisation ou de formation des équipes sur les signes de dépérissement et les bonnes pratiques d\'entretien.',null,null,'Revoir le plan d\'entretien et renforcer le contrôle qualité des livraisons de végétaux',null,'RMI',new Date('2025-01-17'),new Date('2025-01-17'),1,new Date('2025-02-17'),new Date('2025-02-17'),'X','X','qualité du service','X',null,new Date('2025-02-17'),null,null,null,null],
  [2,'NC Technique','Interne','TEM','anis.aldebibi@gmail.com','RE1','NC N°2','Janvier',new Date('2025-01-15'),'Dégradation de l\'état des plantes du mur de GAT ASSURANCES',null,null,'Manque à gagner : le client a refusé de payer les factures d\'entretien des mois précédents',null,null,'X','X','Envoyer un devis de mise en forme du siège RE--030/20 du 15/01/2025\nArrachage d\'un Washingtonia filifera mort (faute du client)\nFourniture et pose de 60 Sedum pot 16\nFourniture de 7 sacs galet 20/40',null,'RMI',new Date('2025-01-15'),new Date('2025-01-15'),1,'Défaut d\'arrosage, absence de contrôle périodique, manque de maintenance préventive.',null,null,'Suivi hebdomadaire, vérification du système d\'irrigation et formation des équipes.',null,'MAM',new Date('2025-01-15'),new Date('2025-01-15'),1,new Date('2025-02-15'),new Date('2025-02-15'),'X','X','image client','X',null,new Date('2025-02-15'),null,null,null,null],
  [3,'NC Technique','Interne','MAM','benhassineaymen@yahoo.com','RE2','NC N°3','Février',new Date('2025-02-04'),'Nécessité de remplacement des plantes au niveau des projets hôtel RADISSON et villa Hate Kefi',null,null,'Risque d\'insatisfaction client et non-conformité esthétique.',null,null,'X','X','Livraison des plantes nécessaires\n6 Metrosideros (pot 24) pour l\'hôtel Radisson.\n6 Christmas (pot 35) pour la villa de M. Hatem Kafi.',null,'MAM',new Date('2025-02-04'),new Date('2025-02-04'),1,'Mauvais choix d\'espèces, irrigation insuffisante, absence de suivi post-plantation.',null,null,'Adapter le choix des espèces, établir un suivi post-plantation.',null,'MAM',new Date('2025-02-04'),new Date('2025-02-04'),1,new Date('2025-02-04'),new Date('2025-02-04'),'X','X','satisfaction client','X','X',new Date('2025-02-04'),null,null,null,null],
  [4,'NC Technique','Interne','MAM','benhassineaymen@yahoo.com','RE2','NC N°4','Mars',new Date('2025-03-25'),'Anomalies au niveau de l\'arrosage à la Villa Walid Sfia : l\'eau n\'atteint pas le centre de la pelouse et stagnation dans les coins.',null,null,'Dégradation du gazon, coût de réparation et risque d\'insatisfaction client.',null,null,'X','X','Envoyer un mail au MAM pour intervenir pour le réglage et repositionnement des arroseurs.',null,'RMI',new Date('2025-03-27'),new Date('2025-03-27'),1,'Mauvais réglage des arroseurs, absence de vérification.\nManque de communication entre l\'équipe.',null,null,'Suivi hebdomadaire, vérification du système d\'irrigation et formation des équipes.',null,'MAM',new Date('2025-03-27'),new Date('2025-03-27'),1,new Date('2025-03-27'),new Date('2025-03-27'),'X','X','qualité du service','X','X',new Date('2025-03-27'),null,null,null,null],
  [5,'NC Technique','Interne','MAM','benhassineaymen@yahoo.com','RE2','NC N°5','Mars',new Date('2025-03-25'),'Retard de 2 semaines dans l\'intervention pour résoudre le problème d\'arrosage BMW signalé par M. Sofien.',null,null,'Dégradation du site, mécontentement client, perte de crédibilité.\nRisque d\'incident matériel et de baisse de performance.',null,null,'X','X','Répondre au mail du MAM pour intervention corrective immédiate.\nIntervention de réparation du système d\'arrosage de BMW.',null,'RMI',new Date('2025-03-25'),new Date('2025-03-25'),1,'Manque de planification et de suivi des demandes.',null,null,'Sensibilisation de l\'équipe sur l\'importance de la communication directe et efficace.',null,'RMI',new Date('2025-04-01'),new Date('2025-04-08'),1,new Date('2025-04-10'),new Date('2025-04-10'),'X','X','relation client','X','X',new Date('2025-04-10'),null,null,null,null],
  [6,'NC Technique','Interne','TEM','anis.aldebibi@gmail.com','RE2','NC N°6','Avril',new Date('2025-04-08'),'Réclamation de la directrice de l\'hôtel Radisson concernant l\'état du jardin : manque d\'entretien, végétation en mauvais état.',null,null,'Image négative et risque contractuel.',null,null,'X','X','Communiquer avec le MAM pour comprendre la situation et inspection complète du site et passage d\'entretien en urgence.',null,'RMI',new Date('2025-04-08'),new Date('2025-04-08'),1,'Suivi de maintenance insuffisant, manque de supervision.',null,null,'Renforcer la fréquence des contrôles et reporting terrain.',null,'MAM',new Date('2025-04-14'),new Date('2025-04-14'),1,new Date('2025-04-14'),new Date('2025-04-14'),'X','X','satisfaction client','X','X',new Date('2025-04-14'),null,null,null,null],
  [7,'NC Technique','Interne','TEM','anis.aldebibi@gmail.com','RE2','NC N°7','Avril',new Date('2025-04-15'),'Réclamation de M. Ahmed (Gat Assurance) : aucune intervention n\'a été réalisée dans la zone du sous-sol lors du passage de l\'équipe.',null,null,'Non-respect des engagements, perte de confiance client.',null,null,'X','X','Communiquer avec le MAM pour comprendre la situation et confirmer l\'intervention réalisée.',null,'RMI',new Date('2025-04-15'),new Date('2025-04-16'),1,'Communication et planification défaillantes.',null,null,'Améliorer la communication équipe–superviseur et les checklists d\'intervention.',null,'MAM',new Date('2025-04-16'),new Date('2025-04-16'),1,new Date('2025-04-16'),new Date('2025-04-16'),'X','X','satisfaction client','X','X',new Date('2025-04-16'),null,null,null,null],
  [8,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE1','NC N°8','Mai',new Date('2025-05-29'),'Le processus de réalisation et entretien PRS-RE-01 ne dispose pas d\'un planning documenté, défini et mis en œuvre, conformément aux exigences de la norme ISO 9001:2015.',null,null,'L\'absence de planification formelle rend les activités de réalisation et d\'entretien vulnérables à des retards, des oublis ou des ressources mal allouées.',null,null,'X','X','Élaborer un modèle de planning opérationnel et intégration du document dans le processus PRS-RE-01.',null,'RMI','S3 Juin 2025',new Date('2025-06-19'),1,'1) Absence d\'une procédure interne imposant la planification formelle du processus.\n2) Méconnaissance des exigences normatives liées à la planification des activités.\n3) Manque d\'outil ou de modèle standardisé pour structurer le suivi du processus.',null,null,'Intégrer le planning dans le SMQ avec validation hiérarchique.',null,'PRM Grand Tunis\nPRM Nabeul',new Date('2025-07-15'),new Date('2025-07-15'),1,'A la revue de direction',null,'X','X','Non-conformité par rapport à ISO 9001 V2015','X',null,null,null,null,null,null],
  [9,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE1','NC N°9','Mai',new Date('2025-05-29'),'Le processus de réalisation et entretien PRS-RE-01 ne garantit pas une revue systématique des changements à « projet one resort ».',null,null,'L\'absence de revue systématique des changements entraîne une mise en œuvre non contrôlée des modifications.',null,null,'X','X','Définir une procédure de gestion des modifications dans le processus et création de formulaire de revue et de validation des modifications.',null,'RMI','S3 Juin 2025',new Date('2025-06-20'),1,'1) Absence de procédure ou d\'instruction définissant la gestion des modifications.\n2) Culture opérationnelle de gestion des changements "informelle", sans validation formelle.\n3) Manque de sensibilisation sur les risques liés aux modifications non contrôlées.',null,null,'Vérification de la traçabilité et de l\'analyse d\'impact des modifications dans les projets.',null,'RMI',new Date('2025-08-13'),new Date('2025-08-13'),1,'A la revue de direction',null,'X','X','Faiblesse de gestion de projet','X',null,null,null,null,null,null],
  [10,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE2','NC N°10','Mai',new Date('2025-05-29'),'Les actions préventives relatives à la tondeuse à gazon sont planifiées au niveau de l\'instruction de travail (INS-MI-21), cependant aucune preuve de réalisation n\'a pas été démontrée.',null,null,'Risque de pannes imprévues de la tondeuse à gazon, perturbe la continuité des travaux.',null,null,'X','X','Révision de l\'instruction et la diffuser aux concernés.',null,'RMI','S1 Juin 2025',new Date('2025-08-14'),1,'1) Manque de planification systématique du suivi et du contrôle de ces actions par un responsable identifié.\n2) Habitude de réaliser l\'entretien de manière informelle, sans formaliser la preuve.',null,null,'Formation et sensibilisation de l\'équipe.',null,'RMI','Après la diffusion de l\'instruction',null,null,null,null,'X','X','performance équipement',null,null,null,null,null,null,null],
  [11,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE2','NC N°11','Mai',new Date('2025-05-29'),'Lors de la revue de l\'instruction de travail « Usage phytosanitaire », il est spécifié que les résidus et emballages de produits phytosanitaires doivent être « jetés dans des sacs poubelles ».',null,null,'Non respect des exigences de la norme ISO 14001 V 2015.',null,null,'X','X','Réviser l\'instruction de travail pour modifier le point « Jeter les flacons vides dans des boîtes en bois ».',null,'RMI',new Date('2025-05-29'),new Date('2025-05-29'),1,'Mauvaise interprétation des instructions.',null,null,'Mettre en place une gestion conforme (collecte sécurisée et prestataire agréé).',null,null,null,null,null,null,null,'X','X','environnemental',null,null,null,null,null,null,null],
  [12,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE1','NC N°12','Mai',new Date('2025-05-29'),'Renforcer le processus réalisation et entretien par des indicateurs mesurables associées à réalisation du planning dans les délais.',null,null,'Difficulté à évaluer la performance du processus.',null,null,'X','X','Définir des indicateurs qualité.',null,'RMI + Concernés','Réunion du groupe',null,null,'Objectifs non définis.',null,null,'Intégrer les nouveaux indicateurs dans le tableau de bord de suivi.',null,'RMI','Réunion du groupe',null,null,null,null,'X','X','X','A améliorer',null,null,null,null,null,null],
  [13,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE2','NC N°13','Mai',new Date('2025-05-29'),'Il n\'existe pas de liste exhaustive et actualisée de l\'ensemble du matériel utilisé pour les opérations d\'entretien et d\'aménagement paysager.',null,null,'Manque de traçabilité et de maîtrise des équipements.',null,null,'X','X','Créer un inventaire complet.',null,'RMI',new Date('2025-06-30'),new Date('2025-06-30'),1,'Données non centralisées.',null,null,'Élaborer et tenir à jour un registre matériel + état.',null,'MAM','A partir de juillet 2025',new Date('2025-08-21'),1,new Date('2025-09-21'),new Date('2025-09-21'),'X','X','performance opérationnelle',null,null,new Date('2025-09-21'),null,null,null,null],
  [14,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE2','NC N°14','Mai',new Date('2025-05-29'),'Il est recommandé de maîtriser la gestion de maintenance curative des équipements (demande d\'intervention, actions, temps d\'intervention, réception après intervention).',null,null,'Retards et manque de réactivité.',null,null,'X','X','Créer un inventaire complet et registre de maintenance curative.',null,'RMI',new Date('2025-06-30'),new Date('2025-06-30'),1,'Données non centralisées.',null,null,'Élaborer et tenir à jour un registre matériel + état.',null,'MAM','A partir de juillet 2025',new Date('2025-08-21'),1,new Date('2025-09-21'),new Date('2025-09-21'),'X','X','maintenance',null,null,new Date('2025-09-21'),null,null,null,null],
  [15,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RE2',null,'Mai',new Date('2025-05-29'),'Il est recommandé de renforcer les Bonnes Pratiques Environnementales pour la Gestion des Pesticides et Phytosanitaires sur Chantier.',null,null,'Risque d\'impact environnemental et d\'image\nNon respect des exigences de la norme ISO 14001 V 2015.',null,null,'X','X','Mise à jour des pratiques et sensibilisation.',null,'RMI','Réunion du groupe',null,null,'Formation et sensibilisation insuffisantes.',null,null,'Accentuer la sensibilisation et la formation des personnels.',null,null,null,null,null,null,null,'X','X','environnemental',null,null,null,null,null,null,null],
  [16,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°16','Mai',new Date('2025-05-29'),'L\'action de formation « Métiers et techniques » a été réalisée conformément au planning de formation, cependant l\'évaluation à chaud de l\'action de formation n\'est pas réalisée.',null,null,'Difficulté à prouver l\'efficacité de la formation.',null,null,'X','X','Réaliser l\'évaluation à chaud et à froid.',null,'RMI',new Date('2025-06-02'),new Date('2025-06-02'),1,'Processus d\'évaluation non appliqué.',null,null,'Sensibilisation de la direction de l\'importance de l\'évaluation après la formation.',null,'RMI',new Date('2025-06-02'),new Date('2025-06-02'),1,'Lors de la prochaine formation',null,'X','X','compétence',null,null,new Date('2025-06-02'),null,null,null,null],
  [17,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°17','Mai',new Date('2025-05-29'),'Les preuves de l\'existence de dispositifs de reconnaissance et de valorisation du personnel sont limitées.',null,null,'Démotivation, faible engagement social.',null,null,'X','X','Mettre en place un système de valorisation.',null,'DG',null,null,null,'Manque d\'initiatives documentées.',null,null,'Élaborer un programme de reconnaissance interne (feedback, primes).',null,'DG',null,null,null,null,null,'X','X','X','performance sociale',null,null,null,null,null,null],
  [18,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°18','Mai',new Date('2025-05-29'),'SOPAT ne dispose pas d\'une grille de polyvalence permettant de déterminer, maintenir et démontrer les compétences nécessaires du personnel ayant une incidence sur la performance qualité ou environnementale.',null,null,'Difficulté à démontrer les compétences disponibles.',null,null,'X','X','Créer une grille de polyvalence.',null,'RMI',new Date('2025-11-01'),new Date('2025-11-10'),0.7,'Processus RH incomplet.',null,null,'Cartographier les compétences et actualiser périodiquement.',null,null,null,null,null,null,null,'X','X','stratégique RH','X',null,null,null,null,null,null],
  [19,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°19','Mai',new Date('2025-05-29'),'Le processus de recrutement interne du poste de "Chef du département Etude" n\'a pas démontré une application systématique des principes RSE.',null,null,'Atteinte à l\'équité interne et image RSE.',null,null,'X','X','Mise à jour du processus RH.',null,'RMI',new Date('2025-11-01'),new Date('2025-11-10'),1,'Communication insuffisante.',null,null,'Garantir transparence et égalité d\'accès aux postes.',null,'DG','A la prochaine session de recrutement de 2026',null,null,null,null,'X','X','RSE / opportunité',null,null,null,null,null,null,null],
  [20,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°20','Mai',new Date('2025-05-29'),'Il a été constaté que les fiches de fonction ne définissent pas clairement les responsabilités et autorités des fonctions concernées en matière de performance environnementale.',null,null,'Ambiguïté dans la responsabilité environnementale.',null,null,'X','X','Réviser les fiches de fonction.',null,'RMI',new Date('2025-11-01'),new Date('2025-11-07'),0.4,'Fiches de poste non mises à jour.',null,null,'Ajouter responsabilités qualité/environnement et validation RH.',null,'DG',null,null,null,null,null,'X','X','conformité environnementale',null,null,null,null,null,null,null],
  [21,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','RH','NC N°21','Mai',new Date('2025-05-29'),'SOPAT a obtenu un label RSE, cependant l\'entreprise ne mène pas d\'enquêtes de satisfaction du personnel.',null,null,'Manque de données objectives sur le climat social, le bien-être et la motivation du personnel.',null,null,'X','X','Mettre en place et administrer périodiquement une enquête de satisfaction du personnel.',null,'RMI',null,null,null,'Omission de cette exigence dans la planification RSE et absence de responsable désigné pour son suivi.',null,null,'1. Élaborer un questionnaire d\'évaluation du personnel.\n2. Planifier une enquête annuelle.\n3. Désigner un responsable RSE pour le suivi.\n4. Analyser et exploiter les résultats pour l\'amélioration continue.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [22,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','AC','NC N°22','Mai',new Date('2025-05-29'),'Il a été constaté que le processus de contrôle à la réception n\'est pas appliqué de manière systématique.',null,null,'Risque de réception de produits non conformes pouvant altérer la qualité du service et la satisfaction client.',null,null,'X','X','Appliquer systématiquement la procédure de contrôle à la réception.',null,'Equipe réalisation et entretien','Lors de la réception des plantes',null,1,'Manque de formation et de supervision du personnel chargé du contrôle.',null,null,'1. Sensibiliser le personnel sur les exigences de la procédure.\n2. Mettre en place un suivi systématique avec fiches de contrôle.\n3. Réaliser des audits internes ciblés.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [23,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','AC','NC N°23','Mai',new Date('2025-05-29'),'Non application de la procédure achat lors de la sélection d\'un nouveau fournisseur.',null,null,'Risque d\'intégration de fournisseurs non qualifiés pouvant impacter la qualité et la conformité des prestations.',null,null,'X','X','Appliquer strictement la procédure d\'achat et de sélection.',null,'Responsable achat','Après les audits',null,1,'Manque de rigueur dans l\'application du processus achat et absence de validation formelle.',null,null,'1. Former le personnel sur la procédure achat.\n2. Mettre en place un contrôle de validation avant tout engagement fournisseur.\n3. Réaliser un audit achat annuel.',null,'RMI',new Date('2025-09-01'),new Date('2025-09-17'),1,new Date('2025-09-17'),new Date('2025-09-17'),null,null,null,null,null,new Date('2025-09-17'),null,null,null,null],
  [24,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','AC','NC N°24','Mai',new Date('2025-05-29'),'L\'organisme a recours à un prestataire de service "transporteur" pour des activités ayant une incidence sur la qualité de service sans avoir un contrat ou une convention formalisée.',null,null,'Risque de non-conformité contractuelle et environnementale pouvant nuire à la qualité du service.',null,null,'X','X','Établir un contrat définissant responsabilités et critères de contrôle, et sensibiliser le prestataire.',null,'DG et concernés',null,null,null,'Absence de procédure de contractualisation des prestataires externes.',null,null,'1. Formaliser les contrats avec tous les prestataires.\n2. Intégrer les clauses environnementales.\n3. Organiser une session de sensibilisation.',null,'DG',null,null,null,null,null,'X','X',null,null,null,null,null,null,null,null],
  [25,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','AC','NC N°25','Mai',new Date('2025-05-29'),'Les prestataires de services notamment ceux des pépinières et ceux de l\'entretien des véhicules sont évalués selon des critères bien définis. Il est recommandé de mettre en œuvre un programme structuré de sensibilisation.',null,null,'Manque d\'alignement entre les pratiques des prestataires et les objectifs qualité/environnement SOPAT.',null,null,'X','X','Mettre en œuvre un programme de sensibilisation et d\'engagement des prestataires.',null,'DG et concernés','Stratégie 2026',null,null,'Absence de plan de communication externe dans le système QSE.',null,null,'1. Élaborer un plan annuel de sensibilisation.\n2. Inclure les prestataires dans les réunions qualité.\n3. Évaluer périodiquement leur engagement.',null,'DG',null,null,null,null,null,'X','X','X',null,null,null,null,null,null,null],
  [26,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','AC','NC N°26','Mai',new Date('2025-05-29'),'Pour garantir l\'efficacité de l\'évaluation des fournisseurs et la bonne application des critères établis, il est essentiel de renforcer les processus existants et de définir clairement les responsabilités.',null,null,'Risque de mauvaise évaluation des fournisseurs entraînant une baisse de la qualité et de la conformité.',null,null,'X','X','Revoir la procédure d\'évaluation et clarifier les rôles et responsabilités.',null,'RMI',new Date('2025-09-01'),new Date('2025-09-17'),1,'Manque de définition claire des responsabilités et d\'outils d\'évaluation standardisés.',null,null,'Mettre à jour la procédure d\'évaluation des fournisseurs et former les responsables concernés.',null,'RMI',new Date('2025-09-01'),new Date('2025-09-17'),1,new Date('2025-09-17'),new Date('2025-09-17'),'X','X',null,'X',null,new Date('2025-09-17'),null,null,null,null],
  [27,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°27','Mai',new Date('2025-05-30'),'SOPAT ne démontre pas une maîtrise adéquate de ses systèmes informatiques et de la gestion de son parc de PC.',null,null,'Risque d\'interruption d\'activité et perte de données impactant la performance globale.',null,null,'X','X','Élaborer un planning de maintenance et un inventaire à jour du matériel informatique.',null,'RMI',new Date('2025-06-30'),new Date('2025-06-30'),1,'Absence de procédures formalisées et de suivi régulier.',null,null,'Mettre en place un plan de maintenance préventive et curative pour les PC et systèmes.',null,'RMI','A partir de juillet 2025',new Date('2025-08-21'),1,new Date('2025-09-21'),new Date('2025-09-21'),'X','X',null,'X',null,new Date('2025-09-21'),null,null,null,null],
  [28,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°28','Mai',new Date('2025-05-30'),'Lors de l\'examen du processus management Intégré, il a été constaté que l\'analyse des changements n\'est pas maîtrisée.',null,null,'Risque de dérive de la qualité des services et insatisfaction client.',null,null,'X','X','Mettre en place un registre des changements avec validation systématique.',null,'RMI','S3 Juin 2025',new Date('2025-06-20'),1,'Manque de procédure claire pour la revue et l\'approbation des changements.',null,null,'Formaliser une procédure de gestion des changements et sensibiliser le personnel.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [29,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°29','Mai',new Date('2025-05-30'),'SOPAT n\'a pas démontré la mise en œuvre d\'une procédure de préparation et de réponse aux situations d\'urgence tel qu\'exigé par la clause 8.2 de l\'ISO 14001:2015.',null,null,'Risque de non-conformité réglementaire et impact environnemental non maîtrisé.',null,null,'X','X','Élaborer et tester une procédure de gestion des urgences environnementales.',null,null,null,null,null,'Absence de documentation et d\'exercices de simulation enregistrés.',null,null,'Mettre en œuvre et documenter les simulations d\'urgence.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [30,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°30','Mai',new Date('2025-05-30'),'Lors de l\'examen de la procédure de gestion des réclamations clients, les causes de la réclamation client du siège BTE n\'ont pas été identifiées et enregistrées.',null,null,'Risque de récurrence du problème et d\'insatisfaction client accrue.',null,null,'X','X','Identifier et enregistrer les causes et actions correctives pour chaque réclamation.',null,'RMI','A partir du 30/05/2025','A partir du 30/05/2025',1,'Absence de formalisation et de suivi des réclamations.',null,null,'Renforcer la procédure de gestion des réclamations (PRC-MI-06).',null,'RMI','A partir du 30/05/2025','A partir du 30/05/2025',1,'A la prochaine NC',new Date('2025-07-10'),'X','X',null,'X',null,new Date('2025-07-10'),null,null,null,null],
  [31,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°31','Mai',new Date('2025-05-30'),'L\'enjeu du changement climatique n\'est pas identifié. Il est toutefois recommandé d\'améliorer les risques et les opportunités qui en découlent.',null,null,'Opportunité d\'améliorer la durabilité et la performance environnementale.',null,null,'X','X','Intégrer le changement climatique dans l\'analyse du contexte et des risques.',null,null,null,null,null,'Omission de l\'enjeu climatique dans le système de management.',null,null,'Mettre à jour l\'analyse des risques et opportunités pour inclure le changement climatique.',null,null,null,null,null,null,null,'X','X','X',null,null,null,null,null,null,null],
  [32,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°32','Mai',new Date('2025-05-30'),'SOPAT ne dispose pas d\'enquête de satisfaction pour recueillir et analyser la perception du client concernant la satisfaction de ses besoins et attentes.',null,null,'Risque de méconnaissance des attentes clients et de baisse de satisfaction.',null,null,'X','X','Mise à jour de l\'enquête de satisfaction client.',null,'RMI',new Date('2025-06-05'),new Date('2025-06-05'),1,'Absence d\'un processus structuré de collecte de feedback.',null,null,'Diffuser l\'enquête de satisfaction client d\'une manière systématique.',null,'RMI','A partir de 2026',null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [33,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°33','Mai',new Date('2025-05-30'),'La réponse au client siège BTE a été réalisée, cependant le délai de réponse concernant ces réclamations clients n\'est pas prévu lors de la description des activités de la procédure « Traitement des NC et réclamations » (PRC-MI-06).',null,null,'Risque de retard dans le traitement et d\'insatisfaction client.',null,null,'X','X','Mettre à jour la procédure pour intégrer des délais de traitement.',null,'RMI',null,null,null,'Manque de définition temporelle dans la procédure.',null,null,'Intégrer des délais standards selon le niveau de gravité de la réclamation.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [34,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°34','Mai',new Date('2025-05-30'),'Le registre déchets ANGED n\'est pas complètement renseigné.',null,null,'Risque de non-conformité réglementaire et d\'audit environnemental défavorable.',null,null,'X','X','Compléter et vérifier régulièrement le registre déchets.',null,'RMI','A partir de 2026',null,null,'Absence de suivi systématique du remplissage du registre.',null,null,'Mettre en place un contrôle périodique du registre ANGED.',null,'RMI','A partir de 2026',null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [35,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°35','Mai',new Date('2025-05-30'),'SOPAT n\'a pas mis à jour son analyse des risques et opportunités pour prendre en considération l\'impact de la nouvelle réglementation interdisant le recours aux sociétés d\'intérim.',null,null,'Risque de pénurie de main-d\'œuvre et non-conformité légale.',null,null,'X','X','Actualiser l\'analyse des risques et opportunités.',null,'RMI','S2 Décembre 2025',null,null,'Manque de veille réglementaire proactive.',null,null,'Mettre à jour la matrice des risques RH et adapter la stratégie de recrutement.',null,'S2 Décembre 2025',null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [36,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°36','Mai',new Date('2025-05-30'),'La planification actuelle des audits (PLA-MI-01) ne reflète pas de manière adéquate l\'importance et la criticité de certains processus clés au sein de SOPAT.',null,null,'Risque de non-détection des écarts majeurs et d\'inefficacité du SMQ.',null,null,'X','X','Réviser le plan d\'audit selon le niveau de risque et d\'importance des processus.',null,'RMI','S2 Novembre 2025',null,null,'Planification basée uniquement sur la fréquence et non la criticité.',null,null,'Appliquer une approche basée sur les risques pour la planification des audits.',null,'S2 Novembre 2025',null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [37,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°37','Mai',new Date('2025-05-30'),'Il est recommandé d\'ajouter à la compréhension du contexte les aspects suivants : contexte concurrentiel (régional, national et international) et veille technologique.',null,null,'Opportunité d\'amélioration stratégique et d\'innovation.',null,null,'X','X','Mettre à jour l\'analyse du contexte pour inclure la veille et la concurrence.',null,'RMI','Après la revue de direction',null,null,'Manque d\'approche prospective dans le management stratégique.',null,null,'Intégrer la veille concurrentielle et technologique dans la revue de direction.',null,'Après la revue de direction',null,null,null,null,null,'X','X','X',null,null,null,null,null,null,null],
  [38,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°38','Mai',new Date('2025-05-30'),'Il est recommandé de scinder les processus de pilotage en 2 processus : pilotage stratégique et pilotage organisationnel.',null,null,'Risque de confusion des rôles et de perte d\'efficacité managériale.',null,null,'X','X','Scinder le processus de pilotage en deux volets distincts.',null,'DG','Après la revue de direction',null,null,'Structure managériale non segmentée entre vision stratégique et opérationnelle.',null,null,'Créer deux processus : Pilotage stratégique et Pilotage organisationnel.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [39,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','MI1','NC N°39','Mai',new Date('2025-05-30'),'Les exigences du chapitre 6.1 sont conformes. L\'identification des aspects environnementaux AES spécifiques a été réalisée. Il est toutefois recommandé d\'améliorer ces actions pour une bonne maîtrise des AES.',null,null,'Opportunité d\'améliorer la maîtrise environnementale.',null,null,'X','X','Renforcer le suivi et la documentation des AES.',null,'RMI','S1 Novembre 2025',null,null,'Suivi insuffisant des actions associées aux AES.',null,null,'Mettre à jour le plan de gestion environnementale avec indicateurs.',null,'S1 Novembre 2025',null,null,null,null,null,'X','X','X',null,null,null,null,null,null,null],
  [40,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','CO','NC N°40','Mai',new Date('2025-05-30'),'Le résultat d\'analyse de l\'offre « SUZUKI » a été enregistré sur le FOR-CO-01, cependant aucune traçabilité concernant l\'étude de l\'offre « SUZUKI ». L\'absence d\'étude de faisabilité ne permet pas d\'évaluer la viabilité technique, économique et organisationnelle des projets.',null,null,'Risque d\'erreurs et de non-conformité dans les décisions commerciales.',null,null,'X','X','Formaliser l\'étude de faisabilité standardisée.',null,null,null,null,null,'Absence de processus d\'évaluation structuré avant décision.',null,null,'Créer un modèle d\'étude technique et économique à archiver systématiquement.',null,null,null,null,null,null,null,'X','X','Risque',null,null,null,null,null,null,null],
  [41,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','CO','NC N°41','Mai',new Date('2025-05-30'),'Le bon de commande du projet SUZUKI ne prévoit pas le délai de livraison du service client SUZUKI, Bon de commande Réf RE-008/25 du 21/02/2025.',null,null,'Risque de litige client et de non-respect des engagements contractuels.',null,null,'X','X','Inclure systématiquement un délai contractuel dans les bons de commande.',null,null,null,null,null,'Omission du champ délai dans le modèle de bon de commande.',null,null,'Mettre à jour le modèle FOR-CO-01 et sensibiliser le service commercial.',null,null,null,null,null,null,null,'X','X',null,null,null,null,null,null,null,null],
  [42,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','ET','NC N°42','Mai',new Date('2025-05-30'),'La détermination des éléments d\'entrée de la conception est partiellement efficace. Les conséquences des défaillances potentielles et les exigences légales et réglementaires applicables ne sont pas déterminées de façon appropriée.',null,null,'Risque de défaillances techniques et de non-conformité réglementaire.',null,null,'X','X','Compléter les exigences techniques, légales et de risques avant conception.',null,null,null,null,null,'Analyse incomplète lors des études préliminaires.',null,null,'Mettre en place une check-list de validation des entrées de conception.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [43,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','ET','NC N°43','Mai',new Date('2025-05-30'),'Afin de renforcer la fiabilité et la traçabilité des études réalisées, il est recommandé de systématiser la validation interne à chaque étape clé du processus d\'étude.',null,null,'Risque d\'erreur non détectée avant exécution des projets.',null,null,'X','X','Documenter la validation à chaque étape du processus.',null,null,null,null,null,'Absence de traçabilité des vérifications internes.',null,null,'Introduire un formulaire de validation et signature interne.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [44,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','ET','NC N°44','Mai',new Date('2025-05-30'),'Afin d\'améliorer la visibilité et la traçabilité de l\'avancement de chaque projet d\'étude, il est recommandé de développer et de mettre en œuvre un tableau de bord ou un outil de gestion de projet.',null,null,'Risque de manque de visibilité et de retard non anticipé.',null,null,'X','X','Développer un tableau de bord de suivi des études.',null,null,null,null,null,'Suivi des projets non centralisé ni visualisé.',null,null,'Créer un outil numérique de suivi des tâches et jalons.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [45,'NC système','Audit','Auditeur','hdsmidaby@gmail.com','ET','NC N°45','Mai',new Date('2025-05-30'),'Pour une meilleure efficacité du processus étude, il est recommandé d\'ajouter un indicateur concernant le nombre de projets validés en interne par rapport aux nombre total de projets réalisés.',null,null,'Risque de non-évaluation de l\'efficacité du processus.',null,null,'X','X','Ajouter un indicateur de performance interne.',null,null,null,null,null,'Suivi de performance partiel.',null,null,'Intégrer un KPI : % projets validés / projets réalisés.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [46,'NC Technique','Interne','PRM',null,'RE2','NC N°46','Juillet',new Date('2025-07-10'),'Dégradation de l\'état des plantes du centre de formation de BIAT à cause d\'un colmatage au niveau du système d\'arrosage.',null,null,'Risque de détérioration esthétique et financière du site.',null,null,'X','X','Nettoyer et contrôler le système d\'arrosage.',null,null,null,null,null,'Absence de maintenance préventive du réseau d\'irrigation.',null,null,'Planifier un entretien régulier et former le personnel technique.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
  [47,'NC Technique','Réclamation Client','Responsable SUZUKI','Mg.Carpro@utic.com.tn','RE2','NC N°47','Juillet',new Date('2025-07-19'),'Mécontentement concernant l\'état des zones vertes du siège El Kram de SUZUKI : manque d\'entretien, non-respect du nombre de passages par semaine, mauvaises herbes, rosiers non taillés, plantes sèches.',null,null,'Risque d\'insatisfaction client et de perte de contrat.',null,null,'X','X','Planifier des passages conformes et renforcer le suivi qualité.',null,null,null,null,null,'Suivi insuffisant du planning et communication défaillante.',null,null,'Mettre en place un contrôle qualité régulier et une supervision accrue.',null,null,null,null,null,null,null,'X','X',null,'X',null,null,null,null,null,null],
]

// Map dept codes — MI1 is used in Excel but our enum only has MI
function normDept(v) {
  if (!v) return null
  const s = String(v).toUpperCase().replace(/\s/g,'')
  if (s === 'MI1' || s === 'MI2') return 'MI'
  const valid = ['AC','CO','ET','MI','RE1','RE2','RH']
  return valid.includes(s) ? s : null
}

async function run() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  // Check for existing records to avoid duplication
  const existing = await client.query('SELECT nc_fiche_num FROM non_conformances WHERE nc_fiche_num IS NOT NULL')
  const existingNums = new Set(existing.rows.map(r => Number(r.nc_fiche_num)))
  console.log(`Already imported: ${existingNums.size} records`)

  let inserted = 0
  let skipped = 0

  for (const row of NC_ROWS) {
    const ficheNum = row[0]
    if (existingNums.has(ficheNum)) {
      console.log(`  Skip N°${ficheNum} (already exists)`)
      skipped++
      continue
    }

    const ncType   = mapNcType(row[1])
    const ncSource = mapNcSource(row[2])
    const detector = str(row[3])
    const detEmail = str(row[4])
    const dept     = normDept(row[5])
    const refDoc   = str(row[6])
    const month    = str(row[7])
    const detDate  = d(row[8]) ?? new Date()
    const desc     = str(row[9]) ?? 'NC importée depuis FOR-MI-05'
    const impact   = str(row[12])
    const derogAuth = bool(row[15])
    const rebut    = bool(row[16])
    const immCorr  = str(row[17])
    const corrResp = str(row[19])
    // cols 20,21 = correction dates planned/actual
    const corrDPlan = d(row[20])
    const corrDAct  = d(row[21])
    const corrProg  = progressRatio(row[22])
    const rootCause = str(row[23])
    // CAPA cols: 26=action, 28=responsible, 29=deadlinePlan, 30=deadlineActual, 31=capaProgress
    const capaAction = str(row[26])
    const capaResp   = str(row[28])
    const capaDPlan  = d(row[29])
    const capaDAct   = d(row[30])
    // Eval dates
    const evalPlan   = d(row[32])
    const evalAct    = d(row[33])
    // Client response
    const clientRespRef = str(row[35])
    // Risk / Opportunity
    const isRisk    = bool(row[36])
    const isOpp     = bool(row[37])
    const needsSecondCapa = bool(row[39])
    // Closure date
    const closureDate = d(row[40])

    const year = detDate.getFullYear()
    const ref  = `FOR-MI-05/${year}/${String(ficheNum).padStart(3,'0')}`

    // Determine status
    let status = 'open'
    if (closureDate) status = 'verified'
    else if (corrDAct || capaDAct) status = 'closed'
    else if (corrDPlan || corrProg) status = 'in_progress'

    // Determine NC source for 'Réclamation Client' type
    const finalNcSource = ncSource ?? (ncType === 'reclamation_client' ? 'reclamation_client' : null)

    await client.query(`
      INSERT INTO non_conformances (
        reference, nc_fiche_num, nc_month,
        detected_at, detected_by, created_by,
        detector_name, detector_email,
        dept, nc_type, nc_source,
        reference_doc, description, impact, root_cause,
        immediate_correction, derogation_auth, rebut,
        correction_responsible, correction_deadline_planned, correction_deadline_actual,
        correction_progress,
        eval_date_planned, eval_date_actual,
        client_response_ref, is_risk, is_opportunity,
        needs_second_capa, closed_at, status,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,
        $4,$5,$6,
        $7,$8,
        $9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,
        $19,$20,$21,
        $22,
        $23,$24,
        $25,$26,$27,
        $28,$29,$30,
        NOW(),NOW()
      )
    `, [
      ref, ficheNum, month,
      detDate, SYSTEM_USER_ID, SYSTEM_USER_ID,
      detector, detEmail,
      dept, ncType, finalNcSource,
      refDoc, desc, impact, rootCause,
      immCorr, derogAuth, rebut,
      corrResp, corrDPlan, corrDAct,
      corrProg,
      evalPlan, evalAct,
      clientRespRef, isRisk, isOpp,
      needsSecondCapa, closureDate, status,
    ])

    // Insert CAPA if present
    if (capaAction) {
      await client.query(`
        INSERT INTO corrective_actions (
          nc_id, action_description, responsible_id, responsible_name,
          deadline_planned, deadline_actual,
          status, created_by, created_at, updated_at
        )
        SELECT id, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        FROM non_conformances WHERE reference = $1
      `, [
        ref, capaAction, SYSTEM_USER_ID, capaResp,
        capaDPlan, capaDAct,
        capaDAct ? 'closed' : (capaDPlan ? 'in_progress' : 'open'),
        SYSTEM_USER_ID,
      ])
    }

    console.log(`  ✓ N°${ficheNum} [${ref}] ${month} — ${ncType ?? 'NC'} — ${dept ?? '—'}`)
    inserted++
  }

  await client.end()
  console.log(`\nDone: ${inserted} imported, ${skipped} skipped.`)
}

run().catch(e => { console.error(e); process.exit(1) })
