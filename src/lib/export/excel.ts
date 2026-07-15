import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import path from 'path'
import { XLSX_TEAL, XLSX_DARK, XLSX_TINT, XLSX_WHITE } from './brand'

export type ExcelFormat = 'text' | 'number' | 'currency' | 'date'

export type ExcelColumn = {
  header: string
  key: string
  width?: number
  format?: ExcelFormat
}

export type ExcelSheet = {
  name: string
  columns: ExcelColumn[]
  rows: Record<string, unknown>[]
  summary?: { label: string; value: string | number }[]
}

// Thème « SOPAT Portfolio » : bandeau vert d'eau, en-têtes vert foncé,
// zébrures en teinte claire dérivée.
const TEAL  = XLSX_TEAL
const DARK  = XLSX_DARK
const WHITE = XLSX_WHITE
const LIGHT = XLSX_TINT

function numFmt(format?: ExcelFormat): string | undefined {
  switch (format) {
    case 'currency': return '#,##0.000'
    case 'number': return '#,##0.##'
    case 'date': return 'dd/mm/yyyy'
    default: return undefined
  }
}

/**
 * Construit un classeur Excel aux couleurs SOPAT : logo, titre, date
 * d'export, en-têtes stylés, colonnes dimensionnées, formats FR.
 */
export async function buildWorkbook(opts: {
  title: string
  department: string
  sheets: ExcelSheet[]
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SOPAT ERP'
  wb.created = new Date()

  // Logo blanc sur le bandeau vert d'eau (variante générée depuis le logo teal).
  let logoId: number | null = null
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-sopat-white.png')
    logoId = wb.addImage({ buffer: readFileSync(logoPath) as unknown as ExcelJS.Buffer, extension: 'png' })
  } catch {
    // logo introuvable : on continue sans image
  }

  for (const sheet of opts.sheets) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: 'frozen', ySplit: 5 }],
    })

    const colCount = sheet.columns.length

    // ── Bandeau vert d'eau (thème portfolio) ──
    const bandCols = Math.max(colCount, 4)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= bandCols; c++) {
        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } }
      }
    }
    if (logoId != null) {
      ws.addImage(logoId, { tl: { col: 0.15, row: 0.1 }, ext: { width: 72, height: 72 } })
    }
    ws.mergeCells(1, 2, 1, bandCols)
    const titleCell = ws.getCell(1, 2)
    titleCell.value = opts.title
    titleCell.font = { size: 16, bold: true, color: { argb: WHITE } }
    titleCell.alignment = { vertical: 'middle' }
    ws.getRow(1).height = 28

    ws.mergeCells(2, 2, 2, bandCols)
    const deptCell = ws.getCell(2, 2)
    deptCell.value = opts.department
    deptCell.font = { size: 11, color: { argb: 'FFD9EAE5' } }

    ws.mergeCells(3, 2, 3, bandCols)
    const dateCell = ws.getCell(3, 2)
    dateCell.value = `Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    dateCell.font = { size: 10, italic: true, color: { argb: 'FFD9EAE5' } }
    ws.getRow(4).height = 6

    // ── En-têtes (cartes vert foncé du portfolio) ──
    const headerRow = ws.getRow(5)
    sheet.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = col.header
      cell.font = { bold: true, color: { argb: WHITE }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: TEAL } } }
    })
    headerRow.height = 22

    // ── Données ──
    sheet.rows.forEach((row, rIdx) => {
      const wsRow = ws.getRow(6 + rIdx)
      sheet.columns.forEach((col, cIdx) => {
        const cell = wsRow.getCell(cIdx + 1)
        const raw = row[col.key]
        if (raw == null || raw === '') {
          cell.value = '—'
          cell.font = { color: { argb: 'FFAAAAAA' }, size: 10 }
        } else if (col.format === 'date') {
          cell.value = raw instanceof Date ? raw : new Date(String(raw))
        } else if (col.format === 'currency' || col.format === 'number') {
          cell.value = Number(raw)
        } else {
          cell.value = String(raw)
        }
        const fmt = numFmt(col.format)
        if (fmt) cell.numFmt = fmt
        if (rIdx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
        }
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } }
        cell.alignment = { vertical: 'middle', wrapText: true }
      })
    })

    // ── Synthèse ──
    if (sheet.summary?.length) {
      const start = 6 + sheet.rows.length + 1
      sheet.summary.forEach((s, i) => {
        const labelCell = ws.getCell(start + i, 1)
        labelCell.value = s.label
        labelCell.font = { bold: true, color: { argb: DARK } }
        const valueCell = ws.getCell(start + i, 2)
        valueCell.value = s.value
        valueCell.font = { bold: true }
        if (typeof s.value === 'number') valueCell.numFmt = '#,##0.000'
      })
    }

    // ── Largeurs ──
    sheet.columns.forEach((col, i) => {
      const maxData = Math.max(
        col.header.length,
        ...sheet.rows.map((r) => String(r[col.key] ?? '').length),
      )
      ws.getColumn(i + 1).width = col.width ?? Math.min(Math.max(maxData + 3, 10), 50)
    })

    ws.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: colCount },
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
