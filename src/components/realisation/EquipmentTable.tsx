'use client'

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const FMT0 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmt3(n: string | number) {
  return FMT.format(typeof n === 'string' ? parseFloat(n) : n)
}
function fmt0(n: number) {
  return FMT0.format(Math.round(n))
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ICON_MAP: Record<string, string> = {
  grue:             '🏗',
  jcb_telescopique: '🚜',
  tracteur:         '🚛',
  camion_plateau:   '🚚',
  nacelle:          '🦺',
  mini_pelle:       '⛏',
  compresseur:      '💨',
  autre:            '🔧',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EquipmentRentalRow = {
  id:                   string
  equipmentTypeName:    string
  equipmentTypeIcon:    string | null
  equipmentDescription: string | null
  rentalCompany:        string | null
  startDate:            string
  endDate:              string
  rentalDays:           number
  totalCost:            string
  currency:             string
  invoiceNumber:        string | null
  invoiceUrl:           string | null
  operatorName:         string | null
  purposeDescription:   string | null
}

type Props = {
  rentals:      EquipmentRentalRow[]
  loading:      boolean
  phaseCompleted: boolean
  onDelete:     (id: string) => void
  deletingId:   string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipmentTable({ rentals, loading, phaseCompleted, onDelete, deletingId }: Props) {
  const totalEquipment = rentals.reduce((sum, r) => sum + parseFloat(r.totalCost), 0)

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <span
          className="animate-spin w-5 h-5 border-2 rounded-full inline-block"
          style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }}
        />
      </div>
    )
  }

  if (rentals.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
        Aucun engin enregistré. Cliquez sur &quot;Ajouter un engin&quot; pour commencer.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
            {['Type', 'Description', 'Société', 'Période', 'Jours', 'Coût total', 'Facture', ''].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-xs font-medium"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const icon = ICON_MAP[r.equipmentTypeIcon ?? ''] ?? '🔧'
            return (
              <tr
                key={r.id}
                style={{ borderBottom: '1px solid var(--admin-border)' }}
                className="hover:bg-[var(--admin-bg)] transition-colors"
              >
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-base mr-1.5">{icon}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                    {r.equipmentTypeName}
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <p className="truncate text-xs" style={{ color: 'var(--admin-text)' }}>
                    {r.equipmentDescription ?? '—'}
                  </p>
                  {r.purposeDescription && (
                    <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }} title={r.purposeDescription}>
                      {r.purposeDescription}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {r.rentalCompany ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>
                  {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums text-center" style={{ color: 'var(--admin-text)' }}>
                  {r.rentalDays}j
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {fmt3(r.totalCost)} {r.currency}
                </td>
                <td className="px-3 py-2.5">
                  {r.invoiceUrl ? (
                    <a
                      href={r.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                      style={{ color: 'var(--admin-blue)' }}
                    >
                      {r.invoiceNumber ?? 'Voir PDF'}
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {r.invoiceNumber ?? '—'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {!phaseCompleted && (
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="p-1 rounded hover:bg-[var(--admin-red-dim)] disabled:opacity-50"
                      title="Supprimer"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--admin-border)' }}>
            <td colSpan={5} className="px-3 py-2.5 text-xs font-medium text-right" style={{ color: 'var(--admin-text-muted)' }}>
              Total matériel & engins :
            </td>
            <td className="px-3 py-2.5 font-bold tabular-nums text-xs" style={{ color: 'var(--admin-text)' }}>
              {fmt0(totalEquipment)} TND
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
