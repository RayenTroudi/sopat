import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getPurchaseOrderById, deletePurchaseOrder } from '@/lib/db/realisation'

type RouteParams = { params: Promise<{ id: string; orderId: string }> }

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, orderId } = await params

  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  // Verify order belongs to this project (IDOR prevention)
  const order = await getPurchaseOrderById(orderId)
  if (!order || order.projectId !== id) {
    return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 })
  }

  await deletePurchaseOrder(orderId, id)

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.purchase_deleted',
    metadata:  { orderId },
  })

  return NextResponse.json({ ok: true })
}
