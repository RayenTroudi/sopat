import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getDesignDna } from '@/lib/db/design-concepts'
import { DesignDnaSection } from './DesignDnaSection'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Portfolio Direction | SOPAT Admin' }

export default async function PortfolioPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin/dashboard')

  const dna = await getDesignDna()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--admin-text)' }}>Portfolio Direction</h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Vue agrégée du portfolio et de l’ADN design de SOPAT.
        </p>
      </header>

      <DesignDnaSection
        vocabularyFrequency={dna.vocabularyFrequency}
        paletteFrequency={dna.paletteFrequency}
        totalProjects={dna.totalProjects}
      />
    </div>
  )
}
