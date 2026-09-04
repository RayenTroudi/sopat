/**
 * FOR-MI-14 export — reproduces the controlled form's own layout.
 *
 * The geometry below is read off the seven source workbooks (version 2.0,
 * campaign of 29–30 May 2025), not invented: seven columns at the source's own
 * widths, the same merged regions, the same header block, the same four
 * metadata rows, the same four-column table, and the same signature block.
 *
 *   A1:A2  letterhead   B1:D2  « Programme d'Audit »   E1  FOR-MI-14   E2  version
 *   A4:B4  Date de l'audit            C4:E4  value
 *   A5:B5  Processus / Activité       C5:E5  value
 *   A6:B6  Equipe de l'audit          C6:E6  value
 *   A7:E7  Document(s) de référence
 *   A8 | B8 | C8:D8 | E8              table header
 *   A9:A{n} horaire  B9:B{n} clauses  C:D one row per step  E9:E{n} interlocuteurs
 *   A{n+1}:E{n+1}  Date et Signature de l'auditeur
 *
 * Everything printed comes from the canonical tables — audit_programs,
 * audit_program_clauses, audit_program_items, qms_processes — so the sheet and
 * the register cannot disagree. Nothing is recomputed from the workbooks.
 *
 * What the controlled form has no field for, and where it goes
 * -----------------------------------------------------------
 * The form predates the ERP and carries no cell for four things the register
 * holds. Rather than bend the controlled layout around them, the form sheet is
 * reproduced as issued and they are placed as follows:
 *
 *   * the programme reference (AUD-DEPT-YYYY-NN) goes in E3, the empty cell
 *     directly under the form code — the block that already identifies the
 *     document. This is the one addition to the form sheet, and it is a
 *     document identifier, not a requirement;
 *   * scope, objectives, status and the execution record (conformity, objective
 *     evidence, observations, the non-conformity each finding raised) go on a
 *     second sheet, « Exécution ». The controlled form is a PLAN; results were
 *     never part of it, and writing them into it would misrepresent the form.
 *
 * The source's « Référentiel ISO 14001 » sub-heading is reproduced because it is
 * part of the form, with an empty value: that column is present and blank in all
 * seven source workbooks, and no environmental clause has been invented to fill
 * it.
 *
 * The letterhead cell holds an image in the source workbooks. It is left as a
 * bordered block carrying the company name — the ERP has no copy of that logo
 * asset, and a substituted graphic would be a worse lie than an honest blank.
 */
import ExcelJS from 'exceljs'
import { XLSX_DARK, XLSX_TINT, XLSX_WHITE } from './brand'
import type { AuditProgramRow, AuditProgramItemRow } from '@/lib/db/iso'

/** Column widths as the source workbooks set them. */
const COLUMNS: [string, number][] = [
  ['A', 14.4], ['B', 20.3], ['C', 19.9], ['D', 25.4], ['E', 14.1], ['F', 10], ['G', 10],
]

const THIN = { style: 'thin' as const, color: { argb: 'FF9AA8A3' } }
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }
const CENTER = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true }
const LEFT = { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true }

const CONFORMITY_LABEL: Record<string, string> = {
  C:  'Conforme',
  NC: 'Non-conforme',
  NA: 'Non applicable',
  PA: "Piste d'amélioration",
}

const STATUS_LABEL: Record<string, string> = {
  planifie: 'Planifié', en_cours: 'En cours', realise: 'Réalisé',
  reporte: 'Reporté', annule: 'Annulé',
}

export type AuditProgrammeExport = AuditProgramRow & {
  items: AuditProgramItemRow[]
  /** From the cartography — the form prints the full process name, not its code. */
  processName: string
  /** Version of the controlled form the programme was established on. */
  formVersion: string
}

export async function buildAuditProgrammeWorkbook(
  programme: AuditProgrammeExport,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SOPAT ERP'
  wb.created = new Date()

  buildFormSheet(wb, programme)
  buildExecutionSheet(wb, programme)

  return (await wb.xlsx.writeBuffer()) as unknown as Uint8Array
}

// ─── Sheet 1 — the controlled form ───────────────────────────────────────────

