/** Counts of the tables FOR-AC-10 work touches, for before/after comparison. */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

async function main() {
  const q = async (t: string) => {
    try {
      const r = await db.execute<{ n: string }>(sql.raw(`SELECT count(*)::text AS n FROM ${t}`))
      return r.rows[0].n
    } catch { return 'absent' }
  }
  const tables = ['projects', 'clients', 'suppliers', 'purchase_orders', 'delivery_notes',
    'extra_expenses', 'plant_list_items', 'non_conformances', 'corrective_actions',
    'audit_programs', 'audit_program_items', 'documents',
    'supply_registers', 'supply_items', 'supply_deliveries', 'supply_purchases']
  for (const t of tables) console.log(`${t.padEnd(24)} ${await q(t)}`)
  const seq = await db.execute<{ year: number; last_number: number }>(
    sql`SELECT year, last_number FROM nc_reference_sequences ORDER BY year`)
  for (const r of seq.rows) console.log(`nc_seq ${r.year}`.padEnd(24) + String(r.last_number))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
