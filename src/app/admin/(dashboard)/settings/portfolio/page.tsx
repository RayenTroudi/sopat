import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPortfolioSettings } from '@/lib/db/portfolio'
import { PortfolioSettingsForm } from './PortfolioSettingsForm'

export default async function PortfolioSettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/admin')
  const settings = await getPortfolioSettings()
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Paramètres du portfolio</h1>
      <PortfolioSettingsForm initial={settings} />
    </div>
  )
}
