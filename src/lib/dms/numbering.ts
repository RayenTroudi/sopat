import { sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import { buildCode, type TypeCode, type ProcessCode } from './codes'

// Atomically increments the sequence and returns the new code.
// Uses UPDATE … RETURNING for optimistic locking without a transaction.
export async function getNextCode(type: TypeCode, process: ProcessCode): Promise<string> {
  const rows = await db.execute(sql`
    UPDATE dms_code_sequences
    SET last_seq   = last_seq + 1,
        updated_at = now()
    WHERE type_code    = ${type}
      AND process_code = ${process}
    RETURNING last_seq
  `)

  if (rows.rows.length === 0) {
    // First use of this prefix — insert and return 01
    await db.execute(sql`
      INSERT INTO dms_code_sequences (type_code, process_code, last_seq)
      VALUES (${type}, ${process}, 1)
      ON CONFLICT (type_code, process_code) DO UPDATE
        SET last_seq   = dms_code_sequences.last_seq + 1,
            updated_at = now()
    `)
    const selectResult = await db.execute(sql`
      SELECT last_seq FROM dms_code_sequences
      WHERE type_code = ${type} AND process_code = ${process}
    `)
    const r = selectResult.rows[0] as { last_seq: number }
    return buildCode(type, process, Number(r.last_seq))
  }

  const seq = Number((rows.rows[0] as { last_seq: number }).last_seq)
  return buildCode(type, process, seq)
}

// Preview the next code without consuming it.
export async function peekNextCode(type: TypeCode, process: ProcessCode): Promise<string> {
  const rows = await db.execute(sql`
    SELECT last_seq FROM dms_code_sequences
    WHERE type_code = ${type} AND process_code = ${process}
  `)
  const current = rows.rows.length > 0
    ? Number((rows.rows[0] as { last_seq: number }).last_seq)
    : 0
  return buildCode(type, process, current + 1)
}
