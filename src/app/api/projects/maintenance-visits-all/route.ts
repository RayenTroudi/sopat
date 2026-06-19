import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllMaintenanceVisits } from '@/lib/db/entretien'

const CALENDAR_ROLES = ['admin', 'direction', 'realization_manager', 'realization_supervisor', 'quality_manager', 'quality_agent', 'read_only_auditor']

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!CALENDAR_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const visits = await getAllMaintenanceVisits()
  return NextResponse.json(visits)
}
