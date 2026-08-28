/**
 * FOR-AC-10 export — reproduces the source workbook's own layout.
 *
 * The generic `buildWorkbook` helper renders a flat banner-plus-grid, which
 * cannot express this form: FOR-AC-10 is a header block, three side-by-side
 * column groups, and planned lines whose cells are merged vertically across
 * their delivery and purchase rows. Those merges carry the cardinality — one
 * planned line, many arrivals — so flattening them loses the structure the
 * register exists to show.
 *
 * The sheet is written with live formulas rather than baked values, so the
 * exported file recalculates exactly like the original when a figure is edited
 * in Excel. Three formulas are deliberately NOT copied from the source:
 *
 * 1. `O` (prix total réel). The source has `=L29*I29` on row 29 — valuing only
 *    the first of that line's two deliveries, while `J29` correctly aggregates
 *    both. Rows 10 and 33 do aggregate. The bug understates that chantier by
 *    1 125 TND. Every line here uses `=L*SUM(I…)`.
 *
 * 2. `N` (% écart PU). The source computes `=L/D`, a ratio: an unchanged price
 *    reads 100 %, contradicting column M beside it, which reads 0. The column
 *    header says « % Ecart PU », so the variance `=M/D` is written instead.
 *
 * 3. `I5` (taux de respect de quantité). The source averages the per-line
 *    variance percentages, which weights a 1-unit line the same as a 300-unit
 *    one. It is overall compliance here — `=SUM(I…)/SUM(C…)` — matching
 *    `computeRegister` exactly, so the sheet and the application never disagree.
 *
 * 4. Every ratio is wrapped in IFERROR. The source shows #DIV/0! on the four
 *    lines with a planned quantity of 0, and that error propagates into the
 *    « Taux de respect de quantité » header cell, destroying the indicator.
 *
 * All three are reported to the user; none silently changes stored data.
 */
import ExcelJS from 'exceljs'
import { XLSX_DARK, XLSX_TEAL, XLSX_TINT, XLSX_WHITE } from './brand'
import type { SupplyRegisterRow } from '@/lib/db/supply'

const MONEY = '#,##0.000'
const QTY = '0.###'
const PCT = '0.00%'
const DATE = 'dd/mm/yyyy'

/** First data row, matching the source workbook. */
const FIRST_ROW = 10

const GROUP_HEADERS: [string, string, string][] = [
  ['A', 'E', 'Suivi prévisionnel / Devis validé par le client'],
  ['F', 'Q', 'Suivi réel'],
  ['R', 'W', "Suivi d'achat"],
]

const COLUMN_HEADERS: [string, string, number][] = [
  ['A', 'Désignation', 38],
  ['B', 'Norme', 11],
  ['C', 'Quantité', 10],
  ['D', 'Prix unitaire HTVA', 15],
  ['E', 'Prix total HTVA', 15],
  ['F', 'DATE', 12],
  ['G', 'FOURNISSEURS', 26],
  ['H', 'N° DU BL', 12],
  ['I', 'QUANTITE', 10],
  ['J', 'Ecart de Quantité', 12],
  ['K', '% Ecart Quantité', 12],
  ['L', 'P.U.H.T', 13],
  ['M', 'Ecart PU', 12],
  ['N', '% Ecart PU', 12],
  ['O', 'P.TOTAL HTVA', 15],
  ['P', 'Ecart PT', 14],
  ['Q', '% Ecart PT', 12],
  ['R', 'Fournisseurs', 26],
  ['S', 'Norme', 11],
  ['T', 'Quantité', 10],
  ['U', "Prix unitaire d'achat HTVA", 16],
  ['V', "Prix total d'achat HTVA", 16],
  ['W', "Prix total d'achat TTC", 16],
  ['X', 'Observations', 30],
]

const THIN = { style: 'thin' as const, color: { argb: 'FFBFCFCB' } }
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

export const SUPPLY_FORM_REVISION = 4

