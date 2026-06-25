// db/seeds/dms-import.ts
// Imports all documents from LIS-MI-01 (2025 sheet) into dms_documents
// Run: npx tsx db/seeds/dms-import.ts

import * as XLSX from 'xlsx'
import path from 'path'
import { db } from '../index'
import { dmsDocuments, users } from '../schema'
import { eq } from 'drizzle-orm'

// ── Helpers ──────────────────────────────────────────────────────────────────

function excelDateToJS(serial: unknown): Date | null {
  if (!serial || typeof serial !== 'number') return null
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

// Map TYPE code → DMS category enum
const TYPE_TO_CATEGORY: Record<string, string> = {
  FOR: 'formulaire',
  LIS: 'enregistrement',
  PRS: 'cartographie_processus',
  INS: 'instruction',
  ORG: 'procedure',
  PLA: 'plan_qualite',
  PRC: 'procedure',
}

// Map PROCESS code → department enum
const PROC_TO_DEPT: Record<string, string> = {
  AC: 'finance',
  CO: 'etudes',
  ET: 'etudes',
  MI: 'qualite',
  MQ: 'qualite',
  RE: 'realisation',
  RH: 'rh',
}

// ISO clauses commonly associated with document types
const TYPE_ISO_CLAUSES: Record<string, string[]> = {
  PRS: ['4.4'],
  PRC: ['7.5'],
  LIS: ['7.5'],
  FOR: ['7.5'],
  INS: ['7.5'],
  ORG: ['5.1', '5.2'],
  PLA: ['6.1', '6.2'],
}

const JAN_2025 = new Date('2025-01-01')

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Get admin user for authorId / ownerId
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1)

  if (!admin) {
    console.error('No admin user found. Create one first.')
    process.exit(1)
  }

  const adminId = admin.id
  console.log('Using admin user:', adminId)

  // Read Excel
  const filePath = path.resolve(
    'LIS MI 01 Liste des informations documentées internes.xlsx',
  )
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets['2025']
  if (!ws) {
    console.error('Sheet "2025" not found')
    process.exit(1)
  }

  const rawRows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
  }) as unknown[][]

  // Skip header rows (0–5), process from row 6 onwards
  const dataRows = rawRows.slice(6).filter(
    (r) => r[0] && r[2] && r[3],
  )

  console.log(`Found ${dataRows.length} documents to import`)

  let inserted = 0
  let skipped = 0

  for (const r of dataRows) {
    const typeRaw   = String(r[0]).trim()
    const procRaw   = String(r[1]).trim()
    const codeRaw   = String(r[2]).trim()
    const titleRaw  = String(r[3]).trim()
    const version   = typeof r[4] === 'number' ? r[4] : 1
    const dateSerial = r[5]
    const obs       = String(r[8] || '').trim()

    // Normalise process code: MQ → MI (legacy rename)
    const proc = procRaw === 'MQ' ? 'MI' : procRaw

    // Build canonical code — keep original code from Excel as-is since it's
    // already in TYPE-PROC-NN format. We store it as the documentNumber.
    // Some codes have spaces (e.g. " ORG-MQ-03"), trim them.
    const documentNumber = codeRaw.replace(/\s/g, '')

    // Skip rows with empty or non-standard codes
    if (!documentNumber || documentNumber.length < 5) {
      skipped++
      continue
    }

    const category   = TYPE_TO_CATEGORY[typeRaw]   ?? 'enregistrement'
    const department = PROC_TO_DEPT[proc] ?? PROC_TO_DEPT[procRaw] ?? 'qualite'
    const isoClauses = TYPE_ISO_CLAUSES[typeRaw] ?? []

    const effectiveDate = excelDateToJS(dateSerial)

    // Determine highlight:
    // RED  → observation explicitly says the document is eliminated (not just a case/column inside it)
    // GREEN → document was created or updated in 2025+ (date >= Jan 1 2025) OR observation says "Document crée"
    let rowHighlight: 'none' | 'green' | 'red' = 'none'

    const obsLower = obs.toLowerCase()
    if (obs.match(/^Document éliminé/i)) {
      rowHighlight = 'red'
    } else if (
      (effectiveDate && effectiveDate >= JAN_2025) ||
      obsLower.includes('créé suite') ||
      obsLower.includes('crée suite') ||
      obsLower.includes('réintégré dans le système')
    ) {
      rowHighlight = 'green'
    }

    // Determine lifecycle status
    // Eliminated docs → obsolete; effective date set → effective; else → draft
    let status: 'draft' | 'effective' | 'obsolete' = 'draft'
    if (rowHighlight === 'red') {
      status = 'obsolete'
    } else if (effectiveDate) {
      status = 'effective'
    }

    const values = {
      documentNumber,
      title:           titleRaw,
      category:        category as any,
      department:      department as any,
      isoClauses,
      confidentiality: 'internal' as const,
      tags:            [] as string[],
      status:          status as any,
      rowHighlight:    rowHighlight as any,
      ownerId:         adminId,
      authorId:        adminId,
      effectiveDate:   effectiveDate ?? undefined,
      legacyReference: `v${version} | ${obs.substring(0, 200)}`,
      createdBy:       adminId,
    }

    try {
      await db
        .insert(dmsDocuments)
        .values(values)
        .onConflictDoUpdate({
          target: dmsDocuments.documentNumber,
          set: {
            title:           values.title,
            category:        values.category,
            department:      values.department,
            isoClauses:      values.isoClauses,
            status:          values.status,
            rowHighlight:    values.rowHighlight,
            effectiveDate:   values.effectiveDate,
            legacyReference: values.legacyReference,
          },
        })
      const label = rowHighlight === 'red' ? '🔴' : rowHighlight === 'green' ? '🟢' : '⚪'
      console.log(`  ${label} ${documentNumber} — ${titleRaw}`)
      inserted++
    } catch (err: any) {
      console.error(`  ERROR ${documentNumber}:`, err.message)
      skipped++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped/errors: ${skipped}`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
