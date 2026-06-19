import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPartnershipsExpiringWithin } from '@/lib/db/rse'

const RSE_ROLES = ['admin', 'direction']

// Returns active partnerships whose endDate falls within the next 60 days (notice window).
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!RSE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const expiring = await getPartnershipsExpiringWithin(60)
  return NextResponse.json(expiring)
}
