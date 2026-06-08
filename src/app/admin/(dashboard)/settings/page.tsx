import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAllSettings } from '@/lib/db/settings'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Paramètres | SOPAT Admin' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/admin')

  const settings = await getAllSettings()
  // Mask password before sending to client
  const safe = { ...settings, smtp: { ...settings.smtp, password: settings.smtp.password ? '••••••••' : '' } }

  return <SettingsClient initialSettings={safe} />
}
