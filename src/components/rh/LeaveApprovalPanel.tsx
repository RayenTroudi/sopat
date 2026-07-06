'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { approveLeaveRequestAction } from '@/lib/actions/rh'

type ApprovalValue = string | null

function StatusBadge({ val }: { val: ApprovalValue }) {
  if (!val || val === 'en_attente') return (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#f59e0b' }}>
      <Clock size={15} /> En attente
    </span>
  )
  if (val === 'approuve') return (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--green)' }}>
      <CheckCircle size={15} /> Approuvé
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#ef4444' }}>
      <XCircle size={15} /> Refusé
    </span>
  )
}

function ApprovalRow({
  label, field, value, canAct, requestId, onDone,
}: {
  label: string
  field: string
  value: ApprovalValue
  canAct: boolean
  requestId: string
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [localError, setLocalError] = useState('')

  function act(status: 'approuve' | 'refuse') {
    setLocalError('')
    startTransition(async () => {
      const res = await approveLeaveRequestAction(requestId, field, status)
      if (res.success) {
        onDone()
      } else {
        setLocalError(res.error ?? 'Erreur')
      }
    })
  }

  const settled = value === 'approuve' || value === 'refuse'

  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--admin-fg)' }}>{label}</p>
        <div className="mt-1"><StatusBadge val={value} /></div>
        {localError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{localError}</p>}
      </div>

      {canAct && !settled && (
        <div className="flex gap-2">
          <button
            onClick={() => act('approuve')}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            <CheckCircle size={14} /> Approuver
          </button>
          <button
            onClick={() => act('refuse')}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#ef4444', color: '#fff' }}>
            <XCircle size={14} /> Refuser
          </button>
        </div>
      )}

      {canAct && settled && (
        <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
          Décision enregistrée
        </span>
      )}

      {!canAct && (
        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Non autorisé</span>
      )}
    </div>
  )
}

export function LeaveApprovalPanel({
  id,
  supervisorApproval,
  rhApproval,
  directionApproval,
  canApproveSupervisor,
  canApproveRh,
  canApproveDirection,
}: {
  id: string
  supervisorApproval: ApprovalValue
  rhApproval: ApprovalValue
  directionApproval: ApprovalValue
  canApproveSupervisor: boolean
  canApproveRh: boolean
  canApproveDirection: boolean
}) {
  const router = useRouter()

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>Approbations</p>
      </div>
      <div className="px-5">
        <ApprovalRow
          label="Responsable hiérarchique"
          field="supervisorApproval"
          value={supervisorApproval}
          canAct={canApproveSupervisor}
          requestId={id}
          onDone={() => router.refresh()}
        />
        <ApprovalRow
          label="Ressources Humaines"
          field="rhApproval"
          value={rhApproval}
          canAct={canApproveRh}
          requestId={id}
          onDone={() => router.refresh()}
        />
        <ApprovalRow
          label="Direction"
          field="directionApproval"
          value={directionApproval}
          canAct={canApproveDirection}
          requestId={id}
          onDone={() => router.refresh()}
        />
      </div>
    </div>
  )
}
