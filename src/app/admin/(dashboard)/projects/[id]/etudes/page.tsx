import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/db/projects'
import { getProjectConcept } from '@/lib/db/design-concepts'
import { getProjectStudyRecord } from '@/lib/db/project-study-record'
import { getPlantList } from '@/lib/db/etudes'
import { ConceptSection } from './ConceptSection'
import { FicheProjetSection } from './FicheProjetSection'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  palm: 'Palmiers', tree: 'Arbres', shrub: 'Arbustes',
  grass: 'Graminées', ground_cover: 'Couvre-sol', climber: 'Grimpantes',
  aquatic: 'Aquatiques', other: 'Autre',
}

export default async function EtudesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const access = await assertProjectAccess(id, session.user)
  if ('error' in access) {
    if (access.error === 'NOT_FOUND') redirect('/admin/projects')
    redirect('/admin/dashboard')
  }

  const [concept, studyRecord, plantList] = await Promise.all([
    getProjectConcept(id),
    getProjectStudyRecord(id),
    getPlantList(id),
  ])

  const canEdit =
    session.user.role === 'admin' ||
    session.user.role === 'direction' ||
    session.user.role === 'etudes_chef' ||
    session.user.role === 'etudes_team'

  // Group plant list by category
  const byCategory: Record<string, typeof plantList> = {}
  for (const item of plantList) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  const totalPlants = plantList.reduce((sum, i) => sum + Number(i.quantity), 0)

  return (
    <div className="space-y-6">
      {/* FOR-ET-02 Fiche Projet */}
      <FicheProjetSection
        projectId={id}
        canEdit={canEdit}
        initial={{
          projectTitle: studyRecord?.projectTitle,
          location: studyRecord?.location,
          clientName: studyRecord?.clientName,
          reference: studyRecord?.reference,
          projectDetails: studyRecord?.projectDetails,
          deadlineProposed: studyRecord?.deadlineProposed,
          documentsReceived: (studyRecord?.documentsReceived as any) ?? [],
          clientRequests: studyRecord?.clientRequests,
          durationPlannedDays: studyRecord?.durationPlannedDays,
          startDatePlanned: studyRecord?.startDatePlanned,
          startDateActual: studyRecord?.startDateActual,
          endDatePlanned: studyRecord?.endDatePlanned,
          endDateActual: studyRecord?.endDateActual,
          phases: (studyRecord?.phases as any) ?? [],
          droughtResistantRate: studyRecord?.droughtResistantRate,
          droughtResistantNote: studyRecord?.droughtResistantNote,
          responsableEtude: studyRecord?.responsableEtude,
        }}
      />

      {/* Concept Section (existing) */}
      <ConceptSection
        projectId={id}
        projectType={concept?.projectType ?? access.project.projectType}
        initialTitle={concept?.conceptTitle ?? ''}
        initialDescription={concept?.conceptDescription ?? ''}
        initialVocabulary={concept?.designVocabulary ?? []}
        initialPalette={concept?.plantPalettePhilosophy ?? []}
        canEdit={canEdit}
      />

      {/* FOR-ET-06 Liste des articles du projet */}
      <div className="rounded-xl border" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Liste des articles du projet</h2>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              FOR-ET-06 — {plantList.length} lignes · {totalPlants.toFixed(0)} unités
            </p>
          </div>
          {canEdit && (
            <Link
              href={`/admin/projects/${id}/etudes/plant-list`}
              className="text-[12px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}
            >
              Modifier la liste
            </Link>
          )}
        </div>

        {plantList.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucun article.{canEdit && (
                <> <Link href={`/admin/projects/${id}/etudes/plant-list`} style={{ color: 'var(--admin-accent)' }} className="hover:underline">Ajouter les végétaux</Link></>
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
              const items = byCategory[cat]
              if (!items?.length) return null
              return (
                <div key={cat}>
                  <div className="px-5 py-2" style={{ background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)', borderTop: '1px solid var(--admin-border)' }}>
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label} ({items.length})</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        {['Désignation (botanique)', 'Nom commun', 'Qté', 'Unité', 'Emplacement', 'Observations'].map((h) => (
                          <th key={h} className="text-left px-4 py-2 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                          <td className="px-4 py-2.5 italic text-[12px]" style={{ color: 'var(--admin-text)' }}>{item.botanicalName}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{item.commonName ?? '—'}</td>
                          <td className="px-4 py-2.5 text-[12px] font-medium" style={{ color: 'var(--admin-text)' }}>{Number(item.quantity).toFixed(0)}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{item.unit}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>—</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>{item.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
