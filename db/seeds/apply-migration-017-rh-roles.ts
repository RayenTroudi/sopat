import { db } from '../index'
import { sql } from 'drizzle-orm'

async function main() {
  await db.execute(sql.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'rh_manager'`))
  await db.execute(sql.raw(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'rh_agent'`))
  console.log('Migration 017 applied: rh_manager and rh_agent roles added to user_role enum')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
