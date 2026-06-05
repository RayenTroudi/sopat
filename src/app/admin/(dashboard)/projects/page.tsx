import Link from 'next/link'
import { getAllProjects } from '@/lib/db/projects'
import { ProjectsTable } from './ProjectsTable'
import type { ProjectStatus } from '@/lib/db/projects'

export const metadata = { title: 'Projets — SOPAT Admin' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ status?: string; page?: string }>

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const status = sp.status as ProjectStatus | undefined
  const page = parseInt(sp.page ?? '1', 10)

  const { rows, total, pageSize } = await getAllProjects({ status, page, pageSize: 25 })

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
        rows={rows as Parameters<typeof ProjectsTable>[0]['rows']}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  )
}
