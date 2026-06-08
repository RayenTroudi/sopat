import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { getPurchaseOrders, createPurchaseOrder } from '@/lib/db/realisation'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const createSchema = z.object({
  plantListItemId:       z.string().uuid().optional(),
  itemDescription:       z.string().min(1).max(255),
  quantityPurchased:     z.string().regex(/^\d+(\.\d+)?$/, 'Quantité invalide'),
  unitPricePaid:         z.string().regex(/^\d+(\.\d+)?$/, 'Prix invalide'),
  supplierId:            z.string().uuid().optional(),
  supplierInvoiceNumber: z.string().max(100).optional(),
  invoiceAssetId:        z.string().uuid().optional(),
  purchaseDate:          z.string().datetime(),
  notes:                 z.string().max(1000).optional(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const orders = await getPurchaseOrders(id)
  return NextResponse.json(orders)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const order = await createPurchaseOrder({
    projectId: id,
    plantListItemId:       d.plantListItemId,
    itemDescription:       d.itemDescription,
    quantityPurchased:     d.quantityPurchased,
    unitPricePaid:         d.unitPricePaid,
    supplierId:            d.supplierId,
    supplierInvoiceNumber: d.supplierInvoiceNumber,
    invoiceAssetId:        d.invoiceAssetId,
    purchaseDate:          new Date(d.purchaseDate),
    purchasedBy:           session.user.userId,
    notes:                 d.notes,
    createdBy:             session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.purchase_created',
    newState:  { orderId: order.id, item: d.itemDescription, totalCost: order.totalCost },
  })

  return NextResponse.json(order, { status: 201 })
}
