import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { searchPlantSpecies, getAllPlantSpecies } from '@/lib/db/etudes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  try {
    const species = q.length >= 2 ? await searchPlantSpecies(q, 20) : await getAllPlantSpecies()
    return NextResponse.json(species)
  } catch (err) {
    console.error('[GET plant-species]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
