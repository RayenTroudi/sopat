import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { MLSettingsClient } from './MLSettingsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Modèle ML | SOPAT Admin' }

export default async function MLSettingsPage() {
  const session = await auth()
  if (!session) redirect('/admin/login')
  if (session.user.role !== 'admin') redirect('/admin')

  return <MLSettingsClient />
}
