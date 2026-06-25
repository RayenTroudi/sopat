// src/app/api/dms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { dmsDocuments } from '../../../../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'

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

async function requireAdmin(req: NextRequest) {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'admin' && session.user.role !== 'direction') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'admin' && session.user.role !== 'direction') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = highlightSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const [updated] = await db
    .update(dmsDocuments)
    .set({ rowHighlight: parsed.data.rowHighlight })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id, rowHighlight: dmsDocuments.rowHighlight })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json(updated)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const [updated] = await db
    .update(dmsDocuments)
    .set({
      title:             d.title,
      category:          d.category as any,
      department:        d.department as any,
      versionLabel:      d.versionLabel ?? null,
      effectiveDate:     d.effectiveDate ? new Date(d.effectiveDate) : null,
      storageType:       d.storageType ?? null,
      managedByPassword: d.managedByPassword ?? false,
      observations:      d.observations ?? null,
      isoClauses:        d.isoClauses ?? [],
      confidentiality:   d.confidentiality ?? 'internal',
    })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json({ id: updated.id })
}
