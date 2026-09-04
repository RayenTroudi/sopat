import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  listNcs, getActiveUsers, getNcRegisterStats,
  type NcStatus, type NcProcess,
} from '@/lib/db/iso'
import { getAllProjects } from '@/lib/db/projects'
import { NcPageClient } from './NcPageClient'

const QUALITY_ROLES = ['admin', 'direction'] as const

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Non-Conformités | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function NCPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) return null
  if (!(QUALITY_ROLES as readonly string[]).includes(session.user.role)) redirect('/admin')

  const status    = (typeof sp.status  === 'string' ? sp.status  : undefined) as NcStatus | undefined
  const process   = (typeof sp.process === 'string' ? sp.process : undefined) as NcProcess | undefined
  const projectId = typeof sp.projectId === 'string' ? sp.projectId : undefined
  const search    = typeof sp.search    === 'string' ? sp.search    : undefined

  // Le tableau de bord porte sur tout le registre, pas sur la page affichee :
  // il est agrege en base et non compte sur `rows`, qui est pagine et filtre.
  const [{ rows, total }, users, { rows: allProjects }, stats] = await Promise.all([
    listNcs({ status, process, projectId, search }),
    getActiveUsers(),
    getAllProjects({ pageSize: 200 }),
    getNcRegisterStats(),
  ])

  const projects = allProjects.map((p) => ({ id: p.id, name: p.name, reference: p.reference }))

  const role = session.user.role
  const isAdmin = role === 'admin' || role === 'direction'

  return (
    <NcPageClient
      initialRows={rows}
      total={total}
      stats={stats}
      users={users}
      projects={projects}
      currentUserId={session.user.userId}
      currentUserName={session.user.name ?? session.user.email ?? 'Inconnu'}
      isAdmin={isAdmin}
    />
  )
}
