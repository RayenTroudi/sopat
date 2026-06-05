# SOPAT Admin Panel — Claude Code Prompt

---

## Project Overview

Build a full-stack, ISO 9001:2015–compliant admin panel for **SOPAT**, a professional landscape company based in Tunisia. The panel manages the complete lifecycle of landscape projects across three certified teams, integrates an ML-powered budget prediction engine, and automates quality-tracked communication between departments via email.

The public website (sopat.tn) already exists. This is exclusively the **internal admin panel**, accessible only to authenticated SOPAT staff.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Database | PostgreSQL via **Neon** (serverless) |
| ORM | Drizzle ORM |
| File Storage | **Cloudinary** (plans, photos, documents) |
| Auth | NextAuth.js v5 with credentials provider |
| Email | Nodemailer + React Email templates |
| ML Model | Python (scikit-learn / XGBoost) served as a Next.js API route via `child_process` or a dedicated `/api/predict` endpoint using a pre-trained `.joblib` model file |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| State | Zustand (client state) + React Query (server state) |

---

## ISO 9001:2015 Compliance Framework

The entire system must be architected around ISO 9001:2015 requirements as applied to a landscape company. Implement the following as first-class features, not afterthoughts:

### Quality Management Principles to Encode in the System

1. **Process Approach** — Every action (project creation, phase transitions, budget validation) must follow a defined, traceable process. No ad-hoc state jumps.
2. **Risk-Based Thinking** — Flag projects where predicted budget is exceeded by >10%, where deadlines are at risk, or where non-conformances are open.
3. **Evidence-Based Decision Making** — All decisions (budget approval, phase sign-off) require documented evidence (photos, checklists, attachments via Cloudinary).
4. **Continual Improvement** — Non-conformance and corrective action tracking with closure audits.
5. **Customer Focus** — Client satisfaction records attached to projects.

### ISO 9001:2015 Specific Modules to Build

- **Document Control Center** (`/admin/documents`) — Version-controlled document repository for procedures, work instructions, and quality records. Each document has: code, title, version, date, owner, status (active/obsolete/draft), and Cloudinary-hosted file.
- **Non-Conformance (NC) Management** (`/admin/nc`) — Log, assign, and close non-conformances per ISO 8.7. Fields: NC reference, date detected, detected by, process affected (Études/Réalisation/Entretien), description, root cause analysis, corrective action, responsible person, deadline, verification status.
- **Corrective Action (CAPA) Tracker** — Linked to NCs. Track: action taken, evidence uploaded, effectiveness verified, closure date.
- **Internal Audit Log** (`/admin/audits`) — Schedule and record internal audits per process. Auditor, audit date, process audited, findings, status.
- **Quality Objectives Dashboard** — KPI tracking: project on-time delivery rate, budget variance rate, NC closure rate within SLA, client satisfaction score. All visible on the main admin dashboard.
- **Supplier Register** (`/admin/suppliers`) — List of approved plant/material suppliers with evaluation scores, last audit date, ISO approval status. Used to populate plant/material purchase orders in Réalisation.

---

## Three-Team Workflow

### Phase 1 — Études & Conception (Study & Design Team)

**Goal:** Analyze the client's space, design the landscape plan, select plant species, produce 3D renders, and validate the budget before any commitment.

**Features to Build:**

- **Project Creation Form** — Fields: project name, client name, client contact, site address, site area (m²), project type (residential/commercial/public), start date, estimated delivery date, assigned chef d'études.
- **Plant List Builder** (`études/[projectId]/plant-list`) — A structured form where the études team inputs:
  - Plant species (botanical name + common name)
  - Quantity
  - Unit (units, m², m³ for soil, kg for fertilizer, etc.)
  - Unit cost estimate
  - Supplier (from approved supplier register)
  - Notes
  This list is the **primary input to the ML budget prediction model**.
