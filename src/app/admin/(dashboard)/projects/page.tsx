import Link from 'next/link'
import { getAllProjects, maskClientName } from '@/lib/db/projects'
import { ProjectsTable } from './ProjectsTable'
import type { ProjectStatus, ProjectType } from '@/lib/db/projects'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Projets — SOPAT Admin' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ status?: string; page?: string; projectType?: string }>

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, session] = await Promise.all([searchParams, auth()])
  const status = sp.status as ProjectStatus | undefined
  const projectType = sp.projectType as ProjectType | undefined
  const page = parseInt(sp.page ?? '1', 10)
  const userRole = session?.user.role ?? 'etudes_team'

  const { rows, total, pageSize } = await getAllProjects({ status, projectType, page, pageSize: 25 })

  const maskedRows = rows.map((r) => ({
    ...r,
    clientName: maskClientName(r.clientName, r.clientAnonymized ?? false, userRole),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Projets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            Gestion de tous les projets paysagers
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
          style={{ background: 'var(--green)' }}
        >
          + Nouveau projet
        </Link>
      </div>

      {/* Table */}
      <ProjectsTable
        rows={maskedRows as Parameters<typeof ProjectsTable>[0]['rows']}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  )
}
