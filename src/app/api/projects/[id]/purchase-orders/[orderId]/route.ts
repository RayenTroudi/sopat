import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder } from '@/lib/db/realisation'
import { z } from 'zod'

const updateSchema = z.object({
  itemDescription:       z.string().min(1).optional(),
  quantityPurchased:     z.string().optional(),
  unitPricePaid:         z.string().optional(),
  supplierId:            z.string().uuid().nullable().optional(),
  supplierInvoiceNumber: z.string().nullable().optional(),
  purchaseDate:          z.string().optional(),
  notes:                 z.string().nullable().optional(),
  status:                z.enum(['pending', 'ordered', 'received', 'invoiced']).optional(),
})

type RouteParams = { params: Promise<{ id: string; orderId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, orderId } = await params

  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const order = await getPurchaseOrderById(orderId)
  if (!order || order.projectId !== id) {
    return NextResponse.json({ error: 'Bon de commande introuvable' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const updated = await updatePurchaseOrder(orderId, id, {
    itemDescription:       d.itemDescription,
    quantityPurchased:     d.quantityPurchased,
    unitPricePaid:         d.unitPricePaid,
    supplierId:            d.supplierId,
    supplierInvoiceNumber: d.supplierInvoiceNumber,
    purchaseDate:          d.purchaseDate ? new Date(d.purchaseDate) : undefined,
    notes:                 d.notes,
    status:                d.status,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.purchase_updated',
    metadata:  { orderId },
  })

  return NextResponse.json(updated)
}

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
