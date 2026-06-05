import { NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { generateSignedUploadParams } from '@/lib/cloudinary'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = session.user.role
  if (role !== 'admin' && role !== 'direction' && role !== 'etudes_chef' && role !== 'realisation_chef') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const params = generateSignedUploadParams('sopat-admin/suppliers')
  return NextResponse.json(params)
}
