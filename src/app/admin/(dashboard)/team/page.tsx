import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listUsers } from '@/lib/db/team'
import { TeamClient } from './TeamClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gestion de l\'équipe | SOPAT Admin' }

export default async function TeamPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/admin')

  const users = await listUsers()
  return <TeamClient initialUsers={users} />
}
