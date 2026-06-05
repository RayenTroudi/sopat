'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PhaseBadge } from '@/components/projects/PhaseBadge'
import { BudgetBadge } from '@/components/projects/BudgetBadge'
import type { ProjectStatus } from '@/lib/db/projects'

type ProjectRow = {
  id: string
  reference: string
  name: string
  clientName: string
  status: string
  projectType: string
  approvedBudget: string | null
  assignedEtudesChefId: string | null
  estimatedDeliveryDate: Date | null
  createdAt: Date
}

type Props = {
  rows: ProjectRow[]
  total: number
  page: number
  pageSize: number
}

const TYPE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  public: 'Public',
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'etudes', label: 'Études' },
  { value: 'realisation', label: 'Réalisation' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

function fmt(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ProjectsTable({ rows, total, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / pageSize)
  const currentStatus = searchParams.get('status') ?? ''

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green/20"
          style={{
            background: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
            color: 'var(--admin-text)',
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
          {total} projet{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Réf.', 'Projet', 'Client', 'Type', 'Phase', 'Budget', 'Livraison est.', 'Créé le'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                  Aucun projet trouvé.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: i < rows.length - 1 ? '1px solid var(--admin-border)' : undefined,
                }}
                className="hover:bg-[var(--admin-bg)] transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {row.reference}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/projects/${row.id}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                  {row.clientName}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {TYPE_LABELS[row.projectType] ?? row.projectType}
                </td>
                <td className="px-4 py-3">
                  <PhaseBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <BudgetBadge approved={row.approvedBudget} />
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {fmt(row.estimatedDeliveryDate)}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {fmt(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
              className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Précédent
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => updateParam('page', String(page + 1))}
              className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
