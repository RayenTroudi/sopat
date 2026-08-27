/**
 * Repairs the 2025 FOR-MI-05 register rows against the source workbook.
 *
 * The original import misread the workbook in several ways:
 *   - "X" in Autorisation de dérogation / Rebut was stored as `true`, so all 47
 *     NCs claimed a formal concession AND a scrap decision simultaneously.
 *   - Risque / Opportunité were inverted and their free-text designations dropped.
 *   - Every Date de clôture was lost, while 21 NCs were left marked "closed".
 *   - Planning expressions used as deadlines ("S3 Juin 2025", "Réunion du groupe")
 *     were silently discarded because the columns are timestamps.
 *   - CAPA responsible names, progress and planned/actual dates were not carried over.
 *
 * Run:  npx tsx --env-file=.env db/seeds/repair-formi05-2025.ts [--dry]
 */
import { db } from '../index'
import { nonConformances, correctiveActions } from '../schema'
import { eq, isNull, and, isNotNull } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { join } from 'path'

const WORKBOOK = join(
  __dirname, '..', '..',
  'FOR MI 05 Registre de suivi des NC PNC et réclamations 2025.xlsx'
)

const DRY = process.argv.includes('--dry')

// ── Workbook helpers ─────────────────────────────────────────────────────────

/** Excel serial date -> JS Date (1900 date system). */
function serialToDate(n: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + n * 86400000)
}

const isSerial = (v: string) => /^\d+(\.\d+)?$/.test(v.trim())

/** A cell holding nothing but the register's "X" placeholder. */
const isXOnly = (v: string) => v.trim().toUpperCase() === 'X'

/** Free text worth keeping: not empty, not a bare "X", not a raw serial. */
function designation(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  if (!t || isXOnly(t) || isSerial(t)) return null
  return t
}

/** Split a deadline cell into a real date or a planning expression. */
function splitDeadline(v: string | undefined): { date: Date | null; text: string | null } {
  if (!v) return { date: null, text: null }
  const t = v.trim()
  if (!t || isXOnly(t)) return { date: null, text: null }
  if (isSerial(t)) return { date: serialToDate(Number(t)), text: null }
  return { date: null, text: t.slice(0, 200) }
}

/** Affirmative marker. "X" is this workbook's not-applicable placeholder. */
function isAffirmative(v: string | undefined): boolean {
  if (!v) return false
  return /^(oui|yes|vrai|true|1)$/i.test(v.trim())
}

function progress(v: string | undefined): number | null {
  if (!v) return null
  const t = v.trim()
  if (!t || isXOnly(t) || !isSerial(t)) return null
  const n = Number(t)
  return n >= 0 && n <= 1 ? n : null
}

// ── Column map (header rows 12/13 of the sheet) ──────────────────────────────
type Row = Record<string, string>

const COL = {
  fiche: 'A', processus: 'F', mois: 'H', date: 'I',
  derogation: 'P', rebut: 'Q',
  corrPlanned: 'U', corrActual: 'V', corrProgress: 'W',
  acResponsible: 'AC', acPlanned: 'AD', acActual: 'AE', acProgress: 'AF',
  evalPlanned: 'AG', evalActual: 'AH',
  clientDate: 'AI', clientRef: 'AJ',
  risque: 'AK', opportunite: 'AL',
  secondCapa: 'AM', cloture: 'AN',
} as const

function readWorkbook(): Map<number, Row> {
  const wb = XLSX.readFile(WORKBOOK)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = new Map<number, Row>()
  // Data starts at row 14; rows 12/13 are the two-level merged header.
  for (let r = 14; r <= 60; r++) {
    const cells: Row = {}
    for (const col of Object.values(COL)) {
      const cell = ws[col + r]
      if (!cell) continue
      // Numeric cells must be read raw: `w` is the *formatted* text, so a date
      // serial arrives as "2/17/25" and a 100% progress as "100%".
      if (cell.t === 'n' && cell.v !== undefined) cells[col] = String(cell.v)
      else if (cell.w !== undefined) cells[col] = String(cell.w)
      else if (cell.v !== undefined) cells[col] = String(cell.v)
    }
    const fiche = cells[COL.fiche]
    if (!fiche || !isSerial(fiche)) continue
    rows.set(Number(fiche), cells)
  }
  return rows
}

/** "MI1"/"MI2" now exist in nc_dept; the register also writes plain "MI". */
function normaliseDept(v: string | undefined): string | null {
  if (!v) return null
  const t = v.trim().toUpperCase().replace(/\s+/g, '')
  if (['AC', 'CO', 'ET', 'MI', 'MI1', 'MI2', 'RE1', 'RE2', 'RH'].includes(t)) return t
  return null
}

// ── Repair ───────────────────────────────────────────────────────────────────

