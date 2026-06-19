import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllMaintenanceVisits } from '@/lib/db/entretien'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const visits = await getAllMaintenanceVisits()
  return NextResponse.json(visits)
}
