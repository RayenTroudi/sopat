import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assertProjectAccess, logActivity } from '@/lib/db/projects'
import { softDeleteEquipmentRental } from '@/lib/db/equipment'

type RouteParams = { params: Promise<{ id: string; rentalId: string }> }

const ALLOWED_ROLES = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Accès non autorisé pour ce rôle' }, { status: 403 })
  }

  const { id, rentalId } = await params

  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  const deleted = await softDeleteEquipmentRental(rentalId, id)
  if (!deleted) {
    return NextResponse.json({ error: 'Location introuvable' }, { status: 404 })
  }

  await logActivity({
    projectId: id,
    actorId:   session.user.userId,
    actorName: session.user.name ?? session.user.email ?? 'Inconnu',
    action:    'realisation.equipment_rental_deleted',
    metadata:  { rentalId },
  })

  return NextResponse.json({ ok: true })
}
