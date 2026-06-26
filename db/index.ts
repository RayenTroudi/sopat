import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from './schema'

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Check your .env file (development) or Vercel environment variables (production).'
    )
  }
  const pool = new Pool({ connectionString: url })
  return drizzle(pool, { schema })
}

let _db: ReturnType<typeof createDb> | undefined

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb()
    return (_db as any)[prop]
  },
})

export type DB = typeof db
