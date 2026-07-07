import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql`
    ALTER TABLE maintenance_monthly_plans
      ADD COLUMN IF NOT EXISTS intervenants text,
      ADD COLUMN IF NOT EXISTS client_name varchar(255),
      ADD COLUMN IF NOT EXISTS pm_observations text,
      ADD COLUMN IF NOT EXISTS pm_name varchar(255)
  `)
  console.log('Migration 020 applied: monthly plan new fields added')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
