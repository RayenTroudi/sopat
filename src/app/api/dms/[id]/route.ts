// src/app/api/dms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { requireApiRole } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { dmsDocuments } from '../../../../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { logDmsAudit } from '@/lib/dms/audit'

const highlightSchema = z.object({
  rowHighlight: z.enum(['none', 'green', 'red']),
})

const updateSchema = z.object({
  title:             z.string().min(1).max(255),
  category:          z.string(),
  department:        z.string(),
  versionLabel:      z.string().max(20).optional(),
  effectiveDate:     z.string().optional(),
  storageType:       z.string().max(50).optional(),
  managedByPassword: z.boolean().optional(),
  observations:      z.string().optional(),
  isoClauses:        z.array(z.string()).optional(),
  confidentiality:   z.enum(['public','internal','confidential','restricted']).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(['admin', 'direction'])
  if ('response' in guard) return guard.response
  const { session } = guard

  const { id } = await params
  const body = await req.json()
  const parsed = highlightSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const [before] = await db
    .select({ rowHighlight: dmsDocuments.rowHighlight })
    .from(dmsDocuments)
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .limit(1)

  const [updated] = await db
    .update(dmsDocuments)
    .set({ rowHighlight: parsed.data.rowHighlight })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id, rowHighlight: dmsDocuments.rowHighlight })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  await logDmsAudit(db, {
    documentId:    updated.id,
    event:         'updated',
    actorId:       session.user.userId,
    actorRole:     session.user.role,
    previousState: before ? { rowHighlight: before.rowHighlight } : null,
    newState:      { rowHighlight: updated.rowHighlight },
  }).catch((err) => console.error('[dms-audit] rowHighlight', err))

  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json(updated)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(['admin', 'direction'])
  if ('response' in guard) return guard.response
  const { session } = guard

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data

  const [before] = await db
    .select({
      title:             dmsDocuments.title,
      category:          dmsDocuments.category,
      department:        dmsDocuments.department,
      versionLabel:      dmsDocuments.versionLabel,
      effectiveDate:     dmsDocuments.effectiveDate,
      storageType:       dmsDocuments.storageType,
      managedByPassword: dmsDocuments.managedByPassword,
      observations:      dmsDocuments.observations,
      isoClauses:        dmsDocuments.isoClauses,
      confidentiality:   dmsDocuments.confidentiality,
    })
    .from(dmsDocuments)
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .limit(1)

  const newState = {
    title:             d.title,
    category:          d.category,
    department:        d.department,
    versionLabel:      d.versionLabel ?? null,
    effectiveDate:     d.effectiveDate ?? null,
    storageType:       d.storageType ?? null,
    managedByPassword: d.managedByPassword ?? false,
    observations:      d.observations ?? null,
    isoClauses:        d.isoClauses ?? [],
    confidentiality:   d.confidentiality ?? 'internal',
  }

  const [updated] = await db
    .update(dmsDocuments)
    .set({
      title:             newState.title,
      category:          newState.category as any,
      department:        newState.department as any,
      versionLabel:      newState.versionLabel,
      effectiveDate:     newState.effectiveDate ? new Date(newState.effectiveDate) : null,
      storageType:       newState.storageType,
      managedByPassword: newState.managedByPassword,
      observations:      newState.observations,
      isoClauses:        newState.isoClauses,
      confidentiality:   newState.confidentiality,
    })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  await logDmsAudit(db, {
    documentId:    updated.id,
    event:         'updated',
    actorId:       session.user.userId,
    actorRole:     session.user.role,
    previousState: before ?? null,
    newState,
  }).catch((err) => console.error('[dms-audit] update', err))

  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json({ id: updated.id })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireApiRole(['admin', 'direction'])
  if ('response' in guard) return guard.response
  const { session } = guard

  const { id } = await params

  const [before] = await db
    .select({ status: dmsDocuments.status })
    .from(dmsDocuments)
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .limit(1)

  const [updated] = await db
    .update(dmsDocuments)
    .set({ status: 'obsolete', deletedAt: new Date() })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id, documentNumber: dmsDocuments.documentNumber })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  await logDmsAudit(db, {
    documentId:    updated.id,
    event:         'soft_deleted',
    actorId:       session.user.userId,
    actorRole:     session.user.role,
    previousState: before ? { status: before.status } : null,
    newState:      { status: 'obsolete' },
  }).catch((err) => console.error('[dms-audit] soft_deleted', err))

  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json({ ok: true, documentNumber: updated.documentNumber })
}
