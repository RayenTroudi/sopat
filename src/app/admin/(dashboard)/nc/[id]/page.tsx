import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getNcById, getActiveUsers, getNcAuditTrail, getNcOriginFinding } from '@/lib/db/iso'
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
  const [nc, session, users, auditTrail, originFinding] = await Promise.all([
    getNcById(id),
    auth(),
    getActiveUsers(),
    getNcAuditTrail(id),
    getNcOriginFinding(id),
  ])

  if (!nc || !session) notFound()
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  return (
    <NcDetailClient
      nc={nc}
      users={users}
      currentUserId={session.user.userId}
      currentUserName={session.user.name ?? session.user.email ?? 'Inconnu'}
      isAdmin={session.user.role === 'admin' || session.user.role === 'direction'}
      auditTrail={auditTrail}
      originFinding={originFinding}
    />
  )
}
