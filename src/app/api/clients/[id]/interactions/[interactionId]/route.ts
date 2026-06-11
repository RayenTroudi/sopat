import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deleteInteraction } from '@/lib/db/clients'

const DELETE_ROLES = ['admin', 'direction', 'etudes_chef']

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; interactionId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!DELETE_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, interactionId } = await params
  try {
    const ok = await deleteInteraction(interactionId, id)
    if (!ok) return NextResponse.json({ error: 'Interaction introuvable' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/clients/[id]/interactions/[interactionId]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