export async function buildSupplyWorkbook(register: SupplyRegisterRow): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SOPAT ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('Approvisionnement', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  for (const [col, , width] of COLUMN_HEADERS) ws.getColumn(col).width = width

  // ── Title band (rows 1-2), form code top-right as in the source ──
  ws.mergeCells('B1:W2')
  const title = ws.getCell('B1')
  title.value = "Suivi d'approvisionnement de chantier"
  title.font = { size: 15, bold: true, color: { argb: XLSX_WHITE } }
  title.alignment = { vertical: 'middle', horizontal: 'center' }
  for (let c = 1; c <= 24; c++) {
    for (let r = 1; r <= 2; r++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TEAL } }
    }
  }
  const code = ws.getCell('X1')
  code.value = 'FOR-AC-10'
  code.font = { size: 10, bold: true, color: { argb: XLSX_WHITE } }
  code.alignment = { vertical: 'middle', horizontal: 'center' }
  const rev = ws.getCell('X2')
  rev.value = SUPPLY_FORM_REVISION
  rev.font = { size: 10, color: { argb: XLSX_WHITE } }
  rev.alignment = { vertical: 'middle', horizontal: 'center' }

  // ── Header block (rows 4-6) ──
  // Row indices for the formulas below are filled in once the data is written.
  const label = (addr: string, text: string) => {
    const cell = ws.getCell(addr)
    cell.value = text
    cell.font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
  }

  label('A4', 'Date de MAJ:')
  ws.getCell('B4').value = register.updatedAt
  ws.getCell('B4').numFmt = DATE

  label('A5', 'Projet :')
  ws.mergeCells('B5:C5')
  ws.getCell('B5').value = register.project.name

  label('A6', 'Client :')
  ws.mergeCells('B6:C6')
  ws.getCell('B6').value = register.project.clientName

  label('D4', 'Réf Projet :')
  ws.getCell('E4').value = register.project.reference

  label('D5', 'Date de démarrage :')
  if (register.project.startDate) {
    ws.getCell('E5').value = register.project.startDate
    ws.getCell('E5').numFmt = DATE
  }

  label('D6', 'Date de fin :')
  // The source stores the text "En cours" in this cell when the chantier is
  // open; that is exactly `actual_delivery_date IS NULL` in the application.
  if (register.project.endDate) {
    ws.getCell('E6').value = register.project.endDate
    ws.getCell('E6').numFmt = DATE
  } else {
    ws.getCell('E6').value = 'En cours'
  }

  label('F4', 'Coût total prévisionnel :')
  label('F5', 'Coût total réel :')
  label('H4', 'Taux de respect du coût :')
  label('H5', 'Taux de respect de quantité :')

  // ── Group headers (row 8) and column headers (row 9) ──
  for (const [from, to, text] of GROUP_HEADERS) {
    ws.mergeCells(`${from}8:${to}8`)
    const cell = ws.getCell(`${from}8`)
    cell.value = text
    cell.font = { bold: true, size: 11, color: { argb: XLSX_WHITE } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }
  }
  ws.mergeCells('X8:X9')
  const obsHeader = ws.getCell('X8')
  obsHeader.value = 'Observations'
  obsHeader.font = { bold: true, size: 11, color: { argb: XLSX_WHITE } }
  obsHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  obsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }

  ws.getRow(9).height = 30
  for (const [col, header] of COLUMN_HEADERS) {
    if (col === 'X') continue
    const cell = ws.getCell(`${col}9`)
    cell.value = header
    cell.font = { bold: true, size: 9, color: { argb: XLSX_DARK } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
    cell.border = BORDER
  }

  // ── Data rows ──
  let row = FIRST_ROW

  for (const item of register.items) {
    // The line occupies as many rows as its longest child list — exactly what
    // the source's vertical merges express.
    const span = Math.max(1, item.deliveries.length, item.purchases.length)
    const first = row
    const last = row + span - 1
    const deliveryRange = `I${first}:I${last}`

    // Planned columns — one value for the whole span.
    ws.getCell(`A${first}`).value = item.designation
    ws.getCell(`B${first}`).value = item.norme ?? null
    ws.getCell(`C${first}`).value = item.plannedQuantity
    ws.getCell(`C${first}`).numFmt = QTY
    ws.getCell(`D${first}`).value = item.plannedUnitPriceHtva
    ws.getCell(`D${first}`).numFmt = MONEY
    ws.getCell(`E${first}`).value = { formula: `D${first}*C${first}` }
    ws.getCell(`E${first}`).numFmt = MONEY

    // Real unit price: a formula when it simply follows the devis (the source's
    // `=D10`), a literal when the user overrode it — which is what makes M and
    // N non-zero.
    if (item.actualUnitPriceHtva === null) {
      ws.getCell(`L${first}`).value = { formula: `D${first}` }
    } else {
      ws.getCell(`L${first}`).value = item.actualUnitPriceHtva
    }
    ws.getCell(`L${first}`).numFmt = MONEY

    ws.getCell(`J${first}`).value = { formula: `SUM(${deliveryRange})-C${first}` }
    ws.getCell(`J${first}`).numFmt = QTY
    ws.getCell(`K${first}`).value = { formula: `IFERROR(J${first}/C${first},"")` }
    ws.getCell(`K${first}`).numFmt = PCT
    ws.getCell(`M${first}`).value = { formula: `L${first}-D${first}` }
    ws.getCell(`M${first}`).numFmt = MONEY
    ws.getCell(`N${first}`).value = { formula: `IFERROR(M${first}/D${first},"")` }
    ws.getCell(`N${first}`).numFmt = PCT
    ws.getCell(`O${first}`).value = { formula: `L${first}*SUM(${deliveryRange})` }
    ws.getCell(`O${first}`).numFmt = MONEY
    ws.getCell(`P${first}`).value = { formula: `O${first}-E${first}` }
    ws.getCell(`P${first}`).numFmt = MONEY
    ws.getCell(`Q${first}`).value = { formula: `IFERROR(P${first}/E${first},"")` }
    ws.getCell(`Q${first}`).numFmt = PCT

    ws.getCell(`X${first}`).value = item.observations ?? null
    ws.getCell(`X${first}`).alignment = { wrapText: true, vertical: 'top' }

    // Deliveries — one row each, the only per-row values in the « Suivi réel »
    // group besides the merged variance columns.
    item.deliveries.forEach((d, i) => {
      const r = first + i
      if (d.deliveryDate) {
        ws.getCell(`F${r}`).value = new Date(`${d.deliveryDate}T00:00:00Z`)
        ws.getCell(`F${r}`).numFmt = DATE
      }
      ws.getCell(`G${r}`).value = d.supplierName ?? null
      ws.getCell(`H${r}`).value = d.blNumber ?? null
      ws.getCell(`I${r}`).value = d.quantity
      ws.getCell(`I${r}`).numFmt = QTY
    })

    // Purchases — an independent list, never aligned with the deliveries.
    item.purchases.forEach((p, i) => {
      const r = first + i
      ws.getCell(`R${r}`).value = p.supplierName ?? null
      ws.getCell(`S${r}`).value = p.norme ?? null
      ws.getCell(`T${r}`).value = p.quantity
      ws.getCell(`T${r}`).numFmt = QTY
      ws.getCell(`U${r}`).value = p.unitPriceHtva
      ws.getCell(`U${r}`).numFmt = MONEY
      ws.getCell(`V${r}`).value = { formula: `U${r}*T${r}` }
      ws.getCell(`V${r}`).numFmt = MONEY
      // TTC as a real formula over the stored rate. With rate 0 this yields
      // `=V*(1+0)`, i.e. the source's `=V`, so nothing changes for existing data.
      ws.getCell(`W${r}`).value = { formula: `V${r}*(1+${p.vatRate})` }
      ws.getCell(`W${r}`).numFmt = MONEY
    })

    // Vertical merges: what makes one planned line span its children.
    if (span > 1) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'X']) {
        ws.mergeCells(`${col}${first}:${col}${last}`)
      }
    }

    for (let r = first; r <= last; r++) {
      for (let c = 1; c <= 24; c++) {
        const cell = ws.getCell(r, c)
        cell.border = BORDER
        if (!cell.alignment) cell.alignment = { vertical: 'top' }
      }
    }
    for (const col of ['A', 'B', 'C', 'D', 'E', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']) {
      ws.getCell(`${col}${first}`).alignment = { vertical: 'middle', wrapText: col === 'A' }
    }

    row = last + 1
  }

  const lastDataRow = Math.max(FIRST_ROW, row - 1)
  const totalsRow = row + 1

  // ── Totals row, mirroring the source's row 36 ──
  ws.mergeCells(`B${totalsRow}:E${totalsRow}`)
  label(`A${totalsRow}`, 'Somme du devis (HTVA)')
  ws.getCell(`B${totalsRow}`).value = { formula: `SUM(E${FIRST_ROW}:E${lastDataRow})` }
  ws.getCell(`B${totalsRow}`).numFmt = MONEY

  ws.mergeCells(`G${totalsRow}:Q${totalsRow}`)
  label(`F${totalsRow}`, 'Somme facturée au client')
  ws.getCell(`G${totalsRow}`).value = { formula: `SUM(O${FIRST_ROW}:O${lastDataRow})` }
  ws.getCell(`G${totalsRow}`).numFmt = MONEY

  ws.mergeCells(`S${totalsRow}:W${totalsRow}`)
  label(`R${totalsRow}`, 'Somme des dépenses')
  ws.getCell(`S${totalsRow}`).value = { formula: `SUM(W${FIRST_ROW}:W${lastDataRow})` }
  ws.getCell(`S${totalsRow}`).numFmt = MONEY

  for (let c = 1; c <= 24; c++) {
    const cell = ws.getCell(totalsRow, c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
    cell.border = BORDER
    cell.font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
  }

  // ── Header indicators, now that the data range is known ──
  ws.getCell('G4').value = { formula: `SUM(E${FIRST_ROW}:E${lastDataRow})` }
  ws.getCell('G4').numFmt = MONEY
  ws.getCell('G5').value = { formula: `SUM(O${FIRST_ROW}:O${lastDataRow})` }
  ws.getCell('G5').numFmt = MONEY
  ws.getCell('I4').value = { formula: 'IFERROR(G5/G4,"")' }
  ws.getCell('I4').numFmt = '0%'
  // Overall compliance: every delivered unit over every planned unit. NOT
  // AVERAGE(K…) — see the note at the top of this file, and supply-calc.ts.
  // Column C is merged per planned line, so its slaves are empty and SUM
  // counts each planned quantity exactly once.
  ws.getCell('I5').value = {
    formula: `IFERROR(SUM(I${FIRST_ROW}:I${lastDataRow})/SUM(C${FIRST_ROW}:C${lastDataRow}),"")`,
  }
  ws.getCell('I5').numFmt = PCT

  for (const addr of ['G4', 'G5', 'I4', 'I5']) {
    ws.getCell(addr).font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
  }

  // ── Note recording the three corrections, so the file explains itself ──
  const noteRow = totalsRow + 2
  ws.mergeCells(`A${noteRow}:X${noteRow + 2}`)
  const note = ws.getCell(`A${noteRow}`)
  note.value =
    "Export SOPAT — FOR-AC-10. Quatre écarts assumés avec le classeur d'origine : " +
    "le prix total réel (O) agrège toutes les livraisons de la ligne ; " +
    "le « % Ecart PU » (N) calcule un écart (M/D) et non un ratio (L/D) ; " +
    "le taux de respect de quantité (I5) rapporte le total livré au total prévu " +
    "au lieu de moyenner les pourcentages de chaque ligne ; " +
    "les pourcentages sont protégés par IFERROR au lieu d'afficher #DIV/0!."
  note.font = { italic: true, size: 9, color: { argb: XLSX_DARK } }
  note.alignment = { wrapText: true, vertical: 'top' }

  // ExcelJS types its own Buffer; Uint8Array is what NextResponse needs anyway.
  return new Uint8Array(await wb.xlsx.writeBuffer())
}
