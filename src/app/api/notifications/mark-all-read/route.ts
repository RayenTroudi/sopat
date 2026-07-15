import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../../db/index'
import { notifications } from '../../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, session.user.userId), isNull(notifications.readAt)))

  return NextResponse.json({ ok: true })
}