- **3D Render & Document Upload** — Cloudinary-integrated uploader. Supports: 3D render images (JPEG/PNG/WebP), AutoCAD plans (PDF), specification documents (PDF). Display in a gallery per project.
- **Budget Estimation Panel** — After the plant list is saved, a "Run Budget Prediction" button calls `/api/ml/predict` with the plant list JSON. Displays: ML-predicted total cost, confidence interval, cost breakdown by category (plants, soil, labor, equipment). The études chef can accept or override the prediction. The accepted budget becomes the **official project budget** and is locked for the project lifecycle.
- **Phase Sign-Off** — A "Submit to Réalisation" button with mandatory checklist confirmation (3D renders uploaded ✓, plant list complete ✓, budget approved ✓, client validation document uploaded ✓). This transitions the project to Phase 2 and notifies the réalisation team.
- **Quality Record:** All études actions are logged in the project audit trail with timestamp and user.

---

### Phase 2 — Réalisation (Realization/Implementation Team)

**Goal:** Execute the landscape project on-site, track purchases, manage teams, and report spending vs. the études-approved budget in real time.

**Features to Build:**

- **Project Board** — Kanban-style view of all active réalisation projects with status: En attente / En cours / Inspection qualité / Terminé.
- **Purchase Order System** (`réalisation/[projectId]/purchases`) — The réalisation team logs purchases:
  - Item (linked to études plant list item, or new line)
  - Quantity purchased
  - Unit price paid
  - Supplier invoice number
  - Invoice upload (Cloudinary PDF)
  - Date of purchase
  - Purchased by (team member)
  Each purchase auto-updates the **total spent** counter for the project.
- **Budget Monitoring Widget** — Live display per project: Études-approved budget vs. total spent vs. ML-predicted final cost. Color-coded: green (≤90% of budget), amber (90–105%), red (>105%). Alert badge when over budget.
- **Automated ML Prediction Email System** (critical feature — see detailed spec below).
- **Site Progress Photos** — Cloudinary upload of site progress photos per project milestone. Required at: mobilisation, 25% completion, 50% completion, 75% completion, final inspection. Each upload triggers a quality checkpoint.
- **Quality Inspection Checklist** — Per-project checklists for each phase of site work. ISO 9001 clause 8.6 — release of products/services. Checklist items must be signed off before phase transition.
- **Non-Conformance Logging** — Direct link from Réalisation dashboard to log an NC against the current project.
- **Phase Sign-Off** — "Submit to Entretien & Suivi" button. Prerequisites: all quality checkpoints passed ✓, final photos uploaded ✓, client reception document uploaded ✓, budget reconciliation submitted ✓.

---

### Automated ML Prediction Email — Detailed Spec

This is the core intelligence feature of the system.

**Trigger:** When a réalisation project chef opens the project for the first time after the études-to-réalisation handoff, OR manually via "Generate Prediction Email" button.

**Flow:**

1. System calls `/api/ml/predict` with:
   - The études plant list (species, quantities, units)
   - Project metadata (area m², project type, region, season)
   - Historical data context (passed automatically, not shown to user)

2. ML model returns:
   - Predicted total cost
   - Predicted cost per category (plants, substrates/soil, equipment, labor, logistics)
   - Confidence score (0–100%)
   - Top 3 cost drivers

3. System generates a pre-filled email using a React Email template and sends it automatically to the **project chef's email address** via Nodemailer.

4. The email contains:
   - Project name and reference
   - ML-predicted budget breakdown (beautiful HTML table)
   - Pre-filled purchase quantities based on études plant list
   - A **"Valider"** button linking to `/validate/[token]` (signed JWT, 7-day expiry)
   - An **"Modifier"** button linking to `/edit/[token]`
   - A note: "Ces données sont générées automatiquement. Veuillez vérifier et valider avant le début des achats."

5. Clicking **Valider** in the email:
   - Opens a secure web page (no login required, JWT token auth)
   - Shows the pre-filled data read-only
   - Chef confirms with one click
   - System marks budget as "validated by chef" with timestamp
   - Sends confirmation email to admin and études team

6. Clicking **Modifier** in the email:
   - Opens a secure web page with editable fields
   - Chef can adjust quantities, unit prices, categories
   - Chef submits edited version with a mandatory "Reason for modification" field (ISO 9001 traceability)
   - System saves the chef's version, flags it as "chef-modified" vs "ML-predicted"
   - Admin is notified of the modification with a diff view

7. If no response in 48 hours: automatic reminder email sent. After 72 hours: admin escalation email.