function buildFormSheet(wb: ExcelJS.Workbook, p: AuditProgrammeExport) {
  const ws = wb.addWorksheet("Programme d'audit", {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
                 margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  })
  for (const [col, width] of COLUMNS) ws.getColumn(col).width = width

  // ── Header block ──────────────────────────────────────────────────────────
  ws.mergeCells('A1:A2')
  const letterhead = ws.getCell('A1')
  letterhead.value = 'SOPAT'
  letterhead.font = { name: 'Calibri', size: 14, bold: true, color: { argb: XLSX_WHITE } }
  letterhead.alignment = CENTER
  letterhead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }
  letterhead.border = BORDER

  ws.mergeCells('B1:D2')
  const title = ws.getCell('B1')
  title.value = "Programme d'Audit"
  title.font = { name: 'Calibri', size: 12, bold: true }
  title.alignment = CENTER
  title.border = BORDER

  const code = ws.getCell('E1')
  code.value = 'FOR-MI-14'
  code.font = { name: 'Calibri', size: 10, bold: true }
  code.alignment = CENTER
  code.border = BORDER

  const version = ws.getCell('E2')
  version.value = p.formVersion
  version.font = { name: 'Calibri', size: 10, bold: true }
  version.alignment = CENTER
  version.border = BORDER

  // The one addition to the form sheet — see the module note.
  const reference = ws.getCell('E3')
  reference.value = p.reference
  reference.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF346158' } }
  reference.alignment = CENTER
  reference.border = BORDER

  ws.getRow(1).height = 24
  ws.getRow(2).height = 24
  ws.getRow(3).height = 16

  // ── Metadata rows ─────────────────────────────────────────────────────────
  metaRow(ws, 4, "Date de l’audit :", p.scheduledDate ? new Date(p.scheduledDate) : null, 'date')
  metaRow(ws, 5, 'Processus / Activité audité(s) :', p.processName)
  metaRow(ws, 6, "Equipe de l'audit :", p.auditorName ?? '')

  ws.mergeCells('A7:E7')
  const docs = ws.getCell('A7')
  docs.value = `Document(s) de référence  : ${p.referenceDocuments ?? ''}`
  docs.font = { name: 'Calibri', size: 10, bold: true }
  docs.alignment = LEFT
  docs.border = BORDER
  ws.getRow(7).height = 22

  // ── Table header ──────────────────────────────────────────────────────────
  const head = ws.getRow(8)
  head.height = 34
  const headings: Array<[string, string]> = [
    ['A8', 'Horaire'],
    ['B8', 'Référentiel ISO 9001\nRéférentiel ISO 14001'],
    ['C8', 'Etapes du processus'],
    ['E8', 'Interlocuteurs à rencontrer'],
  ]
  ws.mergeCells('C8:D8')
  for (const [ref, text] of headings) {
    const cell = ws.getCell(ref)
    cell.value = text
    cell.font = { name: 'Calibri', size: 10, bold: true }
    cell.alignment = CENTER
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
    cell.border = BORDER
  }
  ws.getCell('D8').border = BORDER

  // ── Body ──────────────────────────────────────────────────────────────────
  const steps = [...p.items].sort((a, b) => a.sortOrder - b.sortOrder)
  const first = 9
  const last = Math.max(first, first + steps.length - 1)

  steps.forEach((item, i) => {
    const row = first + i
    ws.mergeCells(`C${row}:D${row}`)
    const label = ws.getCell(`C${row}`)
    label.value = item.agendaStep
    label.font = { name: 'Calibri', size: 11 }
    label.alignment = LEFT
    label.border = BORDER
    ws.getCell(`D${row}`).border = BORDER
    ws.getRow(row).height = 28
  })

  // The source keeps one horaire, one clause list and one interlocutor list for
  // the whole table, each merged down the body — reproduced here.
  ws.mergeCells(`A${first}:A${last}`)
  const horaire = ws.getCell(`A${first}`)
  horaire.value = p.scheduledStartTime && p.scheduledEndTime
    ? `${p.scheduledStartTime} à ${p.scheduledEndTime}` : ''
  horaire.font = { name: 'Calibri', size: 10 }
  horaire.alignment = CENTER
  horaire.border = BORDER

  ws.mergeCells(`B${first}:B${last}`)
  const clauses = ws.getCell(`B${first}`)
  // ISO 9001 on the first line, the form's ISO 14001 line left blank.
  clauses.value = p.clauseCodes.length > 0 ? p.clauseCodes.join('; ') : (p.criteria ?? '')
  clauses.font = { name: 'Calibri', size: 10 }
  clauses.alignment = CENTER
  clauses.border = BORDER

  ws.mergeCells(`E${first}:E${last}`)
  const interlocuteurs = ws.getCell(`E${first}`)
  interlocuteurs.value = firstInterlocuteurs(steps) ?? (p.auditeeResponsible ?? '')
  interlocuteurs.font = { name: 'Calibri', size: 10 }
  interlocuteurs.alignment = CENTER
  interlocuteurs.border = BORDER

  for (let r = first; r <= last; r++) {
    for (const c of ['A', 'B', 'C', 'D', 'E']) ws.getCell(`${c}${r}`).border = BORDER
  }

  // ── Signature block ───────────────────────────────────────────────────────
  const sigRow = last + 1
  ws.mergeCells(`A${sigRow}:E${sigRow}`)
  const sig = ws.getCell(`A${sigRow}`)
  sig.value = p.auditorSignedAt
    ? `Date et Signature de l’auditeur : ${formatDate(new Date(p.auditorSignedAt))}`
    : 'Date et Signature de l’auditeur :'
  sig.font = { name: 'Calibri', size: 10, bold: true }
  sig.alignment = LEFT
  sig.border = BORDER
  ws.getRow(sigRow).height = 22

  const space = sigRow + 1
  ws.mergeCells(`A${space}:E${space}`)
  ws.getCell(`A${space}`).border = BORDER
  ws.getRow(space).height = 46

  ws.pageSetup.printArea = `\$A\$1:\$E\$${space}`
}

