'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ActivityLog } from './ActivityLog'
import { EtudesTab } from '@/components/projects/EtudesTab'
import { RealisationTab } from '@/components/realisation/RealisationTab'
import { EntretienTab } from '@/components/entretien/EntretienTab'
import { BudgetSummaryBanner } from '@/components/budget/OfficialBudgetCard'
import type { UploadedAsset } from '@/components/upload/CloudinaryUploader'

type Phase = {
  id: string
  phase: string
  status: string
  startedAt: Date | null
  completedAt: Date | null
}

type ActivityEntry = {
  id: string
  actorName: string
  action: string
  previousState: unknown
  newState: unknown
  metadata: unknown
  occurredAt: Date
}

type ValidationData = {
  id: string
  status: string
  approvedAmount: string | null
  approvedByName: string | null
  approvedAt: Date | null
  modificationReason: string | null
  predictionId: string
} | null

type User = { id: string; name: string; email: string; role: string }

type Props = {
  projectId: string
  activeTab: string
  phases: Phase[]
  activityLog: ActivityEntry[]
  assets: UploadedAsset[]
  approvedBudget: string | null
  latestValidation: ValidationData
  isAdmin: boolean
  projectType: string
  siteAreaM2: string | null
  userRole: string
  siteAddress: string
  clientEmail: string | null
  clientPhone: string | null
  plantZones: string[]
  users: User[]
  currentUserId: string
}

const TABS = [
  { key: 'etudes',      label: 'Études' },
  { key: 'realisation', label: 'Réalisation' },
  { key: 'entretien',   label: 'Entretien' },
  { key: 'documents',   label: 'Documents' },
  { key: 'activite',    label: 'Activité' },
]

const PHASE_STATUS_LABELS: Record<string, string> = {
  pending:           'En attente',
  in_progress:       'En cours',
  awaiting_signoff:  'Attente validation',
  completed:         'Terminée',
}

function PhaseStatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:          'bg-[var(--admin-blue-dim)] text-[var(--admin-blue)]',
    in_progress:      'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]',
    awaiting_signoff: 'bg-[var(--admin-accent-dim)] text-[var(--admin-accent)]',
    completed:        'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', styles[status] ?? styles.pending)}>
      {PHASE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div
      className="rounded-xl border p-8 flex items-center justify-center"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        {title} — en cours de construction.
      </p>
    </div>
  )
}

export function ProjectTabs({
  projectId,
  activeTab,
  phases,
  activityLog,
  assets,
  approvedBudget,
  latestValidation,
  isAdmin,
  projectType,
  siteAreaM2,
  userRole,
  plantZones,
  users,
  currentUserId,
}: Props) {
  const pathname = usePathname()

  function tabHref(key: string) {
    return `${pathname}?tab=${key}`
  }

  function renderContent() {
    switch (activeTab) {
      case 'etudes': {
        const phase = phases.find((p) => p.phase === 'etudes')
        return (
          <EtudesTab
            projectId={projectId}
            phaseStatus={phase?.status ?? 'pending'}
            initialAssets={assets}
            approvedBudget={approvedBudget}
            initialValidation={latestValidation}
            isAdmin={isAdmin}
            projectType={projectType}
            siteAreaM2={siteAreaM2}
            userRole={userRole}
          />
        )
      }

      case 'realisation': {
        const phase = phases.find((p) => p.phase === 'realisation')
        return (
          <div className="space-y-4">
            <BudgetSummaryBanner approvedBudget={approvedBudget} />
            <RealisationTab
              projectId={projectId}
              phaseStatus={phase?.status ?? 'pending'}
              approvedBudget={approvedBudget}
              initialAssets={assets}
              userRole={userRole}
            />
          </div>
        )
      }

      case 'entretien': {
        const phase = phases.find((p) => p.phase === 'entretien')
        return (
          <div className="space-y-4">
            <BudgetSummaryBanner approvedBudget={approvedBudget} />
            <EntretienTab
              projectId={projectId}
              phaseStatus={phase?.status ?? 'pending'}
              plantZones={plantZones}
              users={users}
              currentUserId={currentUserId}
            />
          </div>
        )
      }

      case 'documents':
        return (
          <div className="space-y-4">
            <BudgetSummaryBanner approvedBudget={approvedBudget} />
            <PlaceholderTab title="Contrôle documentaire" />
          </div>
        )

      case 'activite':
      default:
        return <ActivityLog entries={activityLog} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-green'
                : 'border-transparent hover:border-[var(--admin-border)]'
            )}
            style={{ color: activeTab === tab.key ? 'var(--green)' : 'var(--admin-text-muted)' }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}