**All validation events are stored in the `budget_validations` table with full audit trail.**

---

### Phase 3 — Entretien & Suivi (Maintenance & Follow-up Team)

**Goal:** Perform regular maintenance visits, track plant health, ensure the landscape remains per spec, and maintain client satisfaction records.

**Features to Build:**

- **Maintenance Schedule Calendar** — Per-project, recurring maintenance visits can be scheduled. Calendar view (monthly). Each visit has: date, team assigned, type (taille/arrosage/traitement phytosanitaire/contrôle général), duration estimate.
- **Visit Report Form** — After each visit, team logs:
  - Work done (checklist + free text)
  - Plant health assessment (per species zone: healthy/attention/critical)
  - Photos (Cloudinary upload — before/after)
  - Products used (fertilizers, pesticides — with quantities for traceability)
  - Issues found → direct NC logging if needed
  - Next visit recommendation
- **Plant Health Tracker** — Per-project view showing health status of each planted zone over time. Sparkline charts showing health score trend.
- **Client Satisfaction Records** — After project completion and after first 6-month maintenance cycle, log client satisfaction score (1–5) and comments. Linked to ISO 9001 clause 9.1.2.
- **Maintenance Contract Tracker** — Each project can have a maintenance contract with: start/end date, visit frequency, monthly cost, contract document (Cloudinary PDF).

---

## Database Schema (PostgreSQL / Neon via Drizzle ORM)

Design and implement the following tables. Use UUIDs as primary keys. All tables include `created_at`, `updated_at`, `created_by` (user id).

```
users                     — auth, role (admin | etudes_chef | etudes_team | realisation_chef | realisation_team | entretien_chef | entretien_team | direction)
projects                  — master project record, links to all phases
project_phases            — phase records (etudes | realisation | entretien), status, sign-off metadata
plant_list_items          — études plant list rows (linked to project)
suppliers                 — approved supplier register
budget_predictions        — ML model output per project (versioned)
budget_validations        — chef validation records with audit trail (validated | modified | pending)
purchase_orders           — réalisation purchase log
cloudinary_assets         — all uploaded files metadata (public_id, url, type, linked_entity)
quality_checklists        — checklist templates per phase
quality_checklist_items   — individual checklist items
project_checklist_answers — per-project checklist completion records
non_conformances          — NC records
corrective_actions        — CAPA records linked to NCs
maintenance_schedules     — recurring visit schedules
maintenance_visits        — completed visit records
plant_health_records      — per-zone health snapshots
client_satisfaction       — satisfaction scores linked to projects
documents                 — ISO document control registry
audit_logs                — ISO internal audit records
email_queue               — track all system-generated emails (status: pending | sent | opened | validated | expired)
project_activity_log      — immutable audit trail for all project events
```

Define all foreign keys, indexes on `project_id` and `user_id` columns, and soft-delete (`deleted_at`) on projects, users, and NC records.

---

## ML Budget Prediction Model

### Training Data
- Source: SOPAT historical project data from 2021 to present
- Format: CSV with columns: project_type, site_area_m2, region, season, plant_species_count, total_plant_units, avg_plant_unit_price, soil_volume_m3, equipment_count, labor_days, total_cost
- Store training data in `/data/training/sopat_projects_2021_2026.csv`

### Model Architecture
- Algorithm: **Gradient Boosting Regressor (XGBoost)** — best for tabular data with mixed feature types
- Features:
  - Project type (categorical encoded)
  - Site area (continuous)
  - Region/season (categorical)
  - Plant list: total units, species diversity count, avg unit price, number of tree species (>2m), number of shrub species, ground cover area
  - Historical cost per m² for similar projects
- Target: Total project cost (TND)
- Output: Point prediction + 90% confidence interval
- Secondary outputs: Cost category breakdown (plants %, soil %, labor %, equipment %, logistics %)

### Model Serving
- Train model in Python: `scripts/train_model.py`
- Save as: `models/sopat_budget_v1.joblib` + `models/feature_scaler.joblib`
- Create Next.js API route: `app/api/ml/predict/route.ts`
- This route spawns a Python subprocess (`scripts/predict.py`) passing the plant list as JSON, receives prediction JSON back
- Alternatively: deploy as a standalone FastAPI microservice at `/ml` if subprocess approach is too slow
- Include a model retraining script: `scripts/retrain_model.py` that can be triggered manually from the admin panel under Settings → ML Model

