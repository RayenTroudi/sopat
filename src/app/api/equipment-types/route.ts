import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllEquipmentTypes } from '@/lib/db/equipment'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const types = await getAllEquipmentTypes()
  return NextResponse.json(types)
}
