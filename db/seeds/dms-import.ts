// db/seeds/dms-import.ts
// Imports all 144 documents from LIS MI 01 into dms_documents.
// Preserves row highlights:
//   - Red TEXT color (FFFF0000) → rowHighlight = 'red'  (eliminated/problematic)
//   - Yellow BG (FFFFFF00)      → rowHighlight = 'none' + status = 'obsolete'
//   - Normal                    → rowHighlight = 'none'
//
// Run: npx tsx db/seeds/dms-import.ts

import 'dotenv/config'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { db } from '../index'
import { dmsDocuments, users } from '../schema'
import { eq } from 'drizzle-orm'

// ─── Color detection via raw XML ─────────────────────────────────────────────

function detectRowHighlights(xlsxPath: string): Map<number, 'red' | 'yellow'> {
  // Unzip xlsx and parse styles + sheet XML
  const tmpDir = path.join(process.cwd(), '.dms_import_tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  // Use XLSX internal zip
  const wb = XLSX.readFile(xlsxPath, { cellStyles: true, bookVBA: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zip = (wb as any).vbaraw || null
  // Alternative: read raw from XLSX.zip if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawZip = (XLSX as any).read(fs.readFileSync(xlsxPath), { type: 'buffer', cellStyles: true, bookVBA: false })

  // Parse the actual style data from the parsed workbook's cells
  const ws = wb.Sheets[wb.SheetNames[0]]
  const range = XLSX.utils.decode_range(ws['!ref']!)

  // Red font xf indices (detected by parsing styles.xml manually before running)
  // These are the xf (cell format) indices that have FFFF0000 font color:
  const RED_FONT_XFS = new Set([
    34, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 58, 60,
    79, 84, 90, 96, 97, 131, 132, 140, 152, 178, 179, 193, 194,
  ])
  // Yellow background xf indices (FFFFFF00 fill):
  const YELLOW_BG_XFS = new Set([
    36, 38, 39, 40, 58, 75, 90, 135, 136, 137, 138, 139, 140,
    195, 196, 209, 210,
  ])

  const rowHighlights = new Map<number, 'red' | 'yellow'>()

  for (let r = 0; r <= range.e.r; r++) {
    let hasRed = false
    let hasYellow = false
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (!cell) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (cell as any).s
      if (!s) continue
      // XLSX parses the fill into s.fgColor.rgb
      const fgRgb = s.fgColor?.rgb?.toUpperCase()
      const fontRgb = s.color?.rgb?.toUpperCase() ?? s.font?.color?.rgb?.toUpperCase()
      if (fgRgb === 'FFFFFF00' || fgRgb === 'FFFF00') hasYellow = true
      if (fontRgb === 'FFFF0000' || fontRgb === 'FF0000') hasRed = true
    }
    const rowNum = r + 1
    if (hasRed && !hasYellow) rowHighlights.set(rowNum, 'red')
    else if (hasYellow) rowHighlights.set(rowNum, 'yellow')
  }

  return rowHighlights
}

// ─── Mapping tables ───────────────────────────────────────────────────────────

const TYPE_TO_CATEGORY: Record<string, string> = {
  FOR: 'formulaire',
  LIS: 'enregistrement',
  PRS: 'cartographie_processus',
  INS: 'instruction',
  ISN: 'instruction',
  ORG: 'procedure',
  PLA: 'plan_qualite',
  PRC: 'procedure',
}

const PROC_TO_DEPT: Record<string, string> = {
  AC: 'finance',
  CO: 'etudes',
  ET: 'etudes',
  MI: 'qualite',
  MQ: 'qualite',
  RE: 'realisation',
  RH: 'rh',
  RSE: 'rse',
}

const TYPE_ISO_CLAUSES: Record<string, string[]> = {
  PRS: ['4.4'],
  PRC: ['7.5'],
  LIS: ['7.5'],
  FOR: ['7.5'],
  INS: ['7.5'],
  ISN: ['7.5'],
  ORG: ['5.1', '5.2'],
  PLA: ['6.1', '6.2'],
}

function excelDateToJS(v: unknown): Date | null {
  if (!v || typeof v !== 'number') return null
  return new Date(Math.round((v - 25569) * 86400 * 1000))
}

// ─── Row highlight overrides (from XML analysis of actual xlsx file) ────────
// Excel row numbers (1-indexed). Verified against sheet XML style indices.
// Red  = red text color (FFFF0000 font) → rowHighlight = 'red'
// Yellow = yellow background (FFFFFF00 fill) → status = 'obsolete'
const RED_ROWS    = new Set([41, 46, 82, 89, 107, 108, 109, 115])  // LIS-RE-01, PLA-MQ-01, PLA-RE-03, ORG-RH-03, FOR-RH-42, FOR-RH-43, PRC-RH-03, PRC-AC-02
const YELLOW_ROWS = new Set([40, 85, 87, 114, 136])                 // LIS-MQ-04, PRC-MQ-01, PRC-MQ-06, PRC-RH-08, FOR-ET-04

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1)

  if (!admin) {
    console.error('No admin user found — run the main seed first.')
    process.exit(1)
  }
  const adminId = admin.id
  console.log('Using admin user:', adminId)

  const filePath = path.resolve('LIS MI 01 Liste des informations documentées internes.xlsx')
  if (!fs.existsSync(filePath)) {
    console.error('Excel file not found:', filePath)
    process.exit(1)
  }

  const wb = XLSX.readFile(filePath, { cellStyles: true })
  const sheetName = wb.SheetNames[0] // "23-10-2020"
  const ws = wb.Sheets[sheetName]
  console.log(`Reading sheet: "${sheetName}"`)

  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]

  // Row 7 (index 6) is the header. Data starts at row 8 (index 7).
  // We keep the raw index so we can map to Excel row numbers for highlight detection.
  const dataRows: Array<{ r: unknown[]; excelRowNum: number }> = rawRows
    .map((r, i) => ({ r, excelRowNum: i + 1 }))
    .filter(({ r }) => r[2] && String(r[2]).trim().length > 3)

  console.log(`Found ${dataRows.length} documents to import\n`)

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const { r: dataRow, excelRowNum } of dataRows) {
    const r = dataRow

    const typeRaw  = String(r[0] || '').trim()
    const procRaw  = String(r[1] || '').trim()
    const codeRaw  = String(r[2] || '').trim()
    const titleRaw = String(r[3] || '').trim().replace(/\r\n|\n/g, ' ')
    const version  = typeof r[5] === 'number' ? r[5] : 1
    const dateVal  = r[6]
    const storageRaw = String(r[7] || '').trim()
    const mdpRaw     = String(r[8] || '').trim()
    const obsRaw     = String(r[9] || '').trim().replace(/\r\n|\n/g, ' ')

    const documentNumber = codeRaw.replace(/\s/g, '')
    if (!documentNumber || documentNumber.length < 5 || !titleRaw) {
      skipped++
      continue
    }

    // Row highlight
    const isRedRow    = RED_ROWS.has(excelRowNum)
    const isYellowRow = YELLOW_ROWS.has(excelRowNum)
    const rowHighlight: 'none' | 'red' | 'green' = isRedRow ? 'red' : 'none'

    // Status
    const effectiveDate = excelDateToJS(dateVal)
    let status: 'draft' | 'effective' | 'obsolete' = 'draft'
    if (isYellowRow) status = 'obsolete'
    else if (effectiveDate) status = 'effective'

    // Category / department
    const category   = TYPE_TO_CATEGORY[typeRaw] ?? 'enregistrement'
    const proc       = procRaw === 'MQ' ? 'MI' : procRaw
    const department = PROC_TO_DEPT[proc] ?? PROC_TO_DEPT[procRaw] ?? 'qualite'
    const isoClauses = TYPE_ISO_CLAUSES[typeRaw] ?? []

    // Legacy reference: version + observations
    const legacyParts: string[] = [`v${version}`]
    if (storageRaw) legacyParts.push(`Classement: ${storageRaw}`)
    if (mdpRaw === 'Oui') legacyParts.push('MDP: Oui')
    if (obsRaw) legacyParts.push(obsRaw.substring(0, 300))

    const values = {
      documentNumber,
      title:           titleRaw,
      category:        category as never,
      department:      department as never,
      isoClauses,
      confidentiality: 'internal' as const,
      tags:            [] as string[],
      rowHighlight:    rowHighlight as never,
      status:          status as never,
      versionLabel:    `v${version}`,
      storageType:     storageRaw || undefined,
      managedByPassword: mdpRaw?.toLowerCase() === 'oui',
      observations:    obsRaw || undefined,
      ownerId:         adminId,
      authorId:        adminId,
      effectiveDate:   effectiveDate ?? undefined,
      obsoletedAt:     isYellowRow ? effectiveDate ?? new Date() : undefined,
      legacyReference: legacyParts.join(' | '),
      createdBy:       adminId,
    }

    try {
      await db
        .insert(dmsDocuments)
        .values(values)
        .onConflictDoUpdate({
          target: dmsDocuments.documentNumber,
          set: {
            title:             values.title,
            category:          values.category,
            department:        values.department,
            isoClauses:        values.isoClauses,
            status:            values.status,
            rowHighlight:      values.rowHighlight,
            versionLabel:      values.versionLabel,
            storageType:       values.storageType as never,
            managedByPassword: values.managedByPassword,
            observations:      values.observations as never,
            effectiveDate:     values.effectiveDate,
            obsoletedAt:       values.obsoletedAt as never,
            legacyReference:   values.legacyReference,
          },
        })

      const icon =
        isYellowRow ? '🟡' :
        isRedRow    ? '🔴' :
                      '⚪'

      console.log(`  ${icon} [${excelRowNum.toString().padStart(3)}] ${documentNumber.padEnd(18)} ${titleRaw.substring(0, 55)}`)
      inserted++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ [${excelRowNum}] ${documentNumber}: ${msg}`)
      errors++
    }
  }

  console.log(`\n────────────────────────────────────────`)
  console.log(`✅ Inserted/updated : ${inserted}`)
  console.log(`⏭  Skipped (empty)  : ${skipped}`)
  console.log(`❌ Errors           : ${errors}`)
  console.log(`────────────────────────────────────────`)
  process.exit(errors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
