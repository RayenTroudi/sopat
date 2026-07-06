import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { exitAuthorizations, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react'

const ApprovalBadge = ({ val }: { val: string | null }) => {
  if (!val || val === 'en_attente') return <span className="flex items-center gap-1 text-xs" style={{ color: '#f59e0b' }}><Clock size={13} /> En attente</span>
  if (val === 'approuve') return <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--green)' }}><CheckCircle size={13} /> Approuvé</span>
  return <span className="flex items-center gap-1 text-xs" style={{ color: '#ef4444' }}><XCircle size={13} /> Refusé</span>
}

export default async function ExitAuthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [req] = await db
    .select({
      id: exitAuthorizations.id,
      startTime: exitAuthorizations.startTime,
      endTime: exitAuthorizations.endTime,
      durationHours: exitAuthorizations.durationHours,
      reason: exitAuthorizations.reason,
      notes: exitAuthorizations.notes,
      status: exitAuthorizations.status,
      supervisorApproval: exitAuthorizations.supervisorApproval,
      rhApproval: exitAuthorizations.rhApproval,
      userName: users.name,
    })
    .from(exitAuthorizations)
    .leftJoin(users, eq(users.id, exitAuthorizations.userId))
    .where(eq(exitAuthorizations.id, id))

  if (!req) redirect('/admin/rh/exit-authorizations')

  const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/exit-authorizations" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <LogOut size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Autorisation de sortie</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{req.userName} — FOR-RH-15</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Horaires</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span style={{ color: 'var(--admin-muted)' }}>Départ :</span><br /><strong style={{ color: 'var(--admin-fg)' }}>{fmt(req.startTime)}</strong></div>
            <div><span style={{ color: 'var(--admin-muted)' }}>Retour :</span><br /><strong style={{ color: 'var(--admin-fg)' }}>{fmt(req.endTime)}</strong></div>
            <div><span style={{ color: 'var(--admin-muted)' }}>Durée :</span><br /><strong style={{ color: 'var(--green)' }}>{req.durationHours ? `${req.durationHours}h` : '—'}</strong></div>
          </div>
        </div>

        <div className="rounded-xl border p-5 space-y-2" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Motif</p>
          <p className="text-sm" style={{ color: 'var(--admin-fg)' }}>{req.reason ?? '—'}</p>
          {req.notes && <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>{req.notes}</p>}
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Approbations</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--admin-muted)' }}>Superviseur</div>
              <ApprovalBadge val={req.supervisorApproval} />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--admin-muted)' }}>RH</div>
              <ApprovalBadge val={req.rhApproval} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