### Prediction Script Interface
```
Input JSON:
{
  "project_type": "residential",
  "site_area_m2": 450,
  "region": "tunis",
  "season": "spring",
  "plant_list": [
    { "species": "Phoenix dactylifera", "category": "tree", "quantity": 4, "unit_price_estimate": 280 },
    { "species": "Lavandula angustifolia", "category": "shrub", "quantity": 120, "unit_price_estimate": 8 },
    ...
  ]
}

Output JSON:
{
  "predicted_total": 18450,
  "confidence_low": 16200,
  "confidence_high": 20900,
  "confidence_score": 82,
  "breakdown": {
    "plants": 9800,
    "soil_substrates": 2200,
    "labor": 4100,
    "equipment": 1500,
    "logistics": 850
  },
  "top_cost_drivers": ["Phoenix dactylifera (×4)", "Labor (12 days est.)", "Soil substrate (45m³ est.)"],
  "model_version": "v1.2",
  "similar_projects_used": 14
}
```

---

## Email System

Use **Nodemailer** with SMTP (configure for Gmail/custom SMTP via env vars) and **React Email** for beautiful HTML templates.

### Email Templates to Build (in `/emails/` directory)

1. **`prediction-email.tsx`** — The primary ML prediction email sent to réalisation chef. Includes: project details, ML budget table, Valider/Modifier CTA buttons, SOPAT branding, French language.
2. **`validation-confirmed.tsx`** — Sent to admin + études team after chef validates.
3. **`validation-modified.tsx`** — Sent to admin showing original vs. modified values with diff highlighting.
4. **`phase-transition.tsx`** — Notifies next team when a project moves to their phase.
5. **`budget-alert.tsx`** — Sent to admin + project chef when spend exceeds 90% of budget.
6. **`nc-assigned.tsx`** — Notifies assigned person of a new non-conformance.
7. **`maintenance-reminder.tsx`** — 24h before scheduled maintenance visit.
8. **`reminder-48h.tsx`** — Reminder to chef if prediction email unopened for 48h.

All emails must be in **French**, use SOPAT green branding (`#2D5A27` primary), include the SOPAT logo (served from Cloudinary), and be mobile-responsive.

---

## Admin Panel UI Structure

### Navigation Structure
```
/admin
  /dashboard              — KPI overview (ISO quality objectives, active projects, budget health)
  /projects               — All projects list with filters and kanban
  /projects/new           — Create project
  /projects/[id]          — Project detail (tabs: Études | Réalisation | Entretien | Documents | Activity)
  /projects/[id]/etudes   — Phase 1 management
  /projects/[id]/realisation — Phase 2 management
  /projects/[id]/entretien — Phase 3 management
  /documents              — ISO document control
  /nc                     — Non-conformances list
  /nc/[id]                — NC detail + CAPA
  /audits                 — Internal audit schedule and records
  /suppliers              — Approved supplier register
  /team                   — User management (roles, teams)
  /reports                — Analytics: budget variance, project performance, NC trends
  /settings               — SMTP config, ML model management, system config
  /settings/ml            — ML model version, retrain trigger, prediction history

/validate/[token]         — Public (no auth) chef validation page
/edit/[token]             — Public (no auth) chef edit page
```

### Dashboard KPIs (ISO 9001 Quality Objectives)
Display as metric cards + sparkline charts:
- Active projects count (by phase)
- Projects on-time delivery rate (%)
- Average budget variance (ML predicted vs actual)
- Open non-conformances count
- NC closure rate within SLA (%)
- Maintenance visits completed this month
- Client satisfaction score (rolling average)

### Design Language
- Colors: SOPAT green (`#2D5A27`) as primary, earthy warm whites and creams as backgrounds, stone grays for text. Professional, clean, nature-inspired without being decorative.
- Font: Inter for UI, no display fonts (this is a working tool, not a marketing page)
- Layout: Left sidebar nav (collapsible), top bar with breadcrumbs + user avatar + notifications bell
- Tables: shadcn/ui DataTable with sorting, filtering, pagination
- Cards: Subtle borders, no heavy shadows
- Status badges: Color-coded pills (green/amber/red/blue) for project phases and NC statuses
- All text in **French** (Tunisia context)

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://...neon.tech/sopat

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@sopat.tn

