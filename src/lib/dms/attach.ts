// src/lib/dms/attach.ts
import { sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import { dmsDocuments, dmsDocumentLinks } from '../../../db/schema'
import { buildCode, TYPE_CODES, PROCESS_CODES, type TypeCode, type ProcessCode } from './codes'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

type DmsDepartment = typeof dmsDocuments.$inferInsert['department']
type DmsCategory   = typeof dmsDocuments.$inferInsert['category']
type DmsLinkEntity = typeof dmsDocumentLinks.$inferInsert['entityType']

export async function attachDmsCode(
  tx: Tx,
  opts: {
    typeCode:    TypeCode
    processCode: ProcessCode
    designation: string
    department:  DmsDepartment
    category:    DmsCategory
    entityType:  DmsLinkEntity
    entityId:    string
    authorId:    string
  },
): Promise<string> {
  if (!TYPE_CODES.includes(opts.typeCode)) {
    throw new Error(`Invalid typeCode: ${opts.typeCode}`)
  }
  if (!PROCESS_CODES.includes(opts.processCode)) {
    throw new Error(`Invalid processCode: ${opts.processCode}`)
  }
  const designation = opts.designation.trim()
  if (!designation) {
    throw new Error('designation is required')
  }

  // 1. Atomic counter bump — inline against tx, never escapes the transaction
  const bump = await tx.execute(sql`
    INSERT INTO dms_code_sequences (type_code, process_code, last_seq, updated_at)
    VALUES (${opts.typeCode}, ${opts.processCode}, 1, now())
    ON CONFLICT (type_code, process_code) DO UPDATE
      SET last_seq   = dms_code_sequences.last_seq + 1,
          updated_at = now()
    RETURNING last_seq
  `)
  const seq = Number((bump.rows[0] as { last_seq: number }).last_seq)
  const code = buildCode(opts.typeCode, opts.processCode, seq)

  // 2. Register in dms_documents
  const [doc] = await tx
    .insert(dmsDocuments)
    .values({
      documentNumber:  code,
      title:           designation.slice(0, 255),
      category:        opts.category,
      department:      opts.department,
      status:          'effective',
      ownerId:         opts.authorId,
      authorId:        opts.authorId,
      isoClauses:      [],
      confidentiality: 'internal',
      tags:            [],
      retentionYears:  10,
      createdBy:       opts.authorId,
    })
    .returning({ id: dmsDocuments.id })

  // 3. Link to ERP entity
  await tx
    .insert(dmsDocumentLinks)
    .values({
      documentId:  doc.id,
      entityType:  opts.entityType,
      entityId:    opts.entityId,
      linkRole:    'origin',
      createdBy:   opts.authorId,
    })

  return code
}
