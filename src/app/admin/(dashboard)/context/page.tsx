import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { dmsDocuments } from '@/db/schema'
import { and, eq, isNull, or, ilike, inArray } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contexte & politiques | SOPAT Admin' }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  in_review: 'En revue',
  pending_approval: 'En approbation',
  approved: 'Approuvé',
  effective: 'En vigueur',
  under_revision: 'En révision',
  obsolete: 'Obsolète',
  archived: 'Archivé',
}

const CATEGORY_LABELS: Record<string, string> = {
  politique: 'Politiques & chartes',
  manuel_qualite: 'Manuel qualité',
  cartographie_processus: 'Cartographie des processus',
  autre: 'Autres documents d’organisation',
}

export default async function ContextPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Documents d'organisation : politiques, manuel, cartographie + codes ORG-*
  const docs = await db
    .select()
    .from(dmsDocuments)
    .where(
      and(
        isNull(dmsDocuments.deletedAt),
        or(
          inArray(dmsDocuments.category, ['politique', 'manuel_qualite', 'cartographie_processus']),
          ilike(dmsDocuments.documentNumber, 'ORG%'),
        ),
      )
    )
    .orderBy(dmsDocuments.documentNumber)

  const groups = new Map<string, typeof docs>()
  for (const d of docs) {
    const key = CATEGORY_LABELS[d.category] ? d.category : 'autre'
    const arr = groups.get(key) ?? []
    arr.push(d)
    groups.set(key, arr)
  }

  const effective = docs.filter((d) => d.status === 'effective').length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
          Contexte de l&apos;organisation &amp; politiques
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
          ORG-MI-01 à 08 — ISO 9001:2015 §4 &amp; §5 (contexte, leadership, politique qualité)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        {[
          { label: 'Documents d’organisation', value: docs.length },
          { label: 'En vigueur', value: effective },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--admin-text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {docs.length === 0 && (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun document d&apos;organisation dans le DMS. Importez les documents ORG MI 01–08
            (politique qualité, chartes, contexte de l&apos;entreprise, cartographie…) depuis{' '}
            <Link href="/admin/documents" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
              Informations documentées
            </Link>.
          </p>
        </div>
      )}

      {[...groups.entries()].map(([key, items]) => (
        <div key={key} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
              {CATEGORY_LABELS[key] ?? key}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['N°', 'Titre', 'Version', 'Date d’effet', 'Prochaine revue', 'Statut'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2.5 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {d.documentNumber}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{d.title}</p>
                    {d.description && (
                      <p className="truncate text-xs mt-0.5 max-w-md" style={{ color: 'var(--admin-text-muted)' }}>{d.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{d.versionLabel ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {d.effectiveDate ? new Date(d.effectiveDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {d.nextReviewDate ? new Date(d.nextReviewDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      d.status === 'effective'
                        ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
                        : d.status === 'obsolete' || d.status === 'archived'
                        ? 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
                        : 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'
                    }`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
