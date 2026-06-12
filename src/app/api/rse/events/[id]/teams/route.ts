import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventTeams, upsertEventTeams } from '@/lib/db/rse-events'
import { z } from 'zod'

const teamSchema = z.object({
  teams: z.array(z.object({
    teamName: z.enum(['rse', 'rh_communication', 'logistique', 'communication_marketing', 'direction']),
    teamLeaderId: z.string().uuid().nullable().optional(),
    missions: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
  })),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const teams = await getEventTeams(id)
  return NextResponse.json(teams)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = teamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const teams = await upsertEventTeams(id, parsed.data.teams, session.user.userId)
  return NextResponse.json(teams)
}
