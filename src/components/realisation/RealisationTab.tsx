'use client'

import { useState, useEffect, useCallback } from 'react'
import { BudgetMonitorWidget } from './BudgetMonitorWidget'
import { PurchaseDrawer } from './PurchaseDrawer'
import { EquipmentDrawer } from './EquipmentDrawer'
import { EquipmentTable, type EquipmentRentalRow } from './EquipmentTable'
import { PhotoCheckpoints, type CheckpointState } from './PhotoCheckpoints'
import { RealisationSignoffPanel } from './RealisationSignoffPanel'
import { FicheEquipeSection } from './FicheEquipeSection'
import { JournalChantierSection } from './JournalChantierSection'
import { PlanActionSection } from './PlanActionSection'
import { CloudinaryUploader, type UploadedAsset } from '@/components/upload/CloudinaryUploader'
import type { TeamMemberRow } from '@/lib/db/realisation'

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseRow = {
  id: string
  itemDescription: string
  quantityPurchased: string
  unitPricePaid: string
  totalCost: string
  supplierName: string | null
  supplierInvoiceNumber: string | null
  invoiceUrl: string | null
  purchaseDate: Date | string
  purchasedByName: string | null
  status: string
  notes: string | null
  plantListItemName: string | null
}

type PlantItem = {
  id: string
  botanicalName: string
  commonName: string | null
  category: string
}

type Supplier = {
  id: string
  name: string
}

type BudgetRecon = {
  id: string
  approvedBudget: string
  totalSpent: string
  variance: string
  variancePct: string
  notes: string
  submittedAt: Date | string
  submittedByName: string | null
}

type Props = {
  projectId:      string
  phaseStatus:    string
  approvedBudget: string | null
  initialAssets:  UploadedAsset[]
  userRole:       string
  initialTeamMembers: TeamMemberRow[]
}

