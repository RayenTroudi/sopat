import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOrganizationalKnowledge, KNOWLEDGE_STATUS_LABELS } from '@/lib/db/organizational-knowledge'
import Link from 'next/link'
import KnowledgeStatusButton from './KnowledgeStatusButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Connaissances organisationnelles | SOPAT Admin' }

const statusColors: Record<string, string> = {
  active: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  a_preserver: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  archived: 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]',
}

export default async function KnowledgePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!['admin', 'direction'].includes(session.user.role)) redirect('/admin')

  const rows = await getOrganizationalKnowledge()
  const critical = rows.filter(({ knowledge }) => (knowledge.criticality ?? 0) >= 4).length
  const toPreserve = rows.filter(({ knowledge }) => knowledge.status === 'a_preserver').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Connaissances organisationnelles
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            ORG-MI-09 — ISO 9001:2015 §7.1.6
          </p>
        </div>
        <Link
          href="/admin/knowledge/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle connaissance
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Critiques (≥4)', value: critical, color: critical > 0 ? 'var(--admin-red)' : 'var(--admin-text)' },
          { label: 'À préserver', value: toPreserve, color: 'var(--admin-amber)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Domaine', 'Connaissance', 'Détenteur', 'Criticité', 'Préservation', 'Statut', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ knowledge }) => (
                <tr key={knowledge.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {knowledge.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{knowledge.domain ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{knowledge.title}</p>
                    {knowledge.description && (
                      <p className="truncate text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{knowledge.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{knowledge.holder ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-[13px]" style={{
                    color: (knowledge.criticality ?? 0) >= 4 ? 'var(--admin-red)' : 'var(--admin-text)',
                  }}>
                    {knowledge.criticality ?? '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{knowledge.preservationMethod ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[knowledge.status]}`}>
                      {KNOWLEDGE_STATUS_LABELS[knowledge.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <KnowledgeStatusButton knowledgeId={knowledge.id} status={knowledge.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune connaissance enregistrée.{' '}
                    <Link href="/admin/knowledge/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
