-- db/migrations/0009_dms_coding.sql
-- Adds dms_code_sequences table and seeds 148 register entries from LIS-MI-01 (2025 sheet)

-- ── 1. Sequence tracker ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dms_code_sequences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code    varchar(3)  NOT NULL,
  process_code varchar(3)  NOT NULL,
  last_seq     integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type_code, process_code)
);

-- Pre-populate sequences at their current high-water mark from the register
INSERT INTO dms_code_sequences (type_code, process_code, last_seq) VALUES
  ('FOR','AC', 11),
  ('FOR','CO',  3),
  ('FOR','ET',  7),
  ('FOR','MI', 17),
  ('FOR','RE', 15),
  ('FOR','RH', 44),
  ('INS','ET',  1),
  ('INS','MI', 21),
  ('INS','RE',  1),
  ('LIS','CO',  1),
  ('LIS','ET',  3),
  ('LIS','MI', 10),
  ('LIS','RE',  2),
  ('LIS','RH',  2),
  ('ORG','CO',  2),
  ('ORG','MI', 10),
  ('ORG','RH',  4),
  ('PLA','MI',  5),
  ('PLA','RE',  5),
  ('PLA','RH',  2),
  ('PRC','AC',  2),
  ('PRC','MI', 13),
  ('PRC','RH',  7),
  ('PRS','AC',  1),
  ('PRS','CO',  1),
  ('PRS','ET',  1),
  ('PRS','MI',  2),
  ('PRS','RE',  2),
  ('PRS','RH',  1)
ON CONFLICT (type_code, process_code) DO NOTHING;

-- ── 2. Seed register entries into dms_documents ───────────────────────────────

DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping DMS seed. Run again after creating an admin.';
    RETURN;
  END IF;

  INSERT INTO dms_documents (
    id, document_number, title, category, department,
    iso_clauses, confidentiality, tags, status,
    owner_id, author_id, created_by,
    effective_date, retention_years, created_at, updated_at
  ) VALUES
  -- ── FOR-AC ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-AC-01','Extra Dépenses','formulaire','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-11-11',10,now(),now()),
  (gen_random_uuid(),'FOR-AC-03','Bon de commande','bon_commande','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-08-27',10,now(),now()),
  (gen_random_uuid(),'FOR-AC-05','Bon de retour','formulaire','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-08-27',10,now(),now()),
  (gen_random_uuid(),'FOR-AC-06','Bon de livraison','formulaire','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-08-27',10,now(),now()),
  (gen_random_uuid(),'FOR-AC-10','Suivi d''approvisionnement chantier','formulaire','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-11-17',10,now(),now()),
  (gen_random_uuid(),'FOR-AC-11','Tableau de sélection et d''évaluation des fournisseurs','formulaire','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-02-07',10,now(),now()),
  -- ── FOR-CO ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-CO-01','Tableau de suivi des offres','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-07-13',10,now(),now()),
  (gen_random_uuid(),'FOR-CO-02','Bordereau des prix','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-07-09',10,now(),now()),
  (gen_random_uuid(),'FOR-CO-03','Etat de solde client','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2022-09-30',10,now(),now()),
  -- ── FOR-ET ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-ET-01','Registre de suivi des projets d''étude','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-07-22',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-02','Fiche projet','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-07-11',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-03','Fiche de spécifications techniques de MD','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-19',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-04','Fiche de spécifications techniques de plante','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-03-24',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-05','Fiche de spécifications techniques de PP','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-21',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-06','Articles projet','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-07-11',10,now(),now()),
  (gen_random_uuid(),'FOR-ET-07','Rendu d''aménagement paysager','formulaire','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-07-11',10,now(),now()),
  -- ── FOR-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-MI-01','Rapport de revue documentaire','rapport_audit','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-02','Rapport de veille normative et réglementaire','rapport_audit','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-04','PV de réunion','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-05','Registre de suivi des NC, PNC et réclamations','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-07','Registre des risques et des opportunités','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-08','Registre d''écoute PI','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-09','Fiche de recueil des suggestions et réclamations du personnel','formulaire','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-29',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-10','Tableau de bord','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-12','Check-list d''application des consignes SME & SST','formulaire','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-13','Rapport d''audit','rapport_audit','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-14','Programme d''audit','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'FOR-MI-15','Rapport de revue de direction','rapport_audit','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  -- FOR-MI-16 and FOR-MI-17: register Type field says PLA, codes corrected accordingly
  (gen_random_uuid(),'PLA-MI-16','Fiche d''analyse des changements','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-20',10,now(),now()),
  (gen_random_uuid(),'PLA-MI-17','Registre de suivi des changements','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-20',10,now(),now()),
  -- ── FOR-RE ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-RE-03','Fiche Equipe Projet','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-01-07',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-04','Fiche de suivi journalier de chantier','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-21',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-05','PV de réception provisoire','enregistrement','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-10-29',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-07','Check-list_Travaux préliminaires','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-01-15',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-08','Check-list_Installation des réseaux & Maçonnerie','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-24',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-09','Check-list_Plantations','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-16',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-10','Check-list_Engazonnement','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-16',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-11','Check-list_Matière décorative','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-24',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-12','Check-list_Fourniture des plantes','formulaire','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-09-25',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-13','Attachement de projet','enregistrement','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-01-25',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-14','PV de réception définitive','enregistrement','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-03-02',10,now(),now()),
  (gen_random_uuid(),'FOR-RE-15','Décompte de projet','enregistrement','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2022-09-30',10,now(),now()),
  -- ── FOR-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'FOR-RH-01','Demande de recrutement','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-01-23',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-02','Fiche de renseignement','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-02-VA','Fiche de renseignement VA','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-02-11',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-03','Fiche d''évaluation individuelle de performance','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-23',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-04','Fiche de suivi de carrière professionnelle','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-05','Feuille de présence de formation','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-06','Feuille d''évaluation de formation à chaud','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-07','Feuille d''évaluation de formation à froid','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-08','Fiche de poste','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-01-23',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-13','Fiche de pointage','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-12-01',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-14','Demande du congé','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-15','Autorisation de sortie','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-22',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-28','Reçu de matériel de travail','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-12-03',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-34','Checklist du dossier de personnel/Employé','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-02-14',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-41','Ordre de mission','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-18',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-43','Registre de suivi des congés','enregistrement','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-10-12',10,now(),now()),
  (gen_random_uuid(),'FOR-RH-44','Grille de polyvalence','formulaire','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-11-10',10,now(),now()),
  -- ── INS-ET ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'INS-ET-01','Instructions Processus Etude','instruction','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-07-11',10,now(),now()),
  -- ── INS-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'INS-MI-01','Instruction plantation des grands sujets','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-02','Instruction plantation et manipulation des cactées et plantes épineuses','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-03','Instruction Consommation d''eau','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-04','Instruction Consommation d''électricité','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-05','Instruction Parc Automobile','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-06','Instruction Consommation papier','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-07','Instruction manipulation des machines et outils d''entretien','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-08','Instruction gestion des déchets Verts','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-09','Instruction Traitement Phytosanitaire des végétaux','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-10','Instruction Consommation de la matière Plastique','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-11','Instruction gestion des Déchets Dangereux','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-12','Instruction Postures pénibles sur chantier','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-13','Instruction Travail en hauteur','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-15','Instruction manutention manuelle des Charges lourdes','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-16','Instruction Travail à l''ordinateur','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-17','Instruction Engins lourds sur chantier','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-18','Instruction vaccin antitétanique','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'INS-MI-19','Instruction Usage des produits phytosanitaires','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-30',10,now(),now()),
  (gen_random_uuid(),'INS-MI-21','Instruction Maintenance tondeuse à gazon','instruction','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  -- ── INS-RE ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'INS-RE-01','Instruction projet de réalisation','instruction','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-04-07',10,now(),now()),
  -- ── LIS-CO ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'LIS-CO-01','Liste des références','enregistrement','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-03-22',10,now(),now()),
  -- ── LIS-ET ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'LIS-ET-02','Liste de la palette végétale','enregistrement','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-19',10,now(),now()),
  (gen_random_uuid(),'LIS-ET-03','Liste des spécifications techniques des plantes','enregistrement','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-02-11',10,now(),now()),
  -- ── LIS-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'LIS-MI-01','Liste des informations documentées internes','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-02','Liste des informations documentées externes','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-03','Suivi des enregistrements','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-04','Liste des mots de passe','enregistrement','qualite','{}','confidential','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-07','Registre des parties intéressées','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-08','Liste des auditeurs internes','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-09','Registre de suivi des déchets dangereux','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
  (gen_random_uuid(),'LIS-MI-10','Liste de matériels et suivi de maintenance','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-30',10,now(),now()),
  -- ── LIS-RE ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'LIS-RE-02','Liste des projets de réalisation','enregistrement','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-01-06',10,now(),now()),
  -- ── LIS-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'LIS-RH-01','Liste des suppléants','enregistrement','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-30',10,now(),now()),
  (gen_random_uuid(),'LIS-RH-02','Tableau de suivi du personnel','enregistrement','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-06-12',10,now(),now()),
  -- ── ORG-CO ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'ORG-CO-01','Offre de prix d''étude','devis','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-04-25',10,now(),now()),
  (gen_random_uuid(),'ORG-CO-02','Contrat de projet d''entretien','contrat','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-07-19',10,now(),now()),
  -- ── ORG-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'ORG-MI-01','Cartographie de l''entreprise','cartographie_processus','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-02','Politique d''engagement RSE','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-02-VA','Politique d''engagement RSE VA','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-03','Charte RSE','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-04','Politique environnementale','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-05','Code d''éthique des affaires','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-06','Charte qualité','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-07','Contexte de l''entreprise','manuel_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-08','Politique Qualité','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-09','Tableau de gestion des connaissances organisationnelles','enregistrement','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'ORG-MI-10','Politique environnementale','politique','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  -- ── ORG-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'ORG-RH-01','Règlement interne de l''entreprise','politique','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2021-12-08',10,now(),now()),
  (gen_random_uuid(),'ORG-RH-02','Organigramme de l''entreprise','cartographie_processus','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-01-03',10,now(),now()),
  (gen_random_uuid(),'ORG-RH-03','Politique de gestion des ressources humaines','politique','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2018-09-29',10,now(),now()),
  (gen_random_uuid(),'ORG-RH-04','Organigramme fonctionnel de l''entreprise','cartographie_processus','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-01-03',10,now(),now()),
  -- ── PLA-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PLA-MI-01','Plan annuel de Management & RSE','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'PLA-MI-02','Plan des initiatives solidaires','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'PLA-MI-03','Plan de communication','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'PLA-MI-04','Evaluation des aspects environnementaux','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  (gen_random_uuid(),'PLA-MI-05','Identification des aspects environnementaux','plan_qualite','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-13',10,now(),now()),
  -- ── PLA-RE ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PLA-RE-01','Planning annuel d''entretien','plan_qualite','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-16',10,now(),now()),
  (gen_random_uuid(),'PLA-RE-02','Planning hebdomadaire de projets','plan_qualite','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-08-15',10,now(),now()),
  (gen_random_uuid(),'PLA-RE-03','Plan d''action de projet de réalisation','plan_qualite','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-19',10,now(),now()),
  (gen_random_uuid(),'PLA-RE-04','Plan d''action mensuel de projet d''entretien','plan_qualite','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-02-04',10,now(),now()),
  (gen_random_uuid(),'PLA-RE-05','Planing de projet de réalisation','plan_qualite','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-19',10,now(),now()),
  -- ── PLA-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PLA-RH-01','Plan d''intégration','plan_qualite','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-14',10,now(),now()),
  (gen_random_uuid(),'PLA-RH-02','Planning de formation','plan_qualite','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2019-01-26',10,now(),now()),
  -- ── PRC-AC ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRC-AC-02','Procédure de sélection et d''évaluation des fournisseurs','procedure','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-02-27',10,now(),now()),
  -- ── PRC-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRC-MI-01','Procédure de maitrise des informations documentées','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-05','Procédure de veille réglementaire & normative','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-06','Procédure de traitement des NC, PNC et réclamations clients','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-07','Procédure Ecoute PI','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-08','Procédure d''analyse et de traitement des risques et des opportunités d''amélioration','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-09','Procédure des audits internes','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-10','Procédure de revue de direction','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-11','Procédure d''identification et d''évaluation des AES','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-12','Procédure de gestion des déchets','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-07-10',10,now(),now()),
  (gen_random_uuid(),'PRC-MI-13','Procédure de gestion des changements','procedure','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2025-06-20',10,now(),now()),
  -- ── PRC-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRC-RH-02','Procédure de formation du personnel','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-06-13',10,now(),now()),
  (gen_random_uuid(),'PRC-RH-03','Procédure de gestion des congés','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-10-12',10,now(),now()),
  (gen_random_uuid(),'PRC-RH-04','Procédure de discipline','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-06-13',10,now(),now()),
  (gen_random_uuid(),'PRC-RH-05','Procédure de gestion de paie','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-06-13',10,now(),now()),
  (gen_random_uuid(),'PRC-RH-06','Procédure de gestion de présence','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-06-13',10,now(),now()),
  (gen_random_uuid(),'PRC-RH-07','Procédure d''intégration des stagiaires','procedure','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2020-06-13',10,now(),now()),
  -- ── PRS-AC ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-AC-01','Processus Achat','cartographie_processus','finance','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-02-07',10,now(),now()),
  -- ── PRS-CO ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-CO-01','Processus Commercial','cartographie_processus','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-03-22',10,now(),now()),
  -- ── PRS-ET ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-ET-01','Processus Etude','cartographie_processus','etudes','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-03-22',10,now(),now()),
  -- ── PRS-MI ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-MI-01','Processus Management de la qualité','cartographie_processus','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-06-10',10,now(),now()),
  (gen_random_uuid(),'PRS-MI-02','Processus Management de l''environnement','cartographie_processus','qualite','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2024-06-10',10,now(),now()),
  -- ── PRS-RE ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-RE-01','Processus Réalisation','cartographie_processus','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-20',10,now(),now()),
  (gen_random_uuid(),'PRS-RE-02','Processus Entretien','cartographie_processus','realisation','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-16',10,now(),now()),
  -- ── PRS-RH ────────────────────────────────────────────────────────────────
  (gen_random_uuid(),'PRS-RH-01','Processus de gestion des ressources humaines','cartographie_processus','rh','{}','internal','{}','effective',admin_id,admin_id,admin_id,'2023-09-16',10,now(),now())
  ON CONFLICT (document_number) DO NOTHING;
END $$;
