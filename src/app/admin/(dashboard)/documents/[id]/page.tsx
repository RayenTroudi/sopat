import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDmsDocumentSheet } from '@/lib/dms/structure'
import { DocumentStructureClient } from './DocumentStructureClient'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const s = await getDmsDocumentSheet(id)
  if (!s) return { title: 'Document introuvable | SOPAT Admin' }
  return { title: `${s.documentNumber} — Structure | SOPAT Admin` }
}

export default async function DocumentStructurePage({ params }: { params: Params }) {
  const { id } = await params
  const session = await auth()
  if (!session) notFound()
  const sheet = await getDmsDocumentSheet(id, {
    userId: session.user.userId,
    role:   session.user.role,
  })

  if (!sheet) notFound()

  // Mêmes droits que le registre LIS-MI-01 dont cette page est le détail :
  // tout utilisateur authentifié consulte, admin et direction modifient.
  // Aucune règle nouvelle n'est introduite ici.
  const canEdit = session.user.role === 'admin' || session.user.role === 'direction'

  return (
    <DocumentStructureClient
      sheet={sheet}
      canEdit={canEdit}
    />
  )
}
