import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { notifications } from '../../../../../db/schema'
import { eq, and } from 'drizzle-orm'

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.userId)))
    .returning({ id: notifications.id })

  if (!row) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
