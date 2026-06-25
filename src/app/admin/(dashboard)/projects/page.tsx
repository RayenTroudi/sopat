import Link from 'next/link'
import { auth } from '@/lib/auth'
import { ProjectsTable } from './ProjectsTable'
import { Suspense } from 'react'

export const metadata = { title: 'Projets — SOPAT Admin' }

export default async function ProjectsPage() {
  const session = await auth()
  const userRole = session?.user.role ?? 'etudes_team'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Projets
          </h1>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau projet
        </Link>
      </div>

      <Suspense>
        <ProjectsTable userRole={userRole} />
      </Suspense>
    </div>
  )
}