# ML Model
ML_MODEL_PATH=./models/sopat_budget_v1.joblib
PYTHON_PATH=python3

# App
NEXT_PUBLIC_APP_URL=https://admin.sopat.tn
JWT_SECRET= (for validation token signing)
```

---

## File Structure

```
sopat-admin/
├── app/
│   ├── (auth)/login/
│   ├── (admin)/
│   │   ├── layout.tsx           (sidebar + topbar shell)
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── documents/
│   │   ├── nc/
│   │   ├── audits/
│   │   ├── suppliers/
│   │   ├── team/
│   │   ├── reports/
│   │   └── settings/
│   ├── validate/[token]/        (public, no auth)
│   ├── edit/[token]/            (public, no auth)
│   └── api/
│       ├── ml/predict/
│       ├── email/send/
│       ├── projects/
│       ├── nc/
│       └── upload/              (Cloudinary upload endpoint)
├── components/
│   ├── ui/                      (shadcn/ui)
│   ├── projects/
│   ├── budget/
│   ├── quality/
│   └── charts/
├── db/
│   ├── schema.ts                (Drizzle schema)
│   ├── migrations/
│   └── seed.ts
├── emails/                      (React Email templates)
├── lib/
│   ├── auth.ts
│   ├── cloudinary.ts
│   ├── email.ts
│   ├── ml.ts                    (ML prediction client)
│   └── jwt.ts                   (validation token utils)
├── models/                      (trained .joblib files)
├── scripts/
│   ├── train_model.py
│   ├── predict.py
│   └── retrain_model.py
├── data/
│   └── training/
└── middleware.ts                 (auth protection)
```

---

## Development Priorities (Build in this order)

1. **Database schema + Drizzle migrations** — foundation for everything
2. **Auth system** (NextAuth, roles, middleware)
3. **Project CRUD + phase state machine** — core workflow
4. **Études plant list builder + Cloudinary uploads**
5. **ML model Python scripts** (train on synthetic data initially) + `/api/ml/predict` endpoint
6. **Budget prediction panel in études UI**
7. **Réalisation purchase order system + budget tracker**
8. **Automated email system** (Nodemailer + React Email templates)
9. **Validation/Edit JWT pages** (`/validate/[token]`, `/edit/[token]`)
10. **ISO modules** (Document control, NC management, CAPA, Audit log)
11. **Entretien maintenance scheduling + visit reports**
12. **Dashboard KPIs + Reports**
13. **Supplier register**
14. **Settings + ML model management UI**

---

## Important Implementation Notes

- **Language:** All UI labels, form fields, error messages, and email content must be in **French**. Use proper French landscape/horticultural terminology.
- **ISO traceability:** Every state-changing action (phase transition, budget approval, NC closure) must write an immutable record to `project_activity_log` with: action, actor (user id + name), timestamp, previous state, new state, and any attached evidence (Cloudinary asset ids).
- **Role-based access:** Études team can only see/edit Études phase. Réalisation team can only see/edit Réalisation phase. Entretien team can only see/edit Entretien phase. Admin and Direction see everything.
- **Validation tokens** (`/validate/[token]`) must use signed JWT (HS256) with: project_id, chef_user_id, prediction_id, expiry (7 days). No session/cookie required on these pages.
- **ML fallback:** If the Python model is unavailable, fall back to a simple rule-based estimation (cost per m² × site area × type multiplier) and flag the prediction as "estimation manuelle" in the UI.
- **Cloudinary uploads** must use signed upload presets. Never expose API secret to the client. All uploads go through `/api/upload` which signs the upload server-side.
- **Neon PostgreSQL:** Use connection pooling (`@neondatabase/serverless` with `pool: true`) for API routes, direct connection for migrations.
- **Plant species autocomplete:** Pre-populate a `plant_species` reference table with common Tunisian/Mediterranean landscape species (botanical + common French names) for the études plant list builder typeahead.
```
