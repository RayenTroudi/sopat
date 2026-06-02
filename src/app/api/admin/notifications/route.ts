import { prisma } from '@/lib/db'
import { ok, err } from '@/lib/admin-response'
import { getAdminSession } from '@/lib/auth'
import { detectDelays } from '@/lib/lifecycle'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  await detectDelays()
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { project: { select: { name: true } } },
  })
  const unreadCount = await prisma.notification.count({ where: { isRead: false } })
  return ok({ notifications, unreadCount })
}

export async function PATCH(req: Request) {
  if (!await getAdminSession()) return err('Unauthorized', 401)
  const { ids } = await req.json()
  if (!ids || !Array.isArray(ids)) {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } })
  } else {
    await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { isRead: true } })
  }
  return ok({ success: true })
}
