import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import {
  canEditSupplyRegister,
  ensureSupplyRegister,
  getSupplyRegister,
  replaceSupplyItems,
  updateSupplyRegisterObservations,
} from '@/lib/db/supply'
import { supplyItemsSchema, supplyObservationsSchema } from '@/lib/validation/supply'
import { syncBudgetConsumption } from '@/lib/budget-consumption'

type RouteParams = { params: Promise<{ id: string }> }

// Read access is wider than write: any role `assertProjectAccess` admits for
// the project may read the register; only SUPPLY_WRITE_ROLES may change it.

/** FOR-AC-10 — the project's supply register, with every figure recomputed. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )

  return NextResponse.json(await getSupplyRegister(id))
}

/** Replaces the register's planned lines, deliveries and purchases. */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  if (!canEditSupplyRegister(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const parsed = supplyItemsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )

  // Created on first save rather than with the project: a register with no line
  // is not a quality record, and most projects never need one.
  const registerId = await ensureSupplyRegister(id, session.user.userId, session.user)
  await replaceSupplyItems(registerId, parsed.data.items, session.user.userId, session.user)

  // Purchase lines feed budget consumption, so the cached aggregates and the
  // 90 % / over-budget thresholds have to be re-evaluated on every write.
  await syncBudgetConsumption(id, session.user.userId)

  return NextResponse.json(await getSupplyRegister(id))
}

/** Updates the register-level observation only. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const access = await assertProjectAccess(id, session.user)
  if ('error' in access)
    return NextResponse.json(
      { error: access.error === 'NOT_FOUND' ? 'Projet introuvable' : 'Non autorisé' },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  if (!canEditSupplyRegister(session.user.role))
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })

  const parsed = supplyObservationsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )

  const registerId = await ensureSupplyRegister(id, session.user.userId, session.user)
  await updateSupplyRegisterObservations(
    registerId,
    parsed.data.observations ?? null,
    session.user
  )

  return NextResponse.json(await getSupplyRegister(id))
}
