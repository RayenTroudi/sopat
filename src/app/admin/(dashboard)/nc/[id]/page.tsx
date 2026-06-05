import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getNcById, getActiveUsers } from '@/lib/db/iso'
import { NcDetailClient } from './NcDetailClient'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params
  const nc = await getNcById(id)
  if (!nc) return { title: 'NC introuvable' }
  return { title: `${nc.reference} | SOPAT Admin` }
}

export default async function NcDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const [nc, session, users] = await Promise.all([
    getNcById(id),
    auth(),
    getActiveUsers(),
  ])

  if (!nc || !session) notFound()

  return (
    <NcDetailClient
      nc={nc}
      users={users}
      currentUserId={session.user.userId}
      currentUserName={session.user.name ?? session.user.email ?? 'Inconnu'}
    />
  )
}
