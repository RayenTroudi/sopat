import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { projects, projectPhases } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const ALLOWED = ['admin', 'direction', 'realisation_chef', 'realisation_team', 'etudes_chef']

const PHASE_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  awaiting_signoff: 'Attente validation',
  completed: 'Terminée',
}

const PHASE_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--admin-text-muted)',
  in_progress: 'var(--admin-amber)',
  awaiting_signoff: 'var(--admin-blue)',
  completed: 'var(--admin-emerald)',
}

const PROJECT_STATUS_LABEL: Record<string, string> = {
  etudes: 'Études',
  realisation: 'Réalisation',
  entretien: 'Entretien',
  completed: 'Terminé',
  draft: 'Brouillon',
  cancelled: 'Annulé',
}

export default async function RealisationRegisterPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!ALLOWED.includes(session.user.role)) redirect('/admin')

  const allProjects = await db.select({ id: projects.id, name: projects.name, status: projects.status }).from(projects)
  const ids = allProjects.map((p) => p.id)

  type PhaseRow = { projectId: string; status: string }
  const phases: PhaseRow[] = ids.length
    ? await db.select({ projectId: projectPhases.projectId, status: projectPhases.status }).from(projectPhases).where(inArray(projectPhases.projectId, ids))
    : []

  const phaseMap = new Map<string, string>(phases.map((p) => [p.projectId, p.status]))

  type Row = { id: string; name: string; status: string; phaseStatus: string | null }
  const rows: Row[] = allProjects.map((p) => ({ ...p, phaseStatus: phaseMap.get(p.id) ?? null }))
  rows.sort((a, b) => a.name.localeCompare(b.name))

  const active: Row[] = rows.filter((p) => p.status === 'realisation')
  const other: Row[] = rows.filter((p) => p.status !== 'realisation')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>Registre des projets — Réalisation</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>LIS-RE-02 · Vue transversale de tous les chantiers</p>
        </div>
        <Link
          href="/admin/realisation/weekly-schedule"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--admin-emerald)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Planning hebdomadaire
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {([
          { label: 'Total projets', value: rows.length, color: 'var(--admin-text)' },
          { label: 'En réalisation', value: active.length, color: 'var(--admin-amber)' },
          { label: 'Autres phases', value: other.length, color: 'var(--admin-text-muted)' },
        ] as const).map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <ProjectTable title="Chantiers en réalisation" rows={active} />
      {other.length > 0 && <ProjectTable title="Tous les projets" rows={other} />}
    </div>
  )
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium inline-block" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      {label}
    </span>
  )
}

function ProjectTable({ title, rows }: { title: string; rows: { id: string; name: string; status: string; phaseStatus: string | null }[] }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--admin-text-muted)' }}>Aucun projet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Projet', 'Statut', 'Phase réalisation', 'Accès'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-text)' }}>
                    <Link href={`/admin/projects/${p.id}?tab=realisation`} className="hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip
                      label={PROJECT_STATUS_LABEL[p.status] ?? p.status}
                      color={p.status === 'realisation' ? 'var(--admin-amber)' : p.status === 'completed' ? 'var(--admin-emerald)' : 'var(--admin-text-muted)'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {p.phaseStatus ? (
                      <StatusChip
                        label={PHASE_STATUS_LABEL[p.phaseStatus] ?? p.phaseStatus}
                        color={PHASE_STATUS_COLOR[p.phaseStatus] ?? 'var(--admin-text-muted)'}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${p.id}?tab=realisation`}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
                    >
                      Ouvrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
