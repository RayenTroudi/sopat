import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listRecruitmentRequests } from '@/lib/db/rh'
import { UserPlus, Plus, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  ouvert: 'Ouvert', en_cours: 'En cours', pourvu: 'Pourvu', annule: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  ouvert: 'var(--green)', en_cours: '#3b82f6', pourvu: '#6b7280', annule: '#ef4444',
}

const TABS = [
  { key: '', label: 'Tous' },
  { key: 'ouvert', label: 'Ouverts' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'pourvu', label: 'Pourvus' },
]

export default async function RecruitmentPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { status: statusParam } = await searchParams
  const status = statusParam || ''
  const requests = await listRecruitmentRequests(status || undefined)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <UserPlus size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Demandes de recrutement</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-01 — {requests.length} demande(s)</p>
          </div>
        </div>
        <Link
          href="/admin/rh/recruitment/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          <Plus size={16} /> Nouvelle demande
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <Link key={tab.key}
            href={`/admin/rh/recruitment${tab.key ? `?status=${tab.key}` : ''}`}
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
              {['Réf.', 'Poste', 'Département', 'Statut', 'Date ouverture', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                  Aucune demande de recrutement
                </td>
              </tr>
            )}
            {requests.map((req) => (
              <tr key={req.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>{req.refCode ?? '—'}</td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{req.postTitle}</td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>{req.requestingDept ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ background: STATUS_COLORS[req.status] ?? 'var(--admin-muted)' }}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-muted)' }}>
                  {req.openedDate ? new Date(req.openedDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/rh/recruitment/${req.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
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
