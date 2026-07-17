import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExtraExpenses, EXPENSE_STATUS_LABELS } from '@/lib/db/achat'
import Link from 'next/link'
import ExportExcelButton from '@/components/ExportExcelButton'
import ExpenseDecisionButtons from './ExpenseDecisionButtons'
import ExpenseScanDetails from './ExpenseScanDetails'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Extra dépenses | SOPAT Admin' }

const statusColors: Record<string, string> = {
  pending: 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
  approved: 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  rejected: 'bg-[var(--admin-red-dim)] text-[var(--admin-red)]',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ExtraExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const status = typeof sp.status === 'string' ? sp.status : undefined
  const rows = await getExtraExpenses({ status })
  const canDecide = ['admin', 'direction'].includes(session.user.role)

  const pending = rows.filter(({ expense }) => expense.status === 'pending').length
  const approvedTotal = rows
    .filter(({ expense }) => expense.status === 'approved')
    .reduce((s, { expense }) => s + Number(expense.amount), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Extra dépenses
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-AC-01 — Dépenses hors bon de commande, avec validation direction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton register="extra-expenses" />
          <Link
            href="/admin/achat/extra-expenses/new"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            + Nouvelle dépense
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: String(rows.length), color: 'var(--admin-text)' },
          { label: 'En attente de validation', value: String(pending), color: pending > 0 ? 'var(--admin-amber)' : 'var(--admin-text)' },
          { label: 'Approuvées (TND)', value: approvedTotal.toLocaleString('fr-FR'), color: 'var(--admin-emerald)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Toutes', value: undefined },
          { label: 'En attente', value: 'pending' },
          { label: 'Approuvées', value: 'approved' },
          { label: 'Rejetées', value: 'rejected' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/achat/extra-expenses?status=${value}` : '/admin/achat/extra-expenses'}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={status === value
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Date', 'Projet', 'Catégorie', 'Description', 'Scan', 'Montant', 'Statut', 'Demandeur', canDecide ? 'Validation' : ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ expense, projectName, creatorName }) => (
                <tr key={expense.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {expense.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {new Date(expense.expenseDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{projectName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{expense.category ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-[13px]" style={{ color: 'var(--admin-text)' }}>{expense.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    {expense.source === 'mobile_ocr' ? (
                      <ExpenseScanDetails
                        reference={expense.reference}
                        imageUrl={expense.receiptImageUrl}
                        ocrRawText={expense.ocrRawText}
                        ocrSuggested={expense.ocrSuggested as { amount?: string; expenseDate?: string; description?: string } | null}
                        validated={{
                          amount: expense.amount,
                          expenseDate: expense.expenseDate,
                          description: expense.description,
                        }}
                      />
                    ) : (
                      <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                    {Number(expense.amount).toLocaleString('fr-FR')} {expense.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[expense.status]}`}>
                      {EXPENSE_STATUS_LABELS[expense.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{creatorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {canDecide && expense.status === 'pending' && (
                      <ExpenseDecisionButtons expenseId={expense.id} />
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucune dépense.{' '}
                    <Link href="/admin/achat/extra-expenses/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
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
