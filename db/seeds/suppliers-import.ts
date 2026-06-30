// db/seeds/suppliers-import.ts
// Seeds all 70 suppliers from FOR-AC-11 into the suppliers table.
// Run: npx tsx db/seeds/suppliers-import.ts

import 'dotenv/config'
import * as XLSX from 'xlsx'
import * as path from 'path'
import { db } from '../index'
import { suppliers, users } from '../schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

const SHEET_CATEGORY: Record<string, string> = {
  'Matière premiére Plantes':       'plantes',
  'Matiére premiére Terre veg':     'terre_vegetale',
  'Matière premiére GAZON':         'gazon',
  'Matière décorative':             'matiere_decorative',
  ' Bac à fleurs':                  'bac_fleurs',
  'Produits phytosanitaire':        'produits_phytosanitaires',
  'EQUI SECURITE & OUTILLAGE':      'equipements',
  'PARC AUTO':                      'parc_auto',
  'EQUIPEMENTS BUREAUTIQUE ET INFO':'equipements_bureautique',
  'SERVICES':                       'services',
  'LOCATION DES ENGINS & TRANSPORT':'location_engins',
  'SOUS-TRAITANTS':                 'sous_traitants',
}

function classFor(score: number | null): string | null {
  if (score === null) return null
  if (score >= 2.5) return 'A'
  if (score >= 1.5) return 'B'
  return 'C'
}

