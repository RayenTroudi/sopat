import Link from 'next/link'
import { getAllProjects, maskClientName } from '@/lib/db/projects'
import { ProjectsTable } from './ProjectsTable'
import type { ProjectStatus, ProjectType } from '@/lib/db/projects'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Projets — SOPAT Admin' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ status?: string; page?: string; projectType?: string; country?: string }>

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, session] = await Promise.all([searchParams, auth()])
  const status = sp.status as ProjectStatus | undefined
  const projectType = sp.projectType as ProjectType | undefined
  const country = sp.country || undefined
  const page = parseInt(sp.page ?? '1', 10)
  const userRole = session?.user.role ?? 'etudes_team'

  const { rows, total, pageSize } = await getAllProjects({ status, projectType, country, page, pageSize: 25 })

  const maskedRows = rows.map((r) => ({
    ...r,
    clientName: maskClientName(r.clientName, r.clientAnonymized ?? false, userRole),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Projets
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            {total} projet{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau projet
        </Link>
      </div>

      <ProjectsTable
        rows={maskedRows}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  )
}
