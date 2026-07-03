import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listLeaveRequests } from '@/lib/db/rh'
import { Calendar, Plus, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente', approuve: 'Approuvé', refuse: 'Refusé', annule: 'Annulé',
}
const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_annuel: 'Congé annuel', conge_maladie: 'Congé maladie',
  conge_maternite: 'Maternité', conge_paternite: 'Paternité',
  conge_sans_solde: 'Sans solde', jour_ferie: 'Jour férié', autre: 'Autre',
}

const ApprovalIcon = ({ val }: { val: string | null }) => {
  if (!val) return <span style={{ color: 'var(--admin-muted)' }}>—</span>
  if (val === 'approuve') return <CheckCircle size={14} style={{ color: 'var(--green)' }} />
  if (val === 'refuse') return <XCircle size={14} style={{ color: '#ef4444' }} />
  return <Clock size={14} style={{ color: '#f59e0b' }} />
}

export default async function LeavesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { status: statusParam } = await searchParams
  const status = statusParam || ''
  const requests = await listLeaveRequests(undefined, status || undefined)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Calendar size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Congés & absences</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-14 — {requests.length} demande(s)</p>
          </div>
        </div>
        <Link
          href="/admin/rh/leaves/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouvelle demande
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: '', label: 'Tous' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ key: k, label: v }))].map(tab => (
          <Link key={tab.key}
            href={`/admin/rh/leaves${tab.key ? `?status=${tab.key}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={status === tab.key
              ? { background: 'var(--green)', color: 'var(--ivory)' }
              : { background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Type', 'Du', 'Au', 'Durée', 'Sup.', 'RH', 'Dir.', 'Statut', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucune demande de congé
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-3 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{r.userName ?? '—'}</td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                  {LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType}
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-fg)' }}>
                  {r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-fg)' }}>
                  {r.endDate ? new Date(r.endDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>{r.durationDays}j</td>
                <td className="px-3 py-3"><ApprovalIcon val={r.supervisorApproval} /></td>
                <td className="px-3 py-3"><ApprovalIcon val={r.rhApproval} /></td>
                <td className="px-3 py-3"><ApprovalIcon val={r.directionApproval} /></td>
                <td className="px-3 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      background: r.status === 'approuve' ? 'var(--green)' : r.status === 'refuse' ? '#ef4444' : 'var(--admin-bg)',
                      color: r.status === 'en_attente' ? 'var(--admin-muted)' : 'white',
                      border: r.status === 'en_attente' ? '1px solid var(--admin-border)' : 'none',
                    }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/rh/leaves/${r.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
