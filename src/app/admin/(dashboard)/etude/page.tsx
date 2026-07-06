import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import {
  projects, projectStudyRecords, plantListItems, plantSpecies,
  decorativeMaterials, phytosanitaryProducts, projectPhases,
} from '@/db/schema'
import { eq, count, and } from 'drizzle-orm'
import { BookOpen, Leaf, Layers, FlaskConical, ClipboardList, FileText, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Études | SOPAT Admin' }

const ETUDE_ROLES = ['admin', 'direction', 'etudes_chef', 'etudes_team']

export default async function EtudeDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role ?? ''
  if (!ETUDE_ROLES.includes(role)) redirect('/admin')

  const [
    [plantSpeciesCount],
    [decorativeCount],
    [phytosanitaryCount],
    [studyRecordsCount],
    [plantListCount],
    activeProjects,
  ] = await Promise.all([
    db.select({ n: count() }).from(plantSpecies),
    db.select({ n: count() }).from(decorativeMaterials),
    db.select({ n: count() }).from(phytosanitaryProducts),
    db.select({ n: count() }).from(projectStudyRecords),
    db.select({ n: count() }).from(plantListItems),
    db.select({
      id: projects.id,
      name: projects.name,
      clientName: projects.clientName,
      projectType: projects.projectType,
      createdAt: projects.createdAt,
    })
      .from(projects)
      .innerJoin(
        projectPhases,
        and(
          eq(projectPhases.projectId, projects.id),
          eq(projectPhases.phase, 'etudes'),
          eq(projectPhases.status, 'in_progress')
        )
      )
      .limit(10),
  ])

  const stats = [
    { label: 'Espèces végétales', value: plantSpeciesCount.n, href: '/admin/etude/plant-species', icon: Leaf, ref: 'LIS-ET-02/03' },
    { label: 'Matières décoratives', value: decorativeCount.n, href: '/admin/etude/decorative-materials', icon: Layers, ref: 'FOR-ET-03' },
    { label: 'Produits phytosanitaires', value: phytosanitaryCount.n, href: '/admin/etude/phytosanitary', icon: FlaskConical, ref: 'FOR-ET-05' },
    { label: 'Fiches projet', value: studyRecordsCount.n, href: '/admin/etude/study-register', icon: FileText, ref: 'FOR-ET-01/02' },
    { label: 'Articles en listes', value: plantListCount.n, href: '/admin/etude/project-articles', icon: ClipboardList, ref: 'FOR-ET-06' },
  ]

  const PROJECT_TYPE_LABELS: Record<string, string> = {
    residential: 'Résidentiel', commercial: 'Commercial', public: 'Public',
    industrial: 'Industriel', hotel: 'Hôtelier', sports: 'Sportif',
    educational: 'Éducatif', mixed: 'Mixte',
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold" style={{ color: 'var(--admin-fg)' }}>
          Département Études
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-muted)' }}>
          Référentiels techniques, registre de suivi et listes des articles — INS-ET-01 / PRS-ET-01
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border p-4 flex flex-col gap-2 hover:opacity-80 transition-opacity"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: 'var(--green)', opacity: 0.85 }}>
                  <Icon size={13} style={{ color: 'var(--ivory)' }} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
                  {s.ref}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--admin-fg)' }}>{String(s.value)}</p>
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>{s.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            href: '/admin/etude/study-register',
            icon: BookOpen,
            title: 'Registre de suivi des projets',
            desc: 'FOR-ET-01 — Vue d\'ensemble des fiches projets d\'étude',
          },
          {
            href: '/admin/etude/project-articles',
            icon: ClipboardList,
            title: 'Listes des articles par projet',
            desc: 'FOR-ET-06 — Palette végétale et articles par projet',
          },
          {
            href: '/admin/etude/plant-species',
            icon: Leaf,
            title: 'Palette végétale',
            desc: 'LIS-ET-02/03 — Référentiel des espèces végétales',
          },
          {
            href: '/admin/etude/decorative-materials',
            icon: Layers,
            title: 'Matières décoratives',
            desc: 'FOR-ET-03 — Spécifications techniques MD',
          },
          {
            href: '/admin/etude/phytosanitary',
            icon: FlaskConical,
            title: 'Produits phytosanitaires',
            desc: 'FOR-ET-05 — Spécifications techniques PP',
          },
        ].map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-4 p-4 rounded-xl border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
            >
              <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: 'var(--green)', opacity: 0.85 }}>
                <Icon size={16} style={{ color: 'var(--ivory)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-fg)' }}>{link.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>{link.desc}</p>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--admin-muted)', flexShrink: 0, marginTop: '2px' }} />
            </Link>
          )
        })}
      </div>

      {/* Active etude projects */}
      {activeProjects.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
              Projets en phase Études ({activeProjects.length})
            </p>
            <Link href="/admin/projects" className="text-xs hover:underline" style={{ color: 'var(--admin-muted)' }}>
              Voir tous →
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['Projet', 'Client', 'Type', 'Accès'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((p) => (
                <tr key={p.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[13px]" style={{ color: 'var(--admin-fg)' }}>{p.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--admin-muted)' }}>{p.clientName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
                      {PROJECT_TYPE_LABELS[p.projectType] ?? p.projectType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${p.id}/etudes`} className="text-[12px] hover:underline" style={{ color: 'var(--green)' }}>
                      Fiche Études →
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
