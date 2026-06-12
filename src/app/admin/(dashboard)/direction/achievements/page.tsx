import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAchievements } from '@/lib/db/achievements'
import { AchievementsClient } from './AchievementsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Réalisations & analytics | SOPAT Direction' }

export default async function AchievementsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin/dashboard')

  const data = await getAchievements()
  return <AchievementsClient initialData={data} />
}
