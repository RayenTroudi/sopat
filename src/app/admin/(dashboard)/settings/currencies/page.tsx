import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCurrentRates } from '@/lib/db/exchange-rates'
import { CurrenciesClient } from './CurrenciesClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Taux de change | SOPAT Admin' }

export default async function CurrenciesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin' && session.user.role !== 'direction') redirect('/admin')

  const currentRates = await getCurrentRates()

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/settings" className="hover:underline">Paramètres</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text)' }}>Taux de change</span>
      </nav>
      <CurrenciesClient currentRates={currentRates} />
    </div>
  )
}