const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const FMT0 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function fmt3(n: string | number) { return `${FMT.format(typeof n === 'string' ? parseFloat(n) : n)} TND` }
function fmt0(n: string | number) { return `${FMT0.format(Math.round(typeof n === 'string' ? parseFloat(n) : n))} TND` }
function fmtDate(d: Date | string) { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

// ─── Main Component ───────────────────────────────────────────────────────────

export function RealisationTab({ projectId, phaseStatus, approvedBudget, initialAssets, userRole, initialTeamMembers }: Props) {
  const [orders, setOrders] = useState<PurchaseRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [plantItems, setPlantItems] = useState<PlantItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [checkpoints, setCheckpoints] = useState<CheckpointState[]>([])
  const [assets, setAssets] = useState<UploadedAsset[]>(initialAssets)
  const [recon, setRecon] = useState<BudgetRecon | null>(null)
  const [reconNotes, setReconNotes] = useState('')
  const [reconSubmitting, setReconSubmitting] = useState(false)
  const [reconError, setReconError] = useState('')
  const [phaseCompleted, setPhaseCompleted] = useState(phaseStatus === 'completed')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rentals, setRentals] = useState<EquipmentRentalRow[]>([])
  const [rentalsLoading, setRentalsLoading] = useState(true)
  const [equipmentDrawerOpen, setEquipmentDrawerOpen] = useState(false)
  const [equipmentPlantItems, setEquipmentPlantItems] = useState<PlantItem[]>([])
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null)

  const receptionDocs = assets.filter((a) => a.assetType === 'reception_document')

  // Load purchase orders
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/purchase-orders`)
      if (res.ok) setOrders(await res.json() as PurchaseRow[])
    } finally {
      setOrdersLoading(false)
    }
  }, [projectId])

  // Load plant items + suppliers (for drawer)
  const loadDrawerData = useCallback(async () => {
    const [plantRes, suppRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/plant-list`),
      fetch('/api/suppliers'),
    ])
    if (plantRes.ok) setPlantItems(await plantRes.json() as PlantItem[])
    if (suppRes.ok) setSuppliers(await suppRes.json() as Supplier[])
  }, [projectId])

  // Load site photo checkpoints
  const loadCheckpoints = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/site-photos`)
    if (res.ok) setCheckpoints(await res.json() as CheckpointState[])
  }, [projectId])

  // Load budget reconciliation
  const loadRecon = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/budget-reconciliation`)
    if (res.ok) {
      const data = await res.json() as { reconciliation: BudgetRecon | null; totalSpent: string }
      setRecon(data.reconciliation)
    }
  }, [projectId])

  // Load equipment rentals
  const loadRentals = useCallback(async () => {
    setRentalsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/equipment-rentals`)
      if (res.ok) {
        const data = await res.json() as { rentals: EquipmentRentalRow[]; plantItems: PlantItem[] }
        setRentals(data.rentals)
        setEquipmentPlantItems(data.plantItems)
      }
    } finally {
      setRentalsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadOrders()
    void loadDrawerData()
    void loadCheckpoints()
    void loadRecon()
    void loadRentals()
  }, [loadOrders, loadDrawerData, loadCheckpoints, loadRecon, loadRentals])

  // Total spent from orders (client-side sum for instant feedback)
  const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.totalCost), 0)

  async function deleteOrder(orderId: string) {
    if (!confirm('Supprimer ce bon de commande ?')) return
    setDeletingId(orderId)
    try {
      const res = await fetch(`/api/projects/${projectId}/purchase-orders/${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function deleteRental(rentalId: string) {
    if (!confirm('Supprimer cette location ?')) return
    setDeletingRentalId(rentalId)
    try {
      const res = await fetch(`/api/projects/${projectId}/equipment-rentals/${rentalId}`, { method: 'DELETE' })
      if (res.ok) setRentals((prev) => prev.filter((r) => r.id !== rentalId))
    } finally {
      setDeletingRentalId(null)
    }
  }

  async function submitRecon() {
    if (!reconNotes.trim()) { setReconError('Les notes de rapprochement sont obligatoires'); return }
    setReconSubmitting(true)
    setReconError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/budget-reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reconNotes }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setReconError(data.error ?? 'Erreur serveur'); return }
      await loadRecon()
    } finally {
      setReconSubmitting(false)
    }
  }

  const canSignOff = userRole === 'admin' || userRole === 'direction' || userRole === 'realisation_chef'

  const canEdit = userRole === 'admin' || userRole === 'direction' || userRole === 'realisation_chef' || userRole === 'realisation_team'

  return (
    <div className="space-y-6">
      {/* ── FOR-RE-03: Équipe projet ── */}
      <FicheEquipeSection
        projectId={projectId}
        initialMembers={initialTeamMembers}
        canEdit={canEdit}
      />

      {/* ── PLA-RE-03: Plan d'action ── */}
      <PlanActionSection projectId={projectId} canEdit={canEdit} />

      {/* ── FOR-RE-04: Journal de chantier ── */}
      <JournalChantierSection projectId={projectId} canEdit={canEdit} />

      {/* ── 1. Budget monitor ── */}
      <Section title="Suivi Budgétaire">
        <BudgetMonitorWidget projectId={projectId} approvedBudget={approvedBudget} />
      </Section>

      {/* ── 2. Purchase orders ── */}
      <Section
        title="Bons de Commande"
        action={
          !phaseCompleted && (
            <button
              type="button"
              onClick={() => {
                void loadDrawerData()
                setDrawerOpen(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter un achat
            </button>
          )
        }
      >
        {ordersLoading ? (
          <div className="py-8 flex items-center justify-center">
            <span className="animate-spin w-5 h-5 border-2 rounded-full inline-block" style={{ borderColor: 'var(--admin-border)', borderTopColor: 'var(--admin-emerald)' }} />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun achat enregistré. Cliquez sur &quot;Ajouter un achat&quot; pour commencer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Article', 'Qté', 'Prix unit.', 'Total', 'Fournisseur', 'Facture', 'Date', 'Acheté par', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    className="hover:bg-[var(--admin-border)] transition-colors"
                  >
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="truncate font-medium" style={{ color: 'var(--admin-text)' }}>
                        {order.itemDescription}
                      </p>
                      {order.plantListItemName && (
                        <p className="text-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>
                          Lié : {order.plantListItemName}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {parseFloat(order.quantityPurchased)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--admin-text)' }}>
                      {fmt3(order.unitPricePaid)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {fmt3(order.totalCost)}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--admin-text-muted)' }}>
                      {order.supplierName ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {order.invoiceUrl ? (
                        <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--admin-blue)' }}>
                          {order.supplierInvoiceNumber ?? 'Voir PDF'}
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {order.supplierInvoiceNumber ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {fmtDate(order.purchaseDate)}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                      {order.purchasedByName ?? '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {!phaseCompleted && (
                        <button
                          type="button"
                          onClick={() => void deleteOrder(order.id)}
                          disabled={deletingId === order.id}
                          className="p-1 rounded hover:bg-[var(--admin-red-dim)] disabled:opacity-50"
                          title="Supprimer"
                          style={{ color: 'var(--admin-text-muted)' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--admin-border)' }}>
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-medium text-right" style={{ color: 'var(--admin-text-muted)' }}>
                    Total dépensé :
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {fmt0(totalSpent)}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* ── 3. Equipment rentals ── */}
      <Section
        title="Matériel & Engins"
        action={
          !phaseCompleted && (
            <button
              type="button"
              onClick={() => setEquipmentDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: 'var(--admin-emerald)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Ajouter un engin
            </button>
          )
        }
      >
        <EquipmentTable
          rentals={rentals}
          loading={rentalsLoading}
          phaseCompleted={phaseCompleted}
          onDelete={(id) => void deleteRental(id)}
          deletingId={deletingRentalId}
        />
      </Section>

      {/* ── 5. Site photo checkpoints ── */}
      <Section title="Photos de Jalons Qualité">
        <p className="text-xs mb-3" style={{ color: 'var(--admin-text-muted)' }}>
          5 photos obligatoires pour le dossier qualité (ISO 9001 – clause 8.6). Téléchargez une photo pour chaque jalon d&apos;avancement.
        </p>
        <PhotoCheckpoints
          projectId={projectId}
          checkpoints={checkpoints.length > 0 ? checkpoints : defaultCheckpoints}
          onChange={setCheckpoints}
        />
      </Section>

      {/* ── 6. Reception document upload ── */}
      <Section title="Document de Réception Client">
        <p className="text-xs mb-3" style={{ color: 'var(--admin-text-muted)' }}>
          Téléchargez le procès-verbal de réception signé par le client.
        </p>
        <CloudinaryUploader
          projectId={projectId}
          assetType="reception_document"
          accept=".pdf,application/pdf"
          label="PV de réception client (PDF)"
          description="Procès-verbal signé par le client"
          maxFiles={3}
          existingAssets={receptionDocs}
          onUploaded={(asset) => setAssets((prev) => [...prev, asset])}
          onDeleted={(id) => setAssets((prev) => prev.filter((a) => a.id !== id))}
        />
      </Section>

      {/* ── 7. Budget reconciliation ── */}
      <Section title="Rapprochement Budgétaire">
        {recon ? (
          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ borderColor: 'var(--admin-emerald)', background: 'var(--admin-emerald-dim)' }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--admin-emerald)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-emerald)' }}>
                Rapprochement soumis le {fmtDate(recon.submittedAt)}
                {recon.submittedByName ? ` par ${recon.submittedByName}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Budget approuvé</p>
                <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{fmt0(recon.approvedBudget)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Total dépensé</p>
                <p className="font-medium" style={{ color: 'var(--admin-text)' }}>{fmt0(recon.totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Écart</p>
                <p
                  className="font-medium"
                  style={{ color: parseFloat(recon.variance) > 0 ? 'var(--admin-red)' : 'var(--admin-emerald)' }}
                >
                  {parseFloat(recon.variance) >= 0 ? '+' : ''}{fmt0(recon.variance)} ({parseFloat(recon.variance) >= 0 ? '+' : ''}{recon.variancePct}%)
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>Notes</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text)' }}>{recon.notes}</p>
            </div>
            {!phaseCompleted && (
              <button
                type="button"
                onClick={() => { setRecon(null); setReconNotes('') }}
                className="text-xs underline"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                Modifier le rapprochement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 px-4 py-3 rounded-lg" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Budget approuvé</p>
                <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>
                  {approvedBudget ? fmt0(approvedBudget) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Total dépensé</p>
                <p className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>{fmt0(totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Écart calculé</p>
                <p
                  className="font-medium text-sm"
                  style={{ color: approvedBudget && totalSpent > parseFloat(approvedBudget) ? 'var(--admin-red)' : 'var(--admin-emerald)' }}
                >
                  {approvedBudget ? `${totalSpent - parseFloat(approvedBudget) >= 0 ? '+' : ''}${fmt0(totalSpent - parseFloat(approvedBudget))}` : '—'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
                Notes de rapprochement *
              </label>
              <textarea
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
                rows={3}
                placeholder="Expliquez les écarts constatés, les postes sous/sur-budgetés, les causes..."
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
              />
              {reconError && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{reconError}</p>}
            </div>
            <button
              type="button"
              onClick={() => void submitRecon()}
              disabled={reconSubmitting || !reconNotes.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--admin-emerald)' }}
            >
              {reconSubmitting ? 'Soumission…' : 'Soumettre le rapprochement'}
            </button>
          </div>
        )}
      </Section>

      {/* ── 8. Sign-off ── */}
      {canSignOff && (
        <Section title="">
          <RealisationSignoffPanel
            projectId={projectId}
            phaseStatus={phaseCompleted ? 'completed' : phaseStatus}
            approvedBudget={approvedBudget}
            onSignedOff={() => setPhaseCompleted(true)}
          />
        </Section>
      )}

      {/* Purchase drawer */}
      <PurchaseDrawer
        projectId={projectId}
        plantItems={plantItems}
        suppliers={suppliers}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false)
          void loadOrders()
        }}
      />

      {/* Equipment drawer */}
      <EquipmentDrawer
        projectId={projectId}
        plantItems={equipmentPlantItems}
        open={equipmentDrawerOpen}
        onClose={() => setEquipmentDrawerOpen(false)}
        onCreated={() => {
          setEquipmentDrawerOpen(false)
          void loadRentals()
        }}
      />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--admin-border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

// Default checkpoints before API loads (avoids flash)
const defaultCheckpoints: CheckpointState[] = [
  { id: 'mobilisation',     label: 'Mobilisation du chantier', milestone: 'mobilisation',     photo: null },
  { id: 'progress_25',      label: 'Avancement 25%',           milestone: 'progress_25',      photo: null },
  { id: 'progress_50',      label: 'Avancement 50%',           milestone: 'progress_50',      photo: null },
  { id: 'progress_75',      label: 'Avancement 75%',           milestone: 'progress_75',      photo: null },
  { id: 'reception_finale', label: 'Réception finale',         milestone: 'reception_finale', photo: null },
]
