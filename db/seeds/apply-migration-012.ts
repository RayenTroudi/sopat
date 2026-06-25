import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql`ALTER TABLE clients    ADD COLUMN IF NOT EXISTS dms_document_code varchar(20)`)
  await db.execute(sql`ALTER TABLE suppliers  ADD COLUMN IF NOT EXISTS dms_document_code varchar(20)`)
  await db.execute(sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS dms_document_code varchar(20)`)
  console.log('Migration 0012 applied: dms_document_code added to clients, suppliers, audit_logs')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