function metaRow(
  ws: ExcelJS.Worksheet, row: number, label: string,
  value: string | Date | null, kind: 'text' | 'date' = 'text',
) {
  ws.mergeCells(`A${row}:B${row}`)
  const l = ws.getCell(`A${row}`)
  l.value = label
  l.font = { name: 'Calibri', size: 10, bold: true }
  l.alignment = LEFT
  l.border = BORDER
  ws.getCell(`B${row}`).border = BORDER

  ws.mergeCells(`C${row}:E${row}`)
  const v = ws.getCell(`C${row}`)
  if (kind === 'date' && value instanceof Date) {
    v.value = value
    v.numFmt = 'dd/mm/yyyy'
  } else {
    v.value = (value as string) ?? ''
  }
  v.font = { name: 'Calibri', size: 10, bold: true }
  v.alignment = CENTER
  v.border = BORDER
  for (const c of ['D', 'E']) ws.getCell(`${c}${row}`).border = BORDER
  ws.getRow(row).height = 22
}

/** The form prints one interlocutor list for the whole audit. */
function firstInterlocuteurs(items: AuditProgramItemRow[]): string | null {
  const found = items.find((i) => (i.interlocuteurs ?? '').trim())
  return found?.interlocuteurs ?? null
}

// ─── Sheet 2 — what the controlled form has no field for ─────────────────────

function buildExecutionSheet(wb: ExcelJS.Workbook, p: AuditProgrammeExport) {
  const ws = wb.addWorksheet('Exécution', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ws.columns = [
    { key: 'step', width: 42 }, { key: 'clauses', width: 22 }, { key: 'type', width: 16 },
    { key: 'conformity', width: 18 }, { key: 'response', width: 46 },
    { key: 'evidence', width: 40 }, { key: 'nc', width: 16 },
  ]

  const banner = ws.getCell('A1')
  ws.mergeCells('A1:G1')
  banner.value = `${p.reference} — enregistrement d'exécution (hors formulaire FOR-MI-14)`
  banner.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XLSX_WHITE } }
  banner.alignment = LEFT
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }
  ws.getRow(1).height = 24

  let row = 3
  const info: Array<[string, string]> = [
    ['Statut', STATUS_LABEL[p.status] ?? p.status],
    ['Périmètre', p.scope ?? '—'],
    ['Objectifs', p.objectives ?? '—'],
    ['Responsable audité', p.auditeeResponsible ?? '—'],
    ['Date réalisée', p.actualDate ? formatDate(new Date(p.actualDate)) : '—'],
    ['Constats de synthèse', p.findings ?? '—'],
    ['Code GED', p.dmsDocumentCode ?? '—'],
  ]
  for (const [label, value] of info) {
    const l = ws.getCell(`A${row}`)
    l.value = label
    l.font = { name: 'Calibri', size: 10, bold: true }
    l.alignment = LEFT
    ws.mergeCells(`B${row}:G${row}`)
    const v = ws.getCell(`B${row}`)
    v.value = value
    v.font = { name: 'Calibri', size: 10 }
    v.alignment = LEFT
    row++
  }

  row++
  const headers = ['Étape du processus', 'Clauses ISO', 'Type de critère', 'Conformité',
                   'Observations', 'Preuves objectives', 'NC ouverte']
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 10, bold: true }
    cell.alignment = CENTER
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
    cell.border = BORDER
  })
  ws.getRow(row).height = 26
  row++

  for (const item of [...p.items].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const values = [
      item.agendaStep,
      item.clauseCodes.length > 0 ? item.clauseCodes.join('; ') : '—',
      item.criterionType === 'process' ? 'Critère processus' : 'Exigence ISO',
      item.conformity ? (CONFORMITY_LABEL[item.conformity] ?? item.conformity) : 'Non évalué',
      item.response ?? '',
      item.evidence ?? '',
      item.ncReference ?? (item.ncId ? 'NC liée' : ''),
    ]
    values.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1)
      cell.value = v
      cell.font = { name: 'Calibri', size: 10 }
      cell.alignment = i === 0 || i > 3 ? LEFT : CENTER
      cell.border = BORDER
    })
    if (item.conformity === 'NC') {
      ws.getCell(row, 4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } }
    }
    ws.getRow(row).height = 30
    row++
  }
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
