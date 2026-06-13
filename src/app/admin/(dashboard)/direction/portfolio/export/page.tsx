import { auth } from '@/lib/auth'
import { hasFullAccess } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '../../../../../../../db/index'
import { projects } from '../../../../../../../db/schema'
import { ExportWizard } from './ExportWizard'

export default async function PortfolioExportPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!hasFullAccess(session.user.role)) redirect('/admin')

  const completed = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectType: projects.projectType,
      country: projects.country,
      conceptTitle: projects.conceptTitle,
    })
    .from(projects)
    .where(eq(projects.status, 'completed'))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Générer un portfolio</h1>
      <ExportWizard projects={completed} />
    </div>
  )
}
