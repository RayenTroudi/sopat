// Backfills dms_document_code for all existing entities that predate the ISO coding system.
// Safe to run multiple times — skips records that already have a code.
// Uses sequential SQL (no transactions) for Neon HTTP driver compatibility.

import { db } from '../index'
import { sql } from 'drizzle-orm'
import {
  clients, suppliers, auditLogs,
  projects, nonConformances, correctiveActions, purchaseOrders,
  dmsDocuments, dmsDocumentLinks,
} from '../schema'
import { eq, isNull, and } from 'drizzle-orm'
import { buildCode } from '../../src/lib/dms/codes'
import type { TypeCode, ProcessCode } from '../../src/lib/dms/codes'

async function nextCode(typeCode: TypeCode, processCode: ProcessCode): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO dms_code_sequences (type_code, process_code, last_seq, updated_at)
    VALUES (${typeCode}, ${processCode}, 1, now())
    ON CONFLICT (type_code, process_code) DO UPDATE
      SET last_seq   = dms_code_sequences.last_seq + 1,
          updated_at = now()
    RETURNING last_seq
  `)
  return buildCode(typeCode, processCode, Number((result.rows[0] as { last_seq: number }).last_seq))
}

async function registerDoc(opts: {
  code: string
  title: string
  category: string
  department: string
  entityType: string
  entityId: string
  authorId: string
}) {
  // Check if code already registered
  const existing = await db.execute(sql`
    SELECT id FROM dms_documents WHERE document_number = ${opts.code} LIMIT 1
  `)

  let docId: string
  if (existing.rows.length > 0) {
    docId = (existing.rows[0] as { id: string }).id
  } else {
    const [doc] = await db
      .insert(dmsDocuments)
      .values({
        documentNumber:  opts.code,
        title:           opts.title.slice(0, 255),
        category:        opts.category as any,
        department:      opts.department as any,
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
    docId = doc.id
  }

  // Ensure link exists (ignore conflict)
  await db.execute(sql`
    INSERT INTO dms_document_links (document_id, entity_type, entity_id, link_role, created_by)
    VALUES (${docId}, ${opts.entityType}, ${opts.entityId}, 'origin', ${opts.authorId})
    ON CONFLICT DO NOTHING
  `)
}

async function main() {
  const adminResult = await db.execute(sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)
  if (adminResult.rows.length === 0) throw new Error('No admin user found')
  const adminId = (adminResult.rows[0] as { id: string }).id
  console.log('Admin:', adminId)

  // ── Clients → LIS-CO-NN ──────────────────────────────────────────────────────
  const missingClients = await db
    .select({ id: clients.id, displayName: clients.displayName })
    .from(clients)
    .where(and(isNull(clients.dmsDocumentCode), isNull(clients.deletedAt)))

  console.log(`\nClients: ${missingClients.length} to backfill`)
  for (const c of missingClients) {
    const code = await nextCode('LIS', 'CO')
    await registerDoc({ code, title: c.displayName, category: 'enregistrement', department: 'direction', entityType: 'client', entityId: c.id, authorId: adminId })
    await db.update(clients).set({ dmsDocumentCode: code }).where(eq(clients.id, c.id))
    console.log(`  "${c.displayName}" → ${code}`)
  }

  // ── Suppliers → LIS-AC-NN ─────────────────────────────────────────────────────
  const missingSuppliers = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(isNull(suppliers.dmsDocumentCode))

  console.log(`\nSuppliers: ${missingSuppliers.length} to backfill`)
  for (const s of missingSuppliers) {
    const code = await nextCode('LIS', 'AC')
    await registerDoc({ code, title: s.name, category: 'enregistrement', department: 'finance', entityType: 'supplier', entityId: s.id, authorId: adminId })
    await db.update(suppliers).set({ dmsDocumentCode: code }).where(eq(suppliers.id, s.id))
    console.log(`  "${s.name}" → ${code}`)
  }

  // ── Audits → FOR-MI-NN ───────────────────────────────────────────────────────
  const missingAudits = await db
    .select({ id: auditLogs.id, reference: auditLogs.reference, processAudited: auditLogs.processAudited })
    .from(auditLogs)
    .where(isNull(auditLogs.dmsDocumentCode))

  console.log(`\nAudits: ${missingAudits.length} to backfill`)
  for (const a of missingAudits) {
    const code = await nextCode('FOR', 'MI')
    await registerDoc({ code, title: `Audit interne — ${a.processAudited}`, category: 'rapport_audit', department: 'qualite', entityType: 'audit_log', entityId: a.id, authorId: adminId })
    await db.update(auditLogs).set({ dmsDocumentCode: code }).where(eq(auditLogs.id, a.id))
    console.log(`  ${a.reference} → ${code}`)
  }

  // ── Projects → PRS-RE-NN ─────────────────────────────────────────────────────
  const missingProjects = await db
    .select({ id: projects.id, reference: projects.reference, name: projects.name })
    .from(projects)
    .where(and(isNull(projects.dmsDocumentCode), isNull(projects.deletedAt)))

  console.log(`\nProjects: ${missingProjects.length} to backfill`)
  for (const p of missingProjects) {
    const code = await nextCode('PRS', 'RE')
    await registerDoc({ code, title: p.name, category: 'cartographie_processus', department: 'realisation', entityType: 'project', entityId: p.id, authorId: adminId })
    await db.update(projects).set({ dmsDocumentCode: code }).where(eq(projects.id, p.id))
    console.log(`  ${p.reference} → ${code}`)
  }

  // ── Non-Conformances → FOR-MI-NN ─────────────────────────────────────────────
  const missingNCs = await db
    .select({ id: nonConformances.id, reference: nonConformances.reference })
    .from(nonConformances)
    .where(and(isNull(nonConformances.dmsDocumentCode), isNull(nonConformances.deletedAt)))

  console.log(`\nNon-conformances: ${missingNCs.length} to backfill`)
  for (const nc of missingNCs) {
    const code = await nextCode('FOR', 'MI')
    await registerDoc({ code, title: `Non-conformité ${nc.reference}`, category: 'ncr', department: 'qualite', entityType: 'non_conformance', entityId: nc.id, authorId: adminId })
    await db.update(nonConformances).set({ dmsDocumentCode: code }).where(eq(nonConformances.id, nc.id))
    console.log(`  ${nc.reference} → ${code}`)
  }

  // ── Corrective Actions → PRC-MI-NN ───────────────────────────────────────────
  const missingCAPAs = await db
    .select({ id: correctiveActions.id })
    .from(correctiveActions)
    .where(isNull(correctiveActions.dmsDocumentCode))

  console.log(`\nCorrective actions: ${missingCAPAs.length} to backfill`)
  for (const ca of missingCAPAs) {
    const code = await nextCode('PRC', 'MI')
    await registerDoc({ code, title: 'Action corrective', category: 'capa', department: 'qualite', entityType: 'corrective_action', entityId: ca.id, authorId: adminId })
    await db.update(correctiveActions).set({ dmsDocumentCode: code }).where(eq(correctiveActions.id, ca.id))
    console.log(`  CAPA ${ca.id.slice(0, 8)} → ${code}`)
  }

  // ── Purchase Orders → FOR-AC-NN ───────────────────────────────────────────────
  const missingPOs = await db
    .select({ id: purchaseOrders.id, itemDescription: purchaseOrders.itemDescription })
    .from(purchaseOrders)
    .where(isNull(purchaseOrders.dmsDocumentCode))

  console.log(`\nPurchase orders: ${missingPOs.length} to backfill`)
  for (const po of missingPOs) {
    const code = await nextCode('FOR', 'AC')
    await registerDoc({ code, title: po.itemDescription, category: 'bon_commande', department: 'finance', entityType: 'purchase_order', entityId: po.id, authorId: adminId })
    await db.update(purchaseOrders).set({ dmsDocumentCode: code }).where(eq(purchaseOrders.id, po.id))
    console.log(`  PO "${po.itemDescription.slice(0, 40)}" → ${code}`)
  }

  console.log('\nBackfill complete.')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