async function main() {
  const sheet = readWorkbook()
  console.log('Workbook: ' + sheet.size + ' fiches read\n')

  const ncs = await db
    .select()
    .from(nonConformances)
    .where(and(isNull(nonConformances.deletedAt), isNotNull(nonConformances.ncFicheNum)))

  let touched = 0
  const notes: string[] = []

  for (const nc of ncs) {
    const row = sheet.get(nc.ncFicheNum!)
    if (!row) { notes.push('fiche ' + nc.ncFicheNum + ': not found in workbook — skipped'); continue }

    // 1. "X" is a not-applicable placeholder, not a tick, for these two columns:
    //    no NC can be both accepted under concession and scrapped.
    const derogationAuth = isAffirmative(row[COL.derogation])
    const rebut          = isAffirmative(row[COL.rebut])

    // 2. Désignation de R / O — "X" marks the column as applying (per SOPAT),
    //    free text additionally names the risk or the opportunity.
    const rawRisk = (row[COL.risque] ?? '').trim()
    const rawOpp  = (row[COL.opportunite] ?? '').trim()
    const isRisk        = rawRisk.length > 0 && !isSerial(rawRisk)
    const isOpportunity = rawOpp.length > 0 && !isSerial(rawOpp)

    // 3. Date de clôture drives the status — "closed" without one is not auditable.
    const cloture = splitDeadline(row[COL.cloture]).date
    const corrProg = progress(row[COL.corrProgress])
    const acProg   = progress(row[COL.acProgress])
    const started  = (corrProg ?? 0) > 0 || (acProg ?? 0) > 0
    const status: 'open' | 'in_progress' | 'closed' =
      cloture ? 'closed' : started ? 'in_progress' : 'open'

    // 4. Deadlines: real dates vs planning expressions.
    const cp = splitDeadline(row[COL.corrPlanned])
    const ca = splitDeadline(row[COL.corrActual])
    const ep = splitDeadline(row[COL.evalPlanned])
    const ea = splitDeadline(row[COL.evalActual])

    const patch = {
      dept: (normaliseDept(row[COL.processus]) ?? nc.dept) as typeof nc.dept,
      derogationAuth,
      rebut,
      isRisk,
      isOpportunity,
      riskDesignation:        designation(rawRisk),
      opportunityDesignation: designation(rawOpp),
      correctionProgress: corrProg,
      correctionDeadlinePlanned:     cp.date,
      correctionDeadlinePlannedText: cp.text,
      correctionDeadlineActual:      ca.date,
      correctionDeadlineActualText:  ca.text,
      evalDatePlanned: ep.date,
      evalDateActual:  ea.date,
      // "X" placeholders are not data.
      clientResponse:    designation(row[COL.clientDate]),
      clientResponseRef: designation(row[COL.clientRef])?.slice(0, 200) ?? null,
      needsSecondCapa:   isAffirmative(row[COL.secondCapa]),
      status,
      closedAt: cloture,
      closedBy: cloture ? (nc.closedBy ?? nc.createdBy) : null,
      updatedAt: new Date(),
    }

    if (DRY) {
      notes.push(
        'fiche ' + String(nc.ncFicheNum).padStart(2) +
        ' dept=' + patch.dept +
        ' status=' + patch.status +
        ' closed=' + (cloture ? cloture.toISOString().slice(0, 10) : '—') +
        ' derog=' + patch.derogationAuth + ' rebut=' + patch.rebut +
        ' R=' + (patch.isRisk ? (patch.riskDesignation ?? 'oui') : '—') +
        ' O=' + (patch.isOpportunity ? (patch.opportunityDesignation ?? 'oui') : '—') +
        ' corrPlan=' + (cp.date ? cp.date.toISOString().slice(0, 10) : (cp.text ?? '—'))
      )
    } else {
      await db.update(nonConformances).set(patch).where(eq(nonConformances.id, nc.id))
    }
    touched++

    // 5. The matching CAPA row.
    const capas = await db
      .select()
      .from(correctiveActions)
      .where(eq(correctiveActions.ncId, nc.id))

    const acPlanned = splitDeadline(row[COL.acPlanned])
    const acActual  = splitDeadline(row[COL.acActual])
    const acResp    = designation(row[COL.acResponsible])

    for (const capa of capas) {
      const capaPatch = {
        responsibleName:     acResp ?? capa.responsibleName,
        deadlinePlanned:     acPlanned.date,
        deadlinePlannedText: acPlanned.text,
        deadlineActual:      acActual.date,
        deadlineActualText:  acActual.text,
        deadline:            acPlanned.date ?? capa.deadline,
        progressStatus:      acProg !== null ? Math.round(acProg * 100) + '%' : null,
        status: (acProg !== null && acProg >= 1 ? 'closed' : started ? 'in_progress' : 'open') as
          'open' | 'in_progress' | 'closed',
        updatedAt: new Date(),
      }
      if (!DRY) {
        await db.update(correctiveActions).set(capaPatch).where(eq(correctiveActions.id, capa.id))
      }
    }
  }

  console.log((DRY ? '[dry run] would update ' : 'Updated ') + touched + ' NC rows and their CAPAs')
  if (notes.length) console.log('\nNotes:\n' + notes.join('\n'))
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
