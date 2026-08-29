/**
 * FOR-CO-02 export — reproduces the official document's own layout.
 *
 * Seven columns, exactly as the source: N° | Désignation | Norme | Unité | Qté
 * | P.U. | Montant, a header block above them, a « RECAPITULATIF GENERAL »
 * below, then the commercial block. The sheet is written with LIVE formulas
 * rather than baked values, so an exported file recalculates like the original
 * when a figure is edited in Excel — and re-imports into an identical model.
 *
 * What is deliberately NOT copied from the source, and why
 * -------------------------------------------------------
 * 1. **The twelve `#REF!` subtotals.** Nine `=SUM(#REF!)`, two `=#REF!` and
 *    one `=#REF!+#REF!` sit in the source's « TOTAL PARTIEL HTVA » cells, and
 *    four more of those rows carry no formula at all. Every subtotal here is a
 *    real `SUM` over the real rows above it.
 * 2. **The seventeen category banner formulas.** Each category row of the
 *    source holds `=F{row}*E{row}` inside a MERGED LABEL cell. It is a
 *    leftover that multiplies a row with no figures by itself; a banner here
 *    is a banner, and carries no formula.
 * 3. **The recap's self-referential N° cells** (`=+A46`, `=A74`, …). The recap
 *    is generated from the model, and each of its amounts is a live reference
 *    to the subtotal row it summarises, so the two can never disagree.
 * 4. **The source's absent numbering.** The body skips II.12 and prints II.17
 *    twice. The BODY is reproduced exactly as the source prints it — that is
 *    the document people recognise — while the recap prints the corrected
 *    1…17 it already had. Both come from stored columns; neither is invented.
 *
 * One thing is ADDED that the source does not have: a TVA line and a TTC line
 * under the general total. The source stops at « TOTAL GENERAL » and then asks
 * for the T.T.C. sum in words, with no rate and no VAT row anywhere — so the
 * document could not show how it got from one to the other. The rate shown is
 * the offer's own; a document at 0 % prints 0, exactly as before.
 */
import ExcelJS from 'exceljs'
import { XLSX_DARK, XLSX_TEAL, XLSX_TINT, XLSX_WHITE } from './brand'
import type { BordereauLineRow, BordereauRow } from '@/lib/db/bordereau'

const MONEY = '#,##0.000'
const QTY = '0.###'
const DATE = 'dd/mm/yyyy'

const THIN = { style: 'thin' as const, color: { argb: 'FFBFCFCB' } }
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

/** N° | Désignation | Norme | Unité | Qté | P.U. | Montant */
const COLUMNS: [string, number][] = [
  ['A', 10], ['B', 62], ['C', 14], ['D', 10], ['E', 10], ['F', 14], ['G', 16],
]

type Emitted = {
  /** Rows carrying a `=F*E` line total, per subtotal group. */
  lineRows: number[]
  /** The row a category's « TOTAL PARTIEL HTVA » was written to. */
  subtotalRow: number | null
}

