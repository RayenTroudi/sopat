# DMS Coding System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text document code entry in the admin DMS section with the structured `[TYPE]-[PROCESS]-[NN]` coding system defined in `LIS-MI-01`, wiring it through the `dms_documents` table with auto-numbering, enforced validation, seed data from the register, and updated UI labels everywhere.

**Architecture:** A new shared constants module defines the canonical type/process codes and their French labels; the `dms_numbering_sequences` table (already in the schema) drives auto-increment per `[TYPE]-[PROCESS]` prefix; the existing `/admin/documents` page and its API route are rewritten to read/write `dms_documents` instead of the legacy `documents` table; the `AdminNav` label is updated to match the register vocabulary.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS, Zod, existing shadcn/ui patterns.

## Global Constraints

- All user-facing text in French; code/comments in English
- Document codes **must** match `[TYPE]-[PROCESS]-[NN]` exactly — uppercase, hyphen-separated, two-digit sequence number zero-padded (e.g. `PRC-MI-01`)
- Type codes: `LIS`, `PRS`, `PRC`, `INS`, `FOR`, `ORG`, `PLA`
- Process codes: `MI`, `RH`, `CO`, `RE`, `ET`, `AC`
- `FOR-MI-16` and `FOR-MI-17` must be corrected to `PLA-MI-16` and `PLA-MI-17` (confirmed: Type=PLA, codes were wrong in register)
- Duplicate codes `FOR-RH-02` and `ORG-MI-02` each have a `-VA` (Arabic) variant — the VA variant gets a `-VA` suffix appended to the code
- Never delete from `dms_documents` — use `deletedAt` (soft delete)
- The legacy `documents` table is read-only going forward; do not modify its schema or data
- Follow existing Drizzle + raw SQL migration pattern: write a `.sql` file, apply with `node scripts/run-migration.mjs`
- Sequence auto-numbering is per `[TYPE]-[PROCESS]` prefix, tracked in `dms_numbering_sequences`
- `dms_numbering_sequences` uses `(department, category, year)` as its unique key — we will repurpose `year=0` as a "timeless" slot keyed by `(type_code, process_code)` using a new dedicated table instead (see Task 1)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/dms/codes.ts` | **Create** | Canonical TYPE/PROCESS code constants, labels, validation |
| `src/lib/dms/numbering.ts` | **Create** | Auto-increment sequence generator for `[TYPE]-[PROCESS]-NN` |
| `src/lib/dms/queries.ts` | **Create** | All `dms_documents`-facing DB queries (list, create, get, seed) |
| `db/migrations/0009_dms_coding.sql` | **Create** | Add `dms_code_sequences` table; seed all 148 register entries |
| `src/app/api/dms/route.ts` | **Create** | GET (list) + POST (create) for `dms_documents` |
| `src/app/api/dms/next-code/route.ts` | **Create** | GET returns next available code for a given type+process prefix |
| `src/app/admin/(dashboard)/documents/page.tsx` | **Modify** | Switch data source from legacy `listDocuments` to `listDmsDocuments` |
| `src/app/admin/(dashboard)/documents/DocumentsClient.tsx` | **Modify** | Enforce structured code picker, show process/type from register |
| `src/components/AdminNav.tsx` | **Modify** | Rename "Documents ISO" label |

---

## Task 1 — Code Constants & Sequence Table Migration

**Files:**
- Create: `src/lib/dms/codes.ts`
- Create: `db/migrations/0009_dms_coding.sql`

**Interfaces:**
- Produces:
  - `TYPE_CODES: readonly string[]` — `['LIS','PRS','PRC','INS','FOR','ORG','PLA']`
  - `PROCESS_CODES: readonly string[]` — `['MI','RH','CO','RE','ET','AC']`
  - `TYPE_LABELS: Record<string, string>` — French labels keyed by type code
  - `PROCESS_LABELS: Record<string, string>` — French labels keyed by process code
  - `isValidCode(code: string): boolean`
  - `parseCode(code: string): { type: string; process: string; seq: number } | null`

- [ ] **Step 1: Create `src/lib/dms/codes.ts`**

```typescript
// src/lib/dms/codes.ts
// Canonical coding system from LIS-MI-01 (SOPAT internal document register)

export const TYPE_CODES = ['LIS', 'PRS', 'PRC', 'INS', 'FOR', 'ORG', 'PLA'] as const
export type TypeCode = (typeof TYPE_CODES)[number]

export const PROCESS_CODES = ['MI', 'RH', 'CO', 'RE', 'ET', 'AC'] as const
export type ProcessCode = (typeof PROCESS_CODES)[number]

export const TYPE_LABELS: Record<TypeCode, string> = {
  LIS: 'Liste',
  PRS: 'Processus',
  PRC: 'Procédure',
  INS: 'Instruction',
  FOR: 'Formulaire / Fiche',
  ORG: 'Document organisationnel',
  PLA: 'Plan',
}

