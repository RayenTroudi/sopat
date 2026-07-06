import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { projectStudyRecords, projects } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Registre de suivi des projets | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const ETUDE_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team']

const PHASE_LABELS: Record<string, string> = {
  esquisse: 'Esquisse',
  avant_projet_sommaire: 'APS',
  avant_projet_detaille: 'APD',
}

const PHASE_COLORS: Record<string, string> = {
  esquisse: '#f59e0b',
  avant_projet_sommaire: '#3b82f6',
  avant_projet_detaille: 'var(--green)',
}

export default async function StudyRegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role ?? ''
  if (!ETUDE_ROLES.includes(role)) redirect('/admin')

  const q = (sp.q as string) ?? ''

  const rows = await db
    .select({
      id: projectStudyRecords.id,
      projectId: projectStudyRecords.projectId,
      updatedDate: projectStudyRecords.updatedDate,
      projectTitle: projectStudyRecords.projectTitle,
      location: projectStudyRecords.location,
      clientName: projectStudyRecords.clientName,
      reference: projectStudyRecords.reference,
      durationPlannedDays: projectStudyRecords.durationPlannedDays,
      durationActualDays: projectStudyRecords.durationActualDays,
      startDatePlanned: projectStudyRecords.startDatePlanned,
      endDatePlanned: projectStudyRecords.endDatePlanned,
      endDateActual: projectStudyRecords.endDateActual,
      droughtResistantRate: projectStudyRecords.droughtResistantRate,
      responsableEtude: projectStudyRecords.responsableEtude,
      projectName: projects.name,
      projectStatus: projects.status,
    })
    .from(projectStudyRecords)
    .leftJoin(projects, eq(projects.id, projectStudyRecords.projectId))
    .orderBy(desc(projectStudyRecords.updatedAt))

  const filtered = q
    ? rows.filter(
        (r) =>
          r.projectTitle?.toLowerCase().includes(q.toLowerCase()) ||
          r.clientName?.toLowerCase().includes(q.toLowerCase()) ||
          r.location?.toLowerCase().includes(q.toLowerCase()) ||
          r.reference?.toLowerCase().includes(q.toLowerCase()) ||
          r.projectName?.toLowerCase().includes(q.toLowerCase())
      )
    : rows

  function fmtDate(d: string | null | undefined) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR')
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/etude"
          className="p-2 rounded-lg hover:opacity-70"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <BookOpen size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>
              Registre de suivi des projets d'étude
            </h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
              FOR-ET-01 — {filtered.length} fiche(s)
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par projet, client, localisation, référence…"
          className="w-full max-w-md px-3 py-2 rounded-lg border text-sm focus-visible:outline-none"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }}
        />
      </form>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
            {q ? `Aucun résultat pour « ${q} »` : 'Aucune fiche projet. Les fiches sont créées depuis la page Études d\'un projet.'}
          </p>
          {!q && (
            <Link href="/admin/projects" className="mt-2 inline-block text-sm hover:underline" style={{ color: 'var(--green)' }}>
              Accéder aux projets →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                  {[
                    'Réf.', 'Projet / Titre', 'Client', 'Localisation',
                    'Responsable', 'Délai prévu', 'Début', 'Fin', 'Taux résistance',
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--admin-muted)' }}>
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                    style={{ borderTop: '1px solid var(--admin-border)' }}
                  >
                    <td className="px-4 py-3">
                      {r.reference ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
                          {r.reference}
                        </span>
                      ) : <span style={{ color: 'var(--admin-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[13px]" style={{ color: 'var(--admin-fg)' }}>
                        {r.projectTitle ?? r.projectName ?? '—'}
                      </p>
                      {r.projectTitle && r.projectName && r.projectTitle !== r.projectName && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-muted)' }}>{r.projectName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {r.clientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {r.location ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {r.responsableEtude ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {r.durationPlannedDays ? `${r.durationPlannedDays} j` : '—'}
                      {r.durationActualDays ? (
                        <span className="ml-1 text-[10px]" style={{ color: r.durationActualDays > (r.durationPlannedDays ?? 0) ? '#ef4444' : 'var(--green)' }}>
                          ({r.durationActualDays} j réel)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {fmtDate(r.startDatePlanned)}
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>
                      {fmtDate(r.endDateActual ?? r.endDatePlanned)}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {r.droughtResistantRate ? (
                        <span
                          className="font-medium"
                          style={{ color: Number(r.droughtResistantRate) >= 80 ? 'var(--green)' : '#f59e0b' }}
                        >
                          {Number(r.droughtResistantRate).toFixed(0)} %
                        </span>
                      ) : <span style={{ color: 'var(--admin-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/projects/${r.projectId}/etudes`}
                        className="inline-flex items-center gap-1 text-[12px] hover:underline"
                        style={{ color: 'var(--green)' }}
                      >
                        Fiche <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