async function main() {
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1)
  if (!admin) { console.error('No admin user — run the main seed first.'); process.exit(1) }
  const adminId = admin.id

  const filePath = path.resolve('FOR AC 11 Tableau de sélection et d\'évaluation des fournisseurs 2025.xlsx')
  const wb = XLSX.readFile(filePath)

  let inserted = 0, updated = 0, errors = 0

  for (const sheetName of wb.SheetNames) {
    const category = SHEET_CATEGORY[sheetName] ?? 'autre'
    const ws = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]
    const isServices = sheetName === 'SERVICES'

    // Column offsets differ between standard sheets and SERVICES
    const selScoreCol  = isServices ? 13 : 14
    const selClassCol  = isServices ? 14 : 15
    const evalScoreCol = isServices ? 21 : 19
    const evalClassCol = isServices ? 22 : 20
    const statusCol    = isServices ? 23 : 21
    const nextPlanCol  = isServices ? 24 : 22
    const nextDoneCol  = isServices ? 25 : 23
    const obsCol       = isServices ? 26 : 24

    const dataRows = data.slice(7).filter(r => r[0] && String(r[0]).match(/^FR-\d+/))

    for (const r of dataRows) {
      const supplierCode    = String(r[0]).trim()
      const name            = String(r[1] ?? '').trim()
      if (!name) continue

      const registreCommerce = String(r[2] ?? '').trim() || null
      const address          = String(r[3] ?? '').trim() || null
      const contactName      = String(r[4] ?? '').trim() || null
      const phone            = String(r[5] ?? '').trim() || null
      const email            = String(r[6] ?? '').trim() || null

      const selScore  = typeof r[selScoreCol]  === 'number' ? Math.round((r[selScoreCol] as number) * 100) / 100 : null
      const selClass  = (String(r[selClassCol]  ?? '').trim()[0] ?? null) as string | null
      const evalScore = typeof r[evalScoreCol] === 'number' ? Math.round((r[evalScoreCol] as number) * 100) / 100 : null
      const evalClass = (String(r[evalClassCol] ?? '').trim()[0] ?? null) as string | null
      const rawStatus = String(r[statusCol]    ?? '').trim()
      const isoClass  = ['A', 'B', 'C'].includes(rawStatus[0] ?? '') ? rawStatus[0]
        : evalScore !== null ? classFor(evalScore)
        : selScore  !== null ? classFor(selScore)
        : null

      const nextEvalPlanned = String(r[nextPlanCol] ?? '').trim() || null
      const nextEvalDone    = typeof r[nextDoneCol] === 'number' ? null
        : String(r[nextDoneCol] ?? '').trim() || null
      const observations    = String(r[obsCol]      ?? '').trim() || null

      const isoStatus = isoClass === 'A' ? 'approuve' as const
        : isoClass === 'C' ? 'suspendu' as const
        : 'en_evaluation' as const

      const values = {
        supplierCode,
        name,
        category:        category as never,
        registreCommerce,
        contactName,
        email:           email || null,
        phone:           phone || null,
        address,
        selectionScore:  selScore?.toString() as never,
        selectionClass:  selClass as never,
        evaluationClass: evalClass as never,
        isoClass:        isoClass as never,
        nextEvalPlanned,
        nextEvalDone,
        notes:           observations,
        isoStatus,
        isoApproved:     isoStatus === 'approuve',
        isActive:        true,
        createdBy:       adminId,
      }

      try {
        // evaluation_score is an old integer column (1–5 scale) — skip it.
        // We use check-then-insert/update to avoid the partial-index ON CONFLICT limitation.
        const existing = await db.execute(sql`SELECT id FROM suppliers WHERE supplier_code = ${values.supplierCode} LIMIT 1`)
        if (existing.rows.length > 0) {
          await db.execute(sql`
            UPDATE suppliers SET
              name              = ${values.name},
              category          = ${values.category}::supplier_category,
              registre_commerce = ${values.registreCommerce},
              contact_name      = ${values.contactName},
              email             = ${values.email ?? null},
              phone             = ${values.phone ?? null},
              address           = ${values.address},
              selection_score   = ${values.selectionScore ?? null},
              selection_class   = ${values.selectionClass ?? null},
              evaluation_class  = ${values.evaluationClass ?? null},
              iso_class         = ${values.isoClass ?? null},
              next_eval_planned = ${values.nextEvalPlanned},
              next_eval_done    = ${values.nextEvalDone},
              notes             = ${values.notes},
              iso_status        = ${values.isoStatus}::supplier_status,
              iso_approved      = ${values.isoApproved},
              updated_at        = now()
            WHERE supplier_code = ${values.supplierCode}
          `)
        } else {
          await db.execute(sql`
            INSERT INTO suppliers (
              supplier_code, name, category, registre_commerce, contact_name,
              email, phone, address, selection_score, selection_class,
              evaluation_class, iso_class, next_eval_planned,
              next_eval_done, notes, iso_status, iso_approved, is_active, created_by
            ) VALUES (
              ${values.supplierCode}, ${values.name}, ${values.category}::supplier_category,
              ${values.registreCommerce}, ${values.contactName}, ${values.email ?? null},
              ${values.phone ?? null}, ${values.address},
              ${values.selectionScore ?? null}, ${values.selectionClass ?? null},
              ${values.evaluationClass ?? null},
              ${values.isoClass ?? null}, ${values.nextEvalPlanned},
              ${values.nextEvalDone}, ${values.notes},
              ${values.isoStatus}::supplier_status, ${values.isoApproved}, true, ${values.createdBy}
            )
          `)
        }

        const icon = isoClass === 'A' ? '🟢' : isoClass === 'B' ? '🟡' : isoClass === 'C' ? '🔴' : '⚪'
        console.log(`${icon} ${supplierCode.padEnd(7)} ${name.substring(0, 45).padEnd(45)} sel:${(selScore ?? '—').toString().padStart(4)} eval:${(evalScore ?? '—').toString().padStart(4)} → ${isoClass ?? '?'}`)
        inserted++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`  ❌ ${supplierCode}: ${msg}`)
        if (errors === 0) { console.error('Full error:', err); process.exit(1) }
        errors++
      }
    }
  }

  console.log('\n────────────────────────────────────────────')
  console.log(`✅ Upserted : ${inserted}`)
  console.log(`❌ Errors  : ${errors}`)
  process.exit(errors > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