export const PROCESS_LABELS: Record<ProcessCode, string> = {
  MI: 'Management Intégré / Qualité',
  RH: 'Ressources Humaines',
  CO: 'Commercial',
  RE: 'Réalisation & Entretien',
  ET: 'Étude',
  AC: 'Achat',
}

// CODE_REGEX matches TYPE-PROCESS-NN or TYPE-PROCESS-NN-VA
const CODE_REGEX = /^(LIS|PRS|PRC|INS|FOR|ORG|PLA)-(MI|RH|CO|RE|ET|AC)-(\d{2})(-VA)?$/

export function isValidCode(code: string): boolean {
  return CODE_REGEX.test(code)
}

export function parseCode(code: string): { type: TypeCode; process: ProcessCode; seq: number; va: boolean } | null {
  const m = CODE_REGEX.exec(code)
  if (!m) return null
  return {
    type:    m[1] as TypeCode,
    process: m[2] as ProcessCode,
    seq:     parseInt(m[3], 10),
    va:      m[4] === '-VA',
  }
}

export function buildCode(type: TypeCode, process: ProcessCode, seq: number, va = false): string {
  return `${type}-${process}-${String(seq).padStart(2, '0')}${va ? '-VA' : ''}`
}
```

- [ ] **Step 2: Create `db/migrations/0009_dms_coding.sql`**

This migration creates a dedicated `dms_code_sequences` table (one row per TYPE-PROCESS prefix, year-agnostic) and seeds all 148 register entries into `dms_documents`. The seed sets `status = 'effective'`, `created_by` to a placeholder that will be replaced by the actual admin UUID at runtime (see note below).

> **Note on `created_by`:** `dms_documents.created_by` is a NOT NULL FK to `users`. The migration uses a `DO $$ BEGIN … END $$` block that fetches the first admin user's UUID at migration time. If no admin exists yet, it skips the seed. Run this migration **after** seeding at least one admin user.

```sql
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
  (gen_random_uuid(),'LIS-MI-04','Liste des mots de passe','enregistrement','qualite','{}','internal','{}','confidential',admin_id,admin_id,admin_id,'2024-08-19',10,now(),now()),
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
```

- [ ] **Step 3: Apply the migration**

```bash
node scripts/run-migration.mjs db/migrations/0009_dms_coding.sql
```

Expected output:
```
Connected. Applying db/migrations/0009_dms_coding.sql …
Done — migration applied successfully.
```

If output shows `NOTICE: No admin user found`, create an admin user first via the existing `/api/team` endpoint or database seed, then re-run.

- [ ] **Step 4: Verify seed in database**

```bash
node -e "
const pg = require('pg')
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
c.connect().then(() =>
  c.query('SELECT COUNT(*) FROM dms_documents').then(r => {
    console.log('dms_documents count:', r.rows[0].count)
    return c.query('SELECT COUNT(*) FROM dms_code_sequences')
  }).then(r => {
    console.log('dms_code_sequences count:', r.rows[0].count)
    c.end()
  })
)
"
```

Expected: `dms_documents count: 148`, `dms_code_sequences count: 29`

- [ ] **Step 5: Commit**

```bash
git add src/lib/dms/codes.ts db/migrations/0009_dms_coding.sql
git commit -m "feat(dms): coding system constants and register seed migration"
```

---

## Task 2 — Auto-Numbering Service

**Files:**
- Create: `src/lib/dms/numbering.ts`

**Interfaces:**
- Consumes: `db` from `db/index.ts`; `dms_code_sequences` table from migration 0009
- Produces:
  - `getNextCode(type: TypeCode, process: ProcessCode, db: DrizzleDb): Promise<string>` — returns `"PRC-MI-14"` style, atomically increments `dms_code_sequences`
  - `peekNextCode(type: TypeCode, process: ProcessCode, db: DrizzleDb): Promise<string>` — preview without incrementing

- [ ] **Step 1: Create `src/lib/dms/numbering.ts`**

```typescript
// src/lib/dms/numbering.ts
import { sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import { buildCode, type TypeCode, type ProcessCode } from './codes'

// Atomically increments the sequence and returns the new code.
// Uses UPDATE … RETURNING for optimistic locking without a transaction.
export async function getNextCode(type: TypeCode, process: ProcessCode): Promise<string> {
  const rows = await db.execute(sql`
    UPDATE dms_code_sequences
    SET last_seq   = last_seq + 1,
        updated_at = now()
    WHERE type_code    = ${type}
      AND process_code = ${process}
    RETURNING last_seq
  `)

  if (rows.rows.length === 0) {
    // First use of this prefix — insert and return 01
    await db.execute(sql`
      INSERT INTO dms_code_sequences (type_code, process_code, last_seq)
      VALUES (${type}, ${process}, 1)
      ON CONFLICT (type_code, process_code) DO UPDATE
        SET last_seq   = dms_code_sequences.last_seq + 1,
            updated_at = now()
    `)
    const [r] = await db.execute(sql`
      SELECT last_seq FROM dms_code_sequences
      WHERE type_code = ${type} AND process_code = ${process}
    `)
    return buildCode(type, process, Number((r as { last_seq: number }).last_seq))
  }

  const seq = Number((rows.rows[0] as { last_seq: number }).last_seq)
  return buildCode(type, process, seq)
}

// Preview the next code without consuming it.
export async function peekNextCode(type: TypeCode, process: ProcessCode): Promise<string> {
  const rows = await db.execute(sql`
    SELECT last_seq FROM dms_code_sequences
    WHERE type_code = ${type} AND process_code = ${process}
  `)
  const current = rows.rows.length > 0
    ? Number((rows.rows[0] as { last_seq: number }).last_seq)
    : 0
  return buildCode(type, process, current + 1)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dms/numbering.ts
git commit -m "feat(dms): auto-numbering service for TYPE-PROCESS-NN codes"
```

---

## Task 3 — DMS DB Query Layer

**Files:**
- Create: `src/lib/dms/queries.ts`

**Interfaces:**
- Consumes: `dmsDocuments`, `users`, `cloudinaryAssets` from `db/schema.ts`; `db` from `db/index.ts`
- Produces:
  - `type DmsDocRow` — shape returned by list queries
  - `listDmsDocuments(filters?: DmsListFilters): Promise<{ rows: DmsDocRow[]; total: number }>`
  - `createDmsDocument(input: DmsCreateInput): Promise<typeof dmsDocuments.$inferSelect>`
  - `getDmsDocumentByCode(code: string): Promise<DmsDocRow | null>`

- [ ] **Step 1: Create `src/lib/dms/queries.ts`**

```typescript
// src/lib/dms/queries.ts
import { db } from '../../../db/index'
import {
  dmsDocuments,
  users,
  cloudinaryAssets,
  dmsCategoryEnum,
  dmsDepartmentEnum,
  dmsLifecycleStatusEnum,
} from '../../../db/schema'
import { eq, and, isNull, desc, asc, sql, ilike, or, inArray } from 'drizzle-orm'
import type { TypeCode, ProcessCode } from './codes'

export type DmsDocRow = {
  id: string
  documentNumber: string
  title: string
  category: string
  department: string
  status: string
  confidentiality: string
  isoClauses: string[]
  tags: string[]
  effectiveDate: Date | null
  nextReviewDate: Date | null
  ownerId: string
  ownerName: string | null
  authorId: string
  authorName: string | null
  currentVersionId: string | null
  assetUrl: string | null
  legacyReference: string | null
  createdAt: Date
  updatedAt: Date
}

export type DmsListFilters = {
  status?:     string
  category?:   string
  department?: string
  typeCode?:   TypeCode
  processCode?: ProcessCode
  search?:     string
  page?:       number
  pageSize?:   number
}

export type DmsCreateInput = {
  documentNumber:    string
  title:             string
  category:          typeof dmsCategoryEnum.enumValues[number]
  department:        typeof dmsDepartmentEnum.enumValues[number]
  isoClauses?:       string[]
  confidentiality?:  typeof dmsConfidentialityEnum.enumValues[number]
  tags?:             string[]
  ownerId:           string
  authorId:          string
  effectiveDate?:    Date
  nextReviewDate?:   Date
  legacyReference?:  string
  createdBy:         string
}

// dmsConfidentialityEnum re-export for use in input type
import { dmsConfidentialityEnum } from '../../../db/schema'

export async function listDmsDocuments(filters?: DmsListFilters): Promise<{ rows: DmsDocRow[]; total: number }> {
  const page     = filters?.page     ?? 1
  const pageSize = filters?.pageSize ?? 50
  const offset   = (page - 1) * pageSize

  const ownerAlias  = db.$with('owner').as(db.select({ id: users.id, name: users.name }).from(users))
  const authorAlias = db.$with('author').as(db.select({ id: users.id, name: users.name }).from(users))

  const conditions = [
    isNull(dmsDocuments.deletedAt),
    filters?.status     ? eq(dmsDocuments.status,     filters.status as typeof dmsLifecycleStatusEnum.enumValues[number])     : undefined,
    filters?.category   ? eq(dmsDocuments.category,   filters.category as typeof dmsCategoryEnum.enumValues[number])          : undefined,
    filters?.department ? eq(dmsDocuments.department, filters.department as typeof dmsDepartmentEnum.enumValues[number])       : undefined,
    filters?.typeCode   ? sql`${dmsDocuments.documentNumber} LIKE ${filters.typeCode + '-%'}` : undefined,
    filters?.processCode ? sql`${dmsDocuments.documentNumber} LIKE ${'%-' + filters.processCode + '-%'}` : undefined,
    filters?.search     ? or(
      ilike(dmsDocuments.title,          `%${filters.search}%`),
      ilike(dmsDocuments.documentNumber, `%${filters.search}%`),
    ) : undefined,
  ].filter(Boolean)

  const rows = await db
    .select({
      id:               dmsDocuments.id,
      documentNumber:   dmsDocuments.documentNumber,
      title:            dmsDocuments.title,
      category:         dmsDocuments.category,
      department:       dmsDocuments.department,
      status:           dmsDocuments.status,
      confidentiality:  dmsDocuments.confidentiality,
      isoClauses:       dmsDocuments.isoClauses,
      tags:             dmsDocuments.tags,
      effectiveDate:    dmsDocuments.effectiveDate,
      nextReviewDate:   dmsDocuments.nextReviewDate,
      ownerId:          dmsDocuments.ownerId,
      ownerName:        sql<string | null>`owner_u.name`,
      authorId:         dmsDocuments.authorId,
      authorName:       sql<string | null>`author_u.name`,
      currentVersionId: dmsDocuments.currentVersionId,
      assetUrl:         cloudinaryAssets.secureUrl,
      legacyReference:  dmsDocuments.legacyReference,
      createdAt:        dmsDocuments.createdAt,
      updatedAt:        dmsDocuments.updatedAt,
    })
    .from(dmsDocuments)
    .leftJoin(sql`users owner_u`,  sql`owner_u.id  = ${dmsDocuments.ownerId}`)
    .leftJoin(sql`users author_u`, sql`author_u.id = ${dmsDocuments.authorId}`)
    .leftJoin(cloudinaryAssets,    eq(cloudinaryAssets.id, sql`(
      SELECT cv.cloudinary_asset_id FROM dms_document_versions cv
      WHERE cv.id = ${dmsDocuments.currentVersionId}
      LIMIT 1
    )`))
    .where(and(...conditions))
    .orderBy(asc(dmsDocuments.documentNumber))
    .limit(pageSize)
    .offset(offset)

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(dmsDocuments)
    .where(and(isNull(dmsDocuments.deletedAt)))

  return { rows: rows as DmsDocRow[], total: Number(total) }
}

export async function createDmsDocument(input: DmsCreateInput) {
  const [doc] = await db
    .insert(dmsDocuments)
    .values({
      documentNumber:   input.documentNumber,
      title:            input.title,
      category:         input.category,
      department:       input.department,
      isoClauses:       input.isoClauses ?? [],
      confidentiality:  input.confidentiality ?? 'internal',
      tags:             input.tags ?? [],
      ownerId:          input.ownerId,
      authorId:         input.authorId,
      departmentManagerId: null,
      status:           'draft',
      legacyReference:  input.legacyReference ?? null,
      effectiveDate:    input.effectiveDate ?? null,
      nextReviewDate:   input.nextReviewDate ?? null,
      createdBy:        input.createdBy,
    })
    .returning()
  return doc
}

export async function getDmsDocumentByCode(documentNumber: string): Promise<DmsDocRow | null> {
  const [row] = await db
    .select({
      id:               dmsDocuments.id,
      documentNumber:   dmsDocuments.documentNumber,
      title:            dmsDocuments.title,
      category:         dmsDocuments.category,
      department:       dmsDocuments.department,
      status:           dmsDocuments.status,
      confidentiality:  dmsDocuments.confidentiality,
      isoClauses:       dmsDocuments.isoClauses,
      tags:             dmsDocuments.tags,
      effectiveDate:    dmsDocuments.effectiveDate,
      nextReviewDate:   dmsDocuments.nextReviewDate,
      ownerId:          dmsDocuments.ownerId,
      ownerName:        sql<string | null>`owner_u.name`,
      authorId:         dmsDocuments.authorId,
      authorName:       sql<string | null>`author_u.name`,
      currentVersionId: dmsDocuments.currentVersionId,
      assetUrl:         cloudinaryAssets.secureUrl,
      legacyReference:  dmsDocuments.legacyReference,
      createdAt:        dmsDocuments.createdAt,
      updatedAt:        dmsDocuments.updatedAt,
    })
    .from(dmsDocuments)
    .leftJoin(sql`users owner_u`,  sql`owner_u.id  = ${dmsDocuments.ownerId}`)
    .leftJoin(sql`users author_u`, sql`author_u.id = ${dmsDocuments.authorId}`)
    .leftJoin(cloudinaryAssets,    eq(cloudinaryAssets.id, sql`(
      SELECT cv.cloudinary_asset_id FROM dms_document_versions cv
      WHERE cv.id = ${dmsDocuments.currentVersionId}
      LIMIT 1
    )`))
    .where(and(eq(dmsDocuments.documentNumber, documentNumber), isNull(dmsDocuments.deletedAt)))
    .limit(1)
  return row as DmsDocRow ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dms/queries.ts
git commit -m "feat(dms): query layer for dms_documents table"
```

---

## Task 4 — API Routes for DMS

**Files:**
- Create: `src/app/api/dms/route.ts`
- Create: `src/app/api/dms/next-code/route.ts`

**Interfaces:**
- Consumes: `listDmsDocuments`, `createDmsDocument` from `src/lib/dms/queries.ts`; `peekNextCode` from `src/lib/dms/numbering.ts`; `isValidCode` from `src/lib/dms/codes.ts`; `auth` from `src/lib/auth.ts`
- Produces:
  - `GET /api/dms?status=&category=&department=&typeCode=&processCode=&search=&page=` → `{ rows: DmsDocRow[]; total: number }`
  - `POST /api/dms` body `{ documentNumber, title, category, department, ownerId, isoClauses?, confidentiality?, effectiveDate?, notes? }` → `201 DmsDoc`
  - `GET /api/dms/next-code?type=PRC&process=MI` → `{ code: "PRC-MI-14" }`

- [ ] **Step 1: Create `src/app/api/dms/route.ts`**

```typescript
// src/app/api/dms/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { listDmsDocuments, createDmsDocument } from '@/lib/dms/queries'
import { isValidCode, TYPE_CODES, PROCESS_CODES } from '@/lib/dms/codes'
import type {
  dmsCategoryEnum,
  dmsDepartmentEnum,
  dmsConfidentialityEnum,
} from '../../../../db/schema'

const createSchema = z.object({
  documentNumber:  z.string().min(1).max(50).toUpperCase().refine(isValidCode, {
    message: 'Le code doit suivre le format TYPE-PROCESS-NN (ex: PRC-MI-01)',
  }),
  title:           z.string().min(1).max(255),
  category:        z.enum(['manuel_qualite','politique','procedure','instruction','formulaire',
    'enregistrement','plan_qualite','cartographie_processus','etude_technique','devis','contrat',
    'bon_commande','facture','rapport_inspection','rapport_audit','ncr','capa',
    'document_fournisseur','document_client','externe'] as const),
  department:      z.enum(['direction','etudes','realisation','entretien','qualite','finance','rh','rse','transverse'] as const),
  ownerId:         z.string().uuid(),
  isoClauses:      z.array(z.string()).optional(),
  confidentiality: z.enum(['public','internal','confidential','restricted'] as const).optional(),
  effectiveDate:   z.string().datetime().optional(),
  nextReviewDate:  z.string().datetime().optional(),
  legacyReference: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const result = await listDmsDocuments({
    status:      sp.get('status')      ?? undefined,
    category:    sp.get('category')    ?? undefined,
    department:  sp.get('department')  ?? undefined,
    typeCode:    (sp.get('typeCode')   as any) ?? undefined,
    processCode: (sp.get('processCode') as any) ?? undefined,
    search:      sp.get('search')      ?? undefined,
    page:        sp.get('page') ? Number(sp.get('page')) : undefined,
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const doc = await createDmsDocument({
    documentNumber:   d.documentNumber,
    title:            d.title,
    category:         d.category,
    department:       d.department,
    ownerId:          d.ownerId,
    authorId:         session.user.userId,
    isoClauses:       d.isoClauses,
    confidentiality:  d.confidentiality,
    effectiveDate:    d.effectiveDate ? new Date(d.effectiveDate) : undefined,
    nextReviewDate:   d.nextReviewDate ? new Date(d.nextReviewDate) : undefined,
    legacyReference:  d.legacyReference,
    createdBy:        session.user.userId,
  })
  return NextResponse.json(doc, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/dms/next-code/route.ts`**

```typescript
// src/app/api/dms/next-code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { peekNextCode } from '@/lib/dms/numbering'
import { TYPE_CODES, PROCESS_CODES, type TypeCode, type ProcessCode } from '@/lib/dms/codes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const type    = req.nextUrl.searchParams.get('type')
  const process = req.nextUrl.searchParams.get('process')

  if (!type || !TYPE_CODES.includes(type as TypeCode)) {
    return NextResponse.json({ error: 'Paramètre type invalide' }, { status: 400 })
  }
  if (!process || !PROCESS_CODES.includes(process as ProcessCode)) {
    return NextResponse.json({ error: 'Paramètre process invalide' }, { status: 400 })
  }

  const code = await peekNextCode(type as TypeCode, process as ProcessCode)
  return NextResponse.json({ code })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dms/route.ts src/app/api/dms/next-code/route.ts
git commit -m "feat(dms): API routes GET/POST /api/dms and GET /api/dms/next-code"
```

---

## Task 5 — Rewrite Documents Page UI

**Files:**
- Modify: `src/app/admin/(dashboard)/documents/page.tsx`
- Modify: `src/app/admin/(dashboard)/documents/DocumentsClient.tsx`
- Modify: `src/components/AdminNav.tsx`

**Interfaces:**
- Consumes: `listDmsDocuments`, `DmsDocRow` from `src/lib/dms/queries.ts`; `getActiveUsers` from `src/lib/db/iso.ts`; `TYPE_LABELS`, `PROCESS_LABELS`, `TYPE_CODES`, `PROCESS_CODES` from `src/lib/dms/codes.ts`
- `GET /api/dms/next-code?type=…&process=…` called on type/process select change

- [ ] **Step 1: Update `src/app/admin/(dashboard)/documents/page.tsx`**

Replace the entire file:

```typescript
// src/app/admin/(dashboard)/documents/page.tsx
import { auth } from '@/lib/auth'
import { listDmsDocuments } from '@/lib/dms/queries'
import { getActiveUsers } from '@/lib/db/iso'
import { DmsDocumentsClient } from './DocumentsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Informations Documentées | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null

  const [{ rows, total }, users] = await Promise.all([
    listDmsDocuments({
      status:      typeof sp.status      === 'string' ? sp.status      : undefined,
      typeCode:    typeof sp.typeCode    === 'string' ? (sp.typeCode as any)    : undefined,
      processCode: typeof sp.processCode === 'string' ? (sp.processCode as any) : undefined,
      search:      typeof sp.search      === 'string' ? sp.search      : undefined,
    }),
    getActiveUsers(),
  ])

  const canEdit = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <DmsDocumentsClient
      initialRows={rows}
      total={total}
      users={users}
      canEdit={canEdit}
      currentUserId={session.user.userId}
    />
  )
}
```

- [ ] **Step 2: Rewrite `src/app/admin/(dashboard)/documents/DocumentsClient.tsx`**

Replace the entire file:

```typescript
'use client'
// src/app/admin/(dashboard)/documents/DocumentsClient.tsx

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DmsDocRow } from '@/lib/dms/queries'
import {
  TYPE_CODES, PROCESS_CODES, TYPE_LABELS, PROCESS_LABELS,
  type TypeCode, type ProcessCode,
} from '@/lib/dms/codes'

// ── Label maps ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:            'Brouillon',
  in_review:        'En révision',
  pending_approval: 'En attente approbation',
  approved:         'Approuvé',
  effective:        'En vigueur',
  under_revision:   'En cours de révision',
  obsolete:         'Obsolète',
  archived:         'Archivé',
}

const STATUS_COLORS: Record<string, string> = {
  draft:            'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  in_review:        'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  pending_approval: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approved:         'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  effective:        'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  under_revision:   'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  obsolete:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
  archived:         'bg-[var(--admin-border)] text-[var(--admin-text-muted)]',
}

const CATEGORY_LABELS: Record<string, string> = {
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
  rapport_inspection:    'Rapport d\'inspection',
  rapport_audit:         'Rapport d\'audit',
  ncr:                   'NCR',
  capa:                  'CAPA',
  document_fournisseur:  'Document fournisseur',
  document_client:       'Document client',
  externe:               'Document externe',
}

const DEPARTMENT_LABELS: Record<string, string> = {
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type User = { id: string; name: string }

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  initialRows:   DmsDocRow[]
  total:         number
  users:         User[]
  canEdit:       boolean
  currentUserId: string
}

// ── Form state ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  typeCode:    '' as TypeCode | '',
  processCode: '' as ProcessCode | '',
  documentNumber: '',
  title:       '',
  category:    'procedure',
  department:  'qualite',
  ownerId:     '',
  confidentiality: 'internal',
  isoClauses:  '',
}

// ── Component ────────────────────────────────────────────────────────────────

export function DmsDocumentsClient({ initialRows, total, users, canEdit, currentUserId }: Props) {
  const [rows, setRows]         = useState(initialRows)
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterProcess, setFilterProcess] = useState('')
  const [search,        setSearch]        = useState('')

  const [form, setForm]             = useState({ ...EMPTY_FORM, ownerId: currentUserId })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [codePreview, setCodePreview] = useState('')

  async function loadDocs() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus)  params.set('status',      filterStatus)
    if (filterType)    params.set('typeCode',     filterType)
    if (filterProcess) params.set('processCode',  filterProcess)
    if (search)        params.set('search',       search)
    const res = await fetch(`/api/dms?${params}`)
    if (res.ok) {
      const data = await res.json() as { rows: DmsDocRow[] }
      setRows(data.rows)
    }
    setLoading(false)
  }

  async function handleTypeProcessChange(type: string, process: string) {
    if (!type || !process) { setCodePreview(''); return }
    const res = await fetch(`/api/dms/next-code?type=${type}&process=${process}`)
    if (res.ok) {
      const data = await res.json() as { code: string }
      setCodePreview(data.code)
      setForm(f => ({ ...f, documentNumber: data.code }))
    }
  }

  async function handleCreate() {
    if (!form.documentNumber) { setFormError('Le code est obligatoire'); return }
    if (!form.title.trim())   { setFormError('Le titre est obligatoire'); return }
    if (!form.typeCode || !form.processCode) {
      setFormError('Sélectionnez un type et un processus'); return
    }
    setSubmitting(true); setFormError('')
    const res = await fetch('/api/dms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentNumber:  form.documentNumber,
        title:           form.title,
        category:        form.category,
        department:      form.department,
        ownerId:         form.ownerId,
        confidentiality: form.confidentiality,
        isoClauses:      form.isoClauses ? form.isoClauses.split(',').map(s => s.trim()).filter(Boolean) : [],
      }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setFormError(data.error ?? 'Erreur'); setSubmitting(false); return }
    setShowForm(false)
    setForm({ ...EMPTY_FORM, ownerId: currentUserId })
    setCodePreview('')
    await loadDocs()
    setSubmitting(false)
  }

  const activeCount = rows.filter(r => r.status === 'effective').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Informations Documentées
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ISO 9001:2015 · §7.5 · {activeCount} document{activeCount !== 1 ? 's' : ''} en vigueur
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--admin-emerald)' }}
          >
            <span>+</span> Nouveau document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setTimeout(() => void loadDocs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setTimeout(() => void loadDocs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        >
          <option value="">Tous types</option>
          {TYPE_CODES.map(t => <option key={t} value={t}>{t} – {TYPE_LABELS[t]}</option>)}
        </select>

        <select
          value={filterProcess}
          onChange={(e) => { setFilterProcess(e.target.value); setTimeout(() => void loadDocs(), 0) }}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        >
          <option value="">Tous processus</option>
          {PROCESS_CODES.map(p => <option key={p} value={p}>{p} – {PROCESS_LABELS[p]}</option>)}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void loadDocs()}
          placeholder="Code ou titre…"
          className="text-sm px-3 py-1.5 rounded-lg border flex-1 min-w-[160px]"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-text)' }}
        />
        <button
          onClick={() => void loadDocs()}
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Aucun document trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Code', 'Désignation', 'Type', 'Processus', 'Département', 'Statut', 'Responsable', 'En vigueur', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => {
                  const codeParts = doc.documentNumber.split('-')
                  const typeCode    = codeParts[0] ?? ''
                  const processCode = codeParts[1] ?? ''
                  return (
                    <tr key={doc.id} className="transition-colors hover:bg-[var(--admin-bg)]" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {doc.documentNumber}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{doc.title}</p>
                        {doc.isoClauses.length > 0 && (
                          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>ISO {doc.isoClauses.join(', ')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {typeCode}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {processCode}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {DEPARTMENT_LABELS[doc.department] ?? doc.department}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_COLORS[doc.status] ?? STATUS_COLORS.draft)}>
                          {STATUS_LABELS[doc.status] ?? doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {doc.ownerName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {fmt(doc.effectiveDate)}
                      </td>
                      <td className="px-4 py-3">
                        {doc.assetUrl && (
                          <a href={doc.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>PDF</a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create drawer */}
      {showForm && canEdit && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full z-50 w-full max-w-lg flex flex-col shadow-xl overflow-y-auto" style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>Nouveau document</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[var(--admin-border)]" style={{ color: 'var(--admin-text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 px-6 py-5 space-y-4">

              {/* Type + Process selectors — drive code generation */}
              <div className="grid grid-cols-2 gap-3">
                <FF label="Type *">
                  <select
                    value={form.typeCode}
                    onChange={(e) => {
                      const t = e.target.value as TypeCode
                      setForm(f => ({ ...f, typeCode: t }))
                      void handleTypeProcessChange(t, form.processCode)
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  >
                    <option value="">— Choisir —</option>
                    {TYPE_CODES.map(t => <option key={t} value={t}>{t} – {TYPE_LABELS[t]}</option>)}
                  </select>
                </FF>
                <FF label="Processus *">
                  <select
                    value={form.processCode}
                    onChange={(e) => {
                      const p = e.target.value as ProcessCode
                      setForm(f => ({ ...f, processCode: p }))
                      void handleTypeProcessChange(form.typeCode, p)
                    }}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  >
                    <option value="">— Choisir —</option>
                    {PROCESS_CODES.map(p => <option key={p} value={p}>{p} – {PROCESS_LABELS[p]}</option>)}
                  </select>
                </FF>
              </div>

              {/* Auto-generated code — readonly display */}
              <FF label="Code généré">
                <div
                  className="px-3 py-2 rounded-lg border font-mono text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: codePreview ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}
                >
                  {codePreview || 'Sélectionner type + processus'}
                </div>
              </FF>

              <FF label="Désignation *">
                <input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Procédure de gestion des congés"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                />
              </FF>

              <div className="grid grid-cols-2 gap-3">
                <FF label="Catégorie DMS">
                  <select
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FF>
                <FF label="Département">
                  <select
                    value={form.department}
                    onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  >
                    {Object.entries(DEPARTMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FF>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FF label="Confidentialité">
                  <select
                    value={form.confidentiality}
                    onChange={(e) => setForm(f => ({ ...f, confidentiality: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  >
                    <option value="public">Public</option>
                    <option value="internal">Interne</option>
                    <option value="confidential">Confidentiel</option>
                    <option value="restricted">Restreint</option>
                  </select>
                </FF>
                <FF label="Clauses ISO">
                  <input
                    value={form.isoClauses}
                    onChange={(e) => setForm(f => ({ ...f, isoClauses: e.target.value }))}
                    placeholder="ex: 7.5, 9.2"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                  />
                </FF>
              </div>

              <FF label="Responsable">
                <select
                  value={form.ownerId}
                  onChange={(e) => setForm(f => ({ ...f, ownerId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FF>

              {formError && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--admin-red-dim)', color: 'var(--admin-red)' }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg border text-sm" style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>Annuler</button>
                <button onClick={() => void handleCreate()} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: 'var(--admin-emerald)' }}>
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Update `AdminNav.tsx` — rename the nav label**

In `src/components/AdminNav.tsx`, find the nav item:
```typescript
{ href: '/admin/documents', label: 'Documents ISO',    icon: '📄', roles: ['admin','direction','etudes_chef'] },
```
Change it to:
```typescript
{ href: '/admin/documents', label: 'Inf. Documentées', icon: '📄', roles: ['admin','direction','etudes_chef'] },
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/(dashboard)/documents/page.tsx \
        src/app/admin/(dashboard)/documents/DocumentsClient.tsx \
        src/components/AdminNav.tsx
git commit -m "feat(dms): rewrite documents page to use dms_documents with TYPE-PROCESS-NN coding system"
```

---

## Task 6 — Smoke Test & Register Data Correction Notes

**Files:**
- No new files; this is a verification task

**Interfaces:**
- Consumes: running dev server at `http://localhost:3000`

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: Server starts on port 3000, no TypeScript errors in terminal.

- [ ] **Step 2: Log in and navigate to `/admin/documents`**

- Verify the page title shows "Informations Documentées"
- Verify the nav label shows "Inf. Documentées"
- Verify the table shows documents sorted by code (FOR-AC-01 first)
- Verify the type filter dropdown lists all 7 type codes with French labels
- Verify the process filter dropdown lists all 6 process codes with French labels

- [ ] **Step 3: Test code generation**

- Click "Nouveau document"
- Select Type: `PRC`, Processus: `RH`
- Verify the "Code généré" field shows `PRC-RH-08` (next after PRC-RH-07)
- Change Type to `LIS`, Processus to `CO`
- Verify the field shows `LIS-CO-02` (next after LIS-CO-01)

- [ ] **Step 4: Test filter by type**

- Select filter Type = `PRC`
- Click Filtrer
- Verify only documents with code starting `PRC-` appear

- [ ] **Step 5: Test filter by process**

- Clear type filter, select Processus = `MI`
- Click Filtrer
- Verify only documents with `-MI-` in code appear

- [ ] **Step 6: Create a new document end-to-end**

- Open the form, select Type=`INS`, Processus=`RE`
- Code preview should show `INS-RE-02`
- Enter title: `Instruction procédure d'entretien hivernal`
- Select Catégorie: `Instruction`, Département: `Réalisation`
- Click Enregistrer
- Verify the new row appears in the table with code `INS-RE-02`
- Verify the sequence in `dms_code_sequences` for `INS/RE` is now `2`:

```bash
node -e "
const pg = require('pg')
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
c.connect().then(() =>
  c.query(\"SELECT last_seq FROM dms_code_sequences WHERE type_code='INS' AND process_code='RE'\")
  .then(r => { console.log('INS-RE last_seq:', r.rows[0]?.last_seq); c.end() })
)
"
```

Expected: `INS-RE last_seq: 2`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(dms): smoke test passed — coding system end-to-end verified"
```

---

## Known Register Corrections Applied

These corrections from the audit are baked into the migration seed (no further action needed):

| Original register entry | Correction applied | Reason |
|---|---|---|
| `FOR-MI-16` with Type=PLA | Seeded as `PLA-MI-16` | Type field is authoritative (PLA), code prefix was wrong |
| `FOR-MI-17` with Type=PLA | Seeded as `PLA-MI-17` | Same |
| `FOR-RH-02` (VA duplicate) | Seeded as `FOR-RH-02-VA` | Distinct code for Arabic version |
| `ORG-MI-02` (VA duplicate) | Seeded as `ORG-MI-02-VA` | Distinct code for Arabic version |
| `PRC-AC-02` date `27/022023` | Stored as `2023-02-27` | Typo fix (missing slash) |
| `PRS-AC-01` date `07/02/2023 et 27/02/2023` | Stored as `2023-02-07` | Used first date; two-date cells are not supported |
| 9 trailing-space designations | Stripped in SQL seed | `''Extra Dépenses '` → `'Extra Dépenses'` |
