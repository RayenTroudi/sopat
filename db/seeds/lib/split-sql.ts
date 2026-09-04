/**
 * Splits a migration file into statements, honouring dollar-quoted bodies.
 *
 * The earlier runners in this directory split on any semicolon at end of line.
 * That cuts a `DO $$ … $$;` block in half at its first inner statement and hands
 * PostgreSQL two syntactically invalid halves — which matters from migration 0040
 * onwards, since `ADD CONSTRAINT` and `CREATE TYPE` have no `IF NOT EXISTS` form
 * and must be guarded by such a block.
 *
 * Line comments are stripped first, so a `--` containing a semicolon cannot end a
 * statement either.
 */
export function splitSqlStatements(raw: string): string[] {
  const body = raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')

  const out: string[] = []
  let current = ''
  let inDollar = false

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (body.startsWith('$$', i)) {
      inDollar = !inDollar
      current += '$$'
      i++
      continue
    }
    if (ch === ';' && !inDollar) {
      const stmt = current.trim()
      if (stmt) out.push(stmt)
      current = ''
      continue
    }
    current += ch
  }
  const tail = current.trim()
  if (tail) out.push(tail)
  return out
}
