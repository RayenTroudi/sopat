import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import {
  getEquipmentRentals,
  createEquipmentRental,
  getPlantItemOptions,
} from '@/lib/db/equipment'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team']

const CURRENCIES = ['TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD'] as const

const createSchema = z.object({
  equipmentTypeId:      z.string().uuid(),
  equipmentDescription: z.string().max(255).optional(),
  rentalCompany:        z.string().max(255).optional(),
  rentalCompanyContact: z.string().max(255).optional(),
  startDate:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rentalDays:           z.number().int().positive(),
  dailyRate:            z.string().regex(/^\d+(\.\d+)?$/),
  totalCost:            z.string().regex(/^\d+(\.\d+)?$/),
  currency:             z.enum(CURRENCIES).default('TND'),
  invoiceNumber:        z.string().max(100).optional(),
  invoiceAssetId:       z.string().uuid().optional(),
  operatorName:         z.string().max(255).optional(),
  purposeDescription:   z.string().max(2000).optional(),
  linkedPlantItemIds:   z.array(z.string().uuid()).optional(),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const [rentals, plantItems] = await Promise.all([
    getEquipmentRentals(id),
    getPlantItemOptions(id),
  ])

  return NextResponse.json({ rentals, plantItems })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Accès non autorisé pour ce rôle' }, { status: 403 })
  }

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const body = await req.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const rentalId = await createEquipmentRental({
    projectId:            id,
    equipmentTypeId:      d.equipmentTypeId,
    equipmentDescription: d.equipmentDescription,
    rentalCompany:        d.rentalCompany,
    rentalCompanyContact: d.rentalCompanyContact,
    startDate:            d.startDate,
    endDate:              d.endDate,
    rentalDays:           d.rentalDays,
    dailyRate:            d.dailyRate,
    totalCost:            d.totalCost,
    currency:             d.currency,
    invoiceNumber:        d.invoiceNumber,
    invoiceAssetId:       d.invoiceAssetId,
    operatorName:         d.operatorName,
    purposeDescription:   d.purposeDescription,
    linkedPlantItemIds:   d.linkedPlantItemIds,
    createdBy:            session.user.userId,
  })

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.equipment_rental_created',
    newState:  { rentalId, equipment: d.equipmentDescription ?? d.equipmentTypeId, totalCost: d.totalCost },
  })

  return NextResponse.json({ id: rentalId }, { status: 201 })
}
