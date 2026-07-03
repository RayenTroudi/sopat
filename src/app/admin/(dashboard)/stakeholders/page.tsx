import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStakeholders, getStaffSuggestions } from '@/lib/db/stakeholders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Parties Intéressées | SOPAT Admin' }

export default async function StakeholdersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [rows, suggestions] = await Promise.all([
    getStakeholders(),
    getStaffSuggestions(),
  ])

  const pipCount = rows.filter(({ sh }) => sh.isPip).length

  const typeLabels: Record<string, string> = {
    client: 'Client',
    fournisseur: 'Fournisseur',
    partenaire: 'Partenaire',
    employe: 'Employé',
    actionnaire: 'Actionnaire',
    autorite_reglementaire: 'Autorité régl.',
    communaute: 'Communauté',
    autre: 'Autre',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Parties Intéressées
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-MI-08/09 — Écoute des parties intéressées
          </p>
        </div>
        <Link
          href="/admin/stakeholders/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle PI
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total PI', value: rows.length, color: 'var(--admin-text)' },
          { label: 'PIP (forte influence)', value: pipCount, color: pipCount > 0 ? 'var(--admin-amber)' : 'var(--admin-text)' },
          { label: 'Suggestions personnel', value: suggestions.length, color: 'var(--admin-accent)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>Registre des parties intéressées</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Nom', 'Type', 'Besoins / Attentes', 'Influence', 'Interaction', 'PIP', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ sh }) => (
                <tr key={sh.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {sh.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-[13px]" style={{ color: 'var(--admin-text)' }}>{sh.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{typeLabels[sh.type] ?? sh.type}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{sh.needs ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-[13px]" style={{ color: 'var(--admin-text)' }}>{sh.influence}</td>
                  <td className="px-4 py-3 text-center font-semibold text-[13px]" style={{ color: 'var(--admin-text)' }}>{sh.interaction}</td>
                  <td className="px-4 py-3 text-center">
                    {sh.isPip ? (
                      <span className="px-2 py-0.5 bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] rounded-full text-xs font-medium">
                        PIP
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--admin-border)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/stakeholders/${sh.id}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune partie intéressée.{' '}
                    <Link href="/admin/stakeholders/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer la première
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>Suggestions du personnel</h2>
          <Link
            href="/admin/stakeholders/suggestions/new"
            className="text-[13px] font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--admin-accent)' }}
          >
            + Nouvelle suggestion
          </Link>
        </div>
        <div>
          {suggestions.slice(0, 10).map(({ s, creatorName }) => (
            <div key={s.id} className="px-4 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{s.suggestionText}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                    {s.dept} · {s.date} · {creatorName}
                  </p>
                </div>
                {s.responseText ? (
                  <span className="px-2 py-0.5 bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)] rounded-full text-xs ml-3 flex-shrink-0 font-medium">
                    Répondu
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-[var(--admin-amber-dim)] text-[var(--admin-amber)] rounded-full text-xs ml-3 flex-shrink-0 font-medium">
                    En attente
                  </span>
                )}
              </div>
            </div>
          ))}
          {suggestions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Aucune suggestion enregistrée.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