export async function buildBordereauWorkbook(document: BordereauRow): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SOPAT ERP'
  wb.created = new Date()

  const ws = wb.addWorksheet('OFFRE DE PRIX', {
    views: [{ state: 'frozen', ySplit: 7 }],
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  for (const [col, width] of COLUMNS) ws.getColumn(col).width = width

  // ── Title band (rows 1-2), form code top-right as in the source ──────────
  ws.mergeCells('B1:F2')
  const title = ws.getCell('B1')
  title.value = 'BORDEREAU DES PRIX'
  title.font = { size: 15, bold: true, color: { argb: XLSX_WHITE } }
  title.alignment = { vertical: 'middle', horizontal: 'center' }
  for (let c = 1; c <= 7; c++) {
    for (let r = 1; r <= 2; r++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TEAL } }
    }
  }
  const code = ws.getCell('G1')
  code.value = document.offer.documentCode
  code.font = { size: 10, bold: true, color: { argb: XLSX_WHITE } }
  code.alignment = { vertical: 'middle', horizontal: 'center' }
  const rev = ws.getCell('G2')
  rev.value = document.offer.formRevision ?? ''
  rev.font = { size: 10, color: { argb: XLSX_WHITE } }
  rev.alignment = { vertical: 'middle', horizontal: 'center' }

  // ── Header block (rows 3-5), same slots as the source ────────────────────
  const label = (addr: string, text: string) => {
    const cell = ws.getCell(addr)
    cell.value = text
    cell.font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
  }

  label('A3', 'Date : ')
  if (document.offer.offerDate) {
    ws.getCell('B3').value = new Date(document.offer.offerDate)
    ws.getCell('B3').numFmt = DATE
  }
  label('A4', 'Projet :')
  ws.getCell('B4').value = document.offer.projectTitle
  label('A5', 'Localisation : ')
  ws.getCell('B5').value = document.offer.siteLocation ?? ''

  ws.mergeCells('C3:D3'); label('C3', 'Client :')
  ws.mergeCells('E3:G3'); ws.getCell('E3').value = document.offer.clientName ?? ''
  ws.mergeCells('C4:D4'); label('C4', 'Référence projet :')
  ws.mergeCells('E4:G4')
  ws.getCell('E4').value = document.offer.projectReferenceText ?? document.offer.reference
  ws.mergeCells('C5:D5'); label('C5', "Maitre d'ouvrage :")
  ws.mergeCells('E5:G5'); ws.getCell('E5').value = document.offer.maitreDouvrage ?? ''

  // ── Column headers (rows 6-7), F6:G6 merged as in the source ─────────────
  const writeColumnHeader = (top: number) => {
    const bottom = top + 1
    const cells: [string, string][] = [
      ['A', 'N°'], ['B', 'DESIGNATION DES PRESTATIONS'], ['C', 'NORME'],
      ['D', 'UNITE'], ['E', 'QTE'],
    ]
    for (const [col, text] of cells) {
      ws.mergeCells(`${col}${top}:${col}${bottom}`)
      const cell = ws.getCell(`${col}${top}`)
      cell.value = text
      cell.font = { bold: true, size: 10, color: { argb: XLSX_WHITE } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    }
    ws.mergeCells(`F${top}:G${top}`)
    const price = ws.getCell(`F${top}`)
    price.value = 'Prix (DT)'
    price.font = { bold: true, size: 10, color: { argb: XLSX_WHITE } }
    price.alignment = { vertical: 'middle', horizontal: 'center' }
    // The source leaves these two sub-headers empty, which is why an importer
    // cannot find the price columns by name. They are named here so a
    // round-tripped file is more legible than the original, without moving
    // either column: the positional contract is unchanged.
    ws.getCell(`F${bottom}`).value = 'P.U.'
    ws.getCell(`G${bottom}`).value = 'Montant'
    for (const col of ['F', 'G']) {
      const c = ws.getCell(`${col}${bottom}`)
      c.font = { bold: true, size: 9, color: { argb: XLSX_WHITE } }
      c.alignment = { vertical: 'middle', horizontal: 'center' }
    }
    for (let c = 1; c <= 7; c++) {
      for (let r = top; r <= bottom; r++) {
        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }
        ws.getCell(r, c).border = BORDER
      }
    }
  }

  writeColumnHeader(6)
  let row = 8

  const banner = (text: string, sourceCode: string | null, dark: boolean) => {
    ws.getCell(`A${row}`).value = sourceCode ?? ''
    ws.mergeCells(`B${row}:G${row}`)
    const cell = ws.getCell(`B${row}`)
    cell.value = text
    cell.font = { bold: true, size: 11, color: { argb: dark ? XLSX_WHITE : XLSX_DARK } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    for (let c = 1; c <= 7; c++) {
      ws.getCell(row, c).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: dark ? XLSX_TEAL : XLSX_TINT },
      }
      ws.getCell(row, c).border = BORDER
    }
    ws.getCell(`A${row}`).font = { bold: true, size: 11, color: { argb: dark ? XLSX_WHITE : XLSX_DARK } }
    row++
  }

  /** A priceable line. `G` is `=F*E`, live — never a baked amount. */
  const priceLine = (line: BordereauLineRow) => {
    ws.getCell(`A${row}`).value = line.sourceCode ?? ''
    const designation = line.description
      ? `${line.designation} : ${line.description}`
      : line.designation
    ws.getCell(`B${row}`).value = designation
    ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'top' }
    ws.getCell(`C${row}`).value = line.norme ?? ''
    ws.getCell(`D${row}`).value = line.unit ?? ''
    if (line.quantity !== null) {
      ws.getCell(`E${row}`).value = line.quantity
      ws.getCell(`E${row}`).numFmt = QTY
    }
    if (line.unitPrice !== null) {
      ws.getCell(`F${row}`).value = line.unitPrice
      ws.getCell(`F${row}`).numFmt = MONEY
    }
    // Written even when a figure is missing: the formula then evaluates to 0
    // in Excel and the ERP still stores null, so nothing is invented on either
    // side and the sheet stays arithmetically whole.
    ws.getCell(`G${row}`).value = { formula: `F${row}*E${row}` }
    ws.getCell(`G${row}`).numFmt = MONEY
    for (let c = 1; c <= 7; c++) ws.getCell(row, c).border = BORDER
    const at = row
    row++
    return at
  }

  const subtotal = (text: string, rows: number[], strong: boolean) => {
    ws.mergeCells(`A${row}:${strong ? 'E' : 'B'}${row}`)
    const cell = ws.getCell(`A${row}`)
    cell.value = text
    cell.font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
    const target = ws.getCell(`G${row}`)
    // A real SUM over the real rows. The source's `=SUM(#REF!)` is not copied.
    target.value = rows.length ? { formula: `SUM(${rows.map((r) => `G${r}`).join(',')})` } : 0
    target.numFmt = MONEY
    target.font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
    for (let c = 1; c <= 7; c++) {
      ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
      ws.getCell(row, c).border = BORDER
    }
    const at = row
    row++
    return at
  }

  // ── Sections ─────────────────────────────────────────────────────────────
  //
  // `secondLevelRows` maps each section's second-level node to the row its
  // amount ends up on — a line's own row in Section I, a category's subtotal
  // row in Section II. The recap references those rows directly, so it is a
  // view of the body rather than a second copy of it.
  const sectionSubtotalRows: number[] = []
  const secondLevel: { code: string | null; designation: string; amountRow: number }[] = []
  const sectionBoundaries: { section: BordereauLineRow; startIndex: number }[] = []

  for (const section of document.sections) {
    banner(section.designation, section.sourceCode, true)
    if (section.description) {
      ws.getCell(`A${row}`).value = section.sourceCode ?? ''
      ws.mergeCells(`B${row}:G${row}`)
      ws.getCell(`B${row}`).value = section.description
      ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'top' }
      row++
    }

    const startIndex = secondLevel.length
    sectionBoundaries.push({ section, startIndex })
    const sectionRows: number[] = []

    for (const child of section.children) {
      if (child.lineType === 'category') {
        banner(child.designation, child.sourceCode, false)
        const emitted: Emitted = { lineRows: [], subtotalRow: null }
        for (const line of child.children) emitted.lineRows.push(priceLine(line))
        emitted.subtotalRow = subtotal('TOTAL PARTIEL HTVA ', emitted.lineRows, false)
        sectionRows.push(emitted.subtotalRow)
        secondLevel.push({
          code: child.displayCode ?? child.sourceCode,
          designation: child.designation,
          amountRow: emitted.subtotalRow,
        })
      } else {
        const at = priceLine(child)
        sectionRows.push(at)
        secondLevel.push({
          code: child.displayCode ?? child.sourceCode,
          designation: child.designation,
          amountRow: at,
        })
        // A priced line may itself carry children in the ERP model, which the
        // source has none of. They are printed so nothing is silently dropped.
        for (const grandChild of child.children) sectionRows.push(priceLine(grandChild))
      }
    }

    sectionSubtotalRows.push(
      subtotal(`TOTAL PARTIEL ${section.sourceCode ?? ''}`.trim(), sectionRows, true),
    )
  }

  // ── RECAPITULATIF GENERAL ────────────────────────────────────────────────
  ws.mergeCells(`A${row}:G${row}`)
  const recapTitle = ws.getCell(`A${row}`)
  recapTitle.value = 'RECAPITULATIF GENERAL'
  recapTitle.font = { bold: true, size: 12, color: { argb: XLSX_WHITE } }
  recapTitle.alignment = { vertical: 'middle', horizontal: 'center' }
  for (let c = 1; c <= 7; c++) {
    ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TEAL } }
  }
  row++

  ws.getCell(`A${row}`).value = 'N°'
  ws.mergeCells(`B${row}:G${row}`)
  ws.getCell(`B${row}`).value = 'DESIGNATION DES PRESTATIONS'
  for (let c = 1; c <= 7; c++) {
    ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_DARK } }
    ws.getCell(row, c).font = { bold: true, size: 10, color: { argb: XLSX_WHITE } }
    ws.getCell(row, c).border = BORDER
  }
  row++

  const recapSectionRows: number[] = []
  sectionBoundaries.forEach(({ section, startIndex }, i) => {
    const end = i + 1 < sectionBoundaries.length ? sectionBoundaries[i + 1].startIndex : secondLevel.length

    ws.getCell(`A${row}`).value = section.sourceCode ?? ''
    ws.mergeCells(`B${row}:G${row}`)
    ws.getCell(`B${row}`).value = section.designation
    for (let c = 1; c <= 7; c++) {
      ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
      ws.getCell(row, c).font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
    }
    row++

    const entryRows: number[] = []
    for (const entry of secondLevel.slice(startIndex, end)) {
      // The recap prints the CORRECTED numbering; the body above printed the
      // source's own. Both are stored columns — neither is derived here.
      ws.getCell(`A${row}`).value = entry.code ?? ''
      ws.mergeCells(`B${row}:E${row}`)
      ws.getCell(`B${row}`).value = entry.designation
      // A live reference to the body's subtotal: the recap can never drift.
      ws.mergeCells(`F${row}:G${row}`)
      ws.getCell(`F${row}`).value = { formula: `G${entry.amountRow}` }
      ws.getCell(`F${row}`).numFmt = MONEY
      for (let c = 1; c <= 7; c++) ws.getCell(row, c).border = BORDER
      entryRows.push(row)
      row++
    }

    ws.mergeCells(`A${row}:E${row}`)
    ws.getCell(`A${row}`).value = `TOTAL PARTIEL ${section.sourceCode ?? ''} `.trim()
    ws.getCell(`A${row}`).font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
    ws.mergeCells(`F${row}:G${row}`)
    ws.getCell(`F${row}`).value = entryRows.length
      ? { formula: `SUM(${entryRows.map((r) => `F${r}`).join(',')})` }
      : 0
    ws.getCell(`F${row}`).numFmt = MONEY
    ws.getCell(`F${row}`).font = { bold: true, size: 10, color: { argb: XLSX_DARK } }
    for (let c = 1; c <= 7; c++) {
      ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_TINT } }
      ws.getCell(row, c).border = BORDER
    }
    recapSectionRows.push(row)
    row++
  })

  const totalRow = (text: string, formula: string, strong: boolean) => {
    ws.mergeCells(`A${row}:E${row}`)
    ws.getCell(`A${row}`).value = text
    ws.getCell(`A${row}`).font = {
      bold: true, size: strong ? 11 : 10,
      color: { argb: strong ? XLSX_WHITE : XLSX_DARK },
    }
    ws.mergeCells(`F${row}:G${row}`)
    ws.getCell(`F${row}`).value = { formula }
    ws.getCell(`F${row}`).numFmt = MONEY
    ws.getCell(`F${row}`).font = {
      bold: true, size: strong ? 11 : 10,
      color: { argb: strong ? XLSX_WHITE : XLSX_DARK },
    }
    for (let c = 1; c <= 7; c++) {
      ws.getCell(row, c).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: strong ? XLSX_TEAL : XLSX_TINT },
      }
      ws.getCell(row, c).border = BORDER
    }
    const at = row
    row++
    return at
  }

  const htvaRow = totalRow(
    'TOTAL GENERAL = ' + recapSectionRows.map((_, i) => `TOTAL PARTIEL ${document.sections[i]?.sourceCode ?? ''}`).join(' + '),
    recapSectionRows.length ? `SUM(${recapSectionRows.map((r) => `F${r}`).join(',')})` : '0',
    false,
  )

  // The two rows the source does not have. See the header comment.
  const vatPercent = document.offer.vatRate * 100
  const vatRow = totalRow(
    `TVA ${vatPercent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`,
    `ROUND(F${htvaRow}*${document.offer.vatRate},3)`,
    false,
  )
  totalRow('TOTAL GENERAL T.T.C', `F${htvaRow}+F${vatRow}`, true)

  // ── Commercial block ─────────────────────────────────────────────────────
  const freeRow = (text: string, bold = false) => {
    ws.mergeCells(`A${row}:G${row}`)
    const cell = ws.getCell(`A${row}`)
    cell.value = text
    cell.font = { bold, size: 10, color: { argb: XLSX_DARK } }
    cell.alignment = { wrapText: true, vertical: 'top' }
    row++
  }

  freeRow(
    'Arrêté le présent devis à la somme T.T.C de : ' +
    '........................................................................................................................ ' +
    'Dinars, ........................ Millimes',
  )
  freeRow(
    `Offre valable pour : ${document.offer.validityDays ?? '..............'} JOURS `,
  )
  freeRow('Modalités de paiement : ', true)
  for (const milestone of document.milestones) {
    const pct = milestone.percentage.toLocaleString('fr-FR', { maximumFractionDigits: 3 })
    freeRow(`${pct}% ${milestone.label}`)
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Uint8Array(buffer as ArrayBuffer)
}
