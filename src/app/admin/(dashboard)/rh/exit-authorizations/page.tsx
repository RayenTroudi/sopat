import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { exitAuthorizations, users } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
import { LogOut, Plus, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'

const ApprovalIcon = ({ val }: { val: string | null }) => {
  if (!val || val === 'en_attente') return <Clock size={14} style={{ color: '#f59e0b' }} />
  if (val === 'approuve') return <CheckCircle size={14} style={{ color: 'var(--green)' }} />
  return <XCircle size={14} style={{ color: '#ef4444' }} />
}

export default async function ExitAuthorizationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const requests = await db
    .select({
      id: exitAuthorizations.id,
      userName: users.name,
      startTime: exitAuthorizations.startTime,
      endTime: exitAuthorizations.endTime,
      durationHours: exitAuthorizations.durationHours,
      reason: exitAuthorizations.reason,
      status: exitAuthorizations.status,
      supervisorApproval: exitAuthorizations.supervisorApproval,
      rhApproval: exitAuthorizations.rhApproval,
    })
    .from(exitAuthorizations)
    .leftJoin(users, eq(users.id, exitAuthorizations.userId))
    .where(isNull(exitAuthorizations.deletedAt))
    .orderBy(desc(exitAuthorizations.createdAt))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <LogOut size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Autorisations de sortie</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-15 — {requests.length} demande(s)</p>
          </div>
        </div>
        <Link href="/admin/rh/exit-authorizations/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Nouvelle demande
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Départ', 'Retour', 'Durée', 'Motif', 'Sup.', 'RH', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucune autorisation de sortie
              </td></tr>
            )}
            {requests.map(r => (
              <tr key={r.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{r.userName ?? '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-fg)' }}>
                  {r.startTime ? new Date(r.startTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-fg)' }}>
                  {r.endTime ? new Date(r.endTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {r.durationHours ? `${r.durationHours}h` : '—'}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-xs" style={{ color: 'var(--admin-muted)' }}>{r.reason ?? '—'}</td>
                <td className="px-4 py-3"><ApprovalIcon val={r.supervisorApproval} /></td>
                <td className="px-4 py-3"><ApprovalIcon val={r.rhApproval} /></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/exit-authorizations/${r.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                    Voir <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
