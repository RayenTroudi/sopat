import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getClientAccountEntries,
  getClientBalances,
  ENTRY_TYPE_LABELS,
  type ClientEntryType,
} from '@/lib/db/client-accounts'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'État de solde client | SOPAT Admin' }

const typeColors: Record<string, string> = {
  facture: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  encaissement: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  avoir: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ClientBalancesPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const clientId = typeof sp.client === 'string' ? sp.client : undefined
  const [balances, entries] = await Promise.all([
    getClientBalances(),
    getClientAccountEntries({ clientId }),
  ])

  const totalInvoiced = balances.reduce((s, b) => s + b.invoiced, 0)
  const totalCollected = balances.reduce((s, b) => s + b.collected, 0)
  const totalBalance = balances.reduce((s, b) => s + b.balance, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            État de solde client
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-CO-03 — Suivi des factures, encaissements et soldes par client
          </p>
        </div>
        <Link
          href="/admin/commercial/client-balances/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouvelle écriture
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total facturé (TND)', value: fmt(totalInvoiced), color: 'var(--admin-text)' },
          { label: 'Total encaissé (TND)', value: fmt(totalCollected), color: 'var(--admin-emerald)' },
          { label: 'Solde restant (TND)', value: fmt(totalBalance), color: totalBalance > 0 ? 'var(--admin-amber)' : 'var(--admin-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Soldes par client</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Client', 'Facturé', 'Avoirs', 'Encaissé', 'Solde', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.clientId} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{b.clientName}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{fmt(b.invoiced)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>{fmt(b.credited)}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-emerald)' }}>{fmt(b.collected)}</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color: b.balance > 0 ? 'var(--admin-amber)' : 'var(--admin-emerald)' }}>
                    {fmt(b.balance)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commercial/client-balances?client=${b.clientId}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Écritures →
                    </Link>
                  </td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune écriture.{' '}
                    <Link href="/admin/commercial/client-balances/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            {clientId ? 'Écritures du client sélectionné' : 'Dernières écritures'}
          </h2>
          {clientId && (
            <Link href="/admin/commercial/client-balances" className="text-[12px] hover:underline" style={{ color: 'var(--admin-accent)' }}>
              Tout afficher
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Date', 'Client', 'Projet', 'Type', 'Montant', 'Réf. pièce', 'Notes'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(({ entry, clientName, projectName }) => (
                <tr key={entry.id} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(entry.entryDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>{clientName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{projectName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[entry.entryType]}`}>
                      {ENTRY_TYPE_LABELS[entry.entryType as ClientEntryType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                    {Number(entry.amount).toLocaleString('fr-FR')} {entry.currency}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--admin-text-muted)' }}>{entry.reference ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{entry.notes ?? '—'}</p>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune écriture.
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
