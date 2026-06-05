import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { getAssetById, deleteAssetRecord } from '@/lib/db/etudes'
import { assertProjectAccess } from '@/lib/db/projects'

type RouteParams = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  // Load the asset first to find which project it belongs to
  const asset = await getAssetById(id)
  if (!asset) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })

  // Reject deletion of assets not linked to a project (shouldn't exist, but be safe)
  if (!asset.projectId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // Verify the caller has write access to that project
  const access = await assertProjectAccess(asset.projectId, session.user)
  if ('error' in access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: access.error === 'NOT_FOUND' ? 404 : 403 })
  }

  try {
    await deleteAssetRecord(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/upload/[id]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
