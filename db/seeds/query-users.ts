import { db } from '../index'
import { users } from '../schema'

async function main() {
  const rows = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).limit(5)
  console.log(JSON.stringify(rows))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
