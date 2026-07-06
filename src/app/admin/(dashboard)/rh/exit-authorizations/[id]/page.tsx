import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { exitAuthorizations, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, LogOut } from 'lucide-react'
import { ExitApprovalPanel } from '@/components/rh/ExitApprovalPanel'

export default async function ExitAuthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const u = session.user as { userId?: string; id?: string; role?: string }
  const currentUserId = (u.userId ?? u.id)!
  const currentRole = (u.role ?? '') as string

  const [req] = await db
    .select({
      id: exitAuthorizations.id,
      userId: exitAuthorizations.userId,
      startTime: exitAuthorizations.startTime,
      endTime: exitAuthorizations.endTime,
      durationHours: exitAuthorizations.durationHours,
      reason: exitAuthorizations.reason,
      notes: exitAuthorizations.notes,
      supervisorApproval: exitAuthorizations.supervisorApproval,
      rhApproval: exitAuthorizations.rhApproval,
      userName: users.name,
    })
    .from(exitAuthorizations)
    .leftJoin(users, eq(users.id, exitAuthorizations.userId))
    .where(eq(exitAuthorizations.id, id))

  if (!req) redirect('/admin/rh/exit-authorizations')

  const isSelf = req.userId === currentUserId
  const canApproveSupervisor = ['admin', 'direction', 'rh_manager', 'etudes_chef', 'realisation_chef', 'entretien_chef'].includes(currentRole) && !isSelf
  const canApproveRh         = ['admin', 'direction', 'rh_manager', 'rh_agent'].includes(currentRole) && !isSelf

  const fmt = (d: Date | string | null) =>
    d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/exit-authorizations" className="p-2 rounded-lg hover:opacity-70"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
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
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Horaires</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Départ</span>
              <p className="font-medium mt-0.5" style={{ color: 'var(--admin-fg)' }}>{fmt(req.startTime)}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Retour</span>
              <p className="font-medium mt-0.5" style={{ color: 'var(--admin-fg)' }}>{fmt(req.endTime)}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Durée</span>
              <p className="font-bold mt-0.5" style={{ color: 'var(--green)' }}>
                {req.durationHours ? `${req.durationHours}h` : '—'}
              </p>
            </div>
          </div>
          {req.reason && (
            <div>
              <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Motif</span>
              <p className="text-sm mt-0.5" style={{ color: 'var(--admin-fg)' }}>{req.reason}</p>
            </div>
          )}
          {req.notes && (
            <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>{req.notes}</p>
          )}
        </div>

        <ExitApprovalPanel
          id={id}
          supervisorApproval={req.supervisorApproval}
          rhApproval={req.rhApproval}
          canApproveSupervisor={canApproveSupervisor}
          canApproveRh={canApproveRh}
        />
      </div>
    </div>
  )
}
