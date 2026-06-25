// src/app/api/dms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { dmsDocuments } from '../../../../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'

const patchSchema = z.object({
  rowHighlight: z.enum(['none', 'green', 'red']),
})

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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const [updated] = await db
    .update(dmsDocuments)
    .set({ rowHighlight: parsed.data.rowHighlight })
    .where(and(eq(dmsDocuments.id, id), isNull(dmsDocuments.deletedAt)))
    .returning({ id: dmsDocuments.id, rowHighlight: dmsDocuments.rowHighlight })

  if (!updated) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  revalidateTag('dms-documents-list', 'default')
  return NextResponse.json(updated)
}
