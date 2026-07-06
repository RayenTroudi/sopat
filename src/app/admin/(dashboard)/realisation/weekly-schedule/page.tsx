import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WeeklyScheduleClient } from './WeeklyScheduleClient'

export const dynamic = 'force-dynamic'

const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team']

export default async function WeeklySchedulePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!ALLOWED.includes(session.user.role)) redirect('/admin')

  const canEdit = ALLOWED.includes(session.user.role)

  return <WeeklyScheduleClient canEdit={canEdit} />
}
