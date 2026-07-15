import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '../../../../db/index'
import { notifications } from '../../../../db/schema'
import { eq, desc, and, isNull, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const recipientId = session.user.userId

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id:        notifications.id,
        type:      notifications.type,
        title:     notifications.title,
        body:      notifications.body,
        href:      notifications.href,
        projectId: notifications.projectId,
        createdAt: notifications.createdAt,
        readAt:    notifications.readAt,
      })
      .from(notifications)
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt))
      .limit(20),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt))),
  ])

  return NextResponse.json({ notifications: rows, unreadCount: count })
}
