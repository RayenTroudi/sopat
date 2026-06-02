import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Alert = {
  type: 'warning' | 'critical'
  category: 'budget' | 'invoice' | 'profitability'
  projectId?: string
  projectName?: string
  invoiceId?: string
  message: string
}

async function getAlerts(): Promise<Alert[]> {
  const now = new Date()

  const projects = await prisma.project.findMany({
    include: {
      budgetItems: true,
      costItems: true,
      timeEntries: true,
      invoices: true,
      overheadAllocs: true,
    },
  })

  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: 'Issued', dueDate: { lt: now } },
    include: { project: { select: { id: true, name: true } } },
  })

  const alerts: Alert[] = []

  for (const p of projects) {
    const totalBudget = p.budgetItems.reduce((s, b) => s + b.plannedAmount, 0)
    const totalDirectCosts = p.costItems.reduce((s, c) => s + c.amount, 0) +
      p.timeEntries.reduce((s, t) => s + t.amount, 0)
    const overheadAllocated = p.overheadAllocs.reduce((s, o) => s + o.amount, 0)
    const totalRevenue = p.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)
    const netProfit = totalRevenue - totalDirectCosts - overheadAllocated

    if (totalBudget > 0) {
      const pct = totalDirectCosts / totalBudget
      if (pct > 1) {
        alerts.push({
          type: 'critical', category: 'budget', projectId: p.id, projectName: p.name,
          message: `Coûts dépassent le budget de ${((pct - 1) * 100).toFixed(1)}% (${totalDirectCosts.toFixed(3)} / ${totalBudget.toFixed(3)} TND)`,
        })
      } else if (pct > 0.8) {
        alerts.push({
          type: 'warning', category: 'budget', projectId: p.id, projectName: p.name,
          message: `Coûts à ${(pct * 100).toFixed(1)}% du budget (${totalDirectCosts.toFixed(3)} / ${totalBudget.toFixed(3)} TND)`,
        })
      }
    }

    if (netProfit < 0) {
      alerts.push({
        type: 'critical', category: 'profitability', projectId: p.id, projectName: p.name,
        message: `Résultat net négatif: ${netProfit.toFixed(3)} TND`,
      })
    }
  }

  for (const inv of overdueInvoices) {
    alerts.push({
      type: 'warning', category: 'invoice',
      projectId: inv.project.id, projectName: inv.project.name,
      invoiceId: inv.id,
      message: `Facture en retard depuis le ${inv.dueDate!.toLocaleDateString('fr-FR')} (${inv.totalAmount.toFixed(3)} TND)`,
    })
  }

  return alerts
}

const categoryLabel: Record<string, string> = {
  budget: 'Budget',
  invoice: 'Facture',
  profitability: 'Rentabilité',
}

export default async function AlertsPage() {
  const alerts = await getAlerts()

  const critical = alerts.filter(a => a.type === 'critical')
  const warnings = alerts.filter(a => a.type === 'warning')

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <p
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
        >
          SOPAT Finance
        </p>
        <h1
          className="text-3xl font-semibold"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}
        >
          Alertes
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {critical.length} critique{critical.length !== 1 ? 's' : ''} · {warnings.length} avertissement{warnings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {alerts.length === 0 && (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--admin-card)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--admin-emerald-dim)' }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--admin-emerald)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p
            className="font-semibold text-base"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}
          >
            Aucune alerte active
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}
          >
            Tous les projets sont dans les limites normales
          </p>
        </div>
      )}

      {critical.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--admin-red)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
            >
              Critique ({critical.length})
            </h2>
            <div className="flex-1 h-px" style={{ background: 'var(--admin-red-dim)' }} />
          </div>
          {critical.map((a, i) => <AlertCard key={i} alert={a} />)}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 mt-4">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--admin-amber)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
            >
              Avertissements ({warnings.length})
            </h2>
            <div className="flex-1 h-px" style={{ background: 'var(--admin-amber-dim)' }} />
          </div>
          {warnings.map((a, i) => <AlertCard key={i} alert={a} />)}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert: a }: { alert: Alert }) {
  const isCritical = a.type === 'critical'
  const colors = isCritical
    ? { bg: 'var(--admin-red-dim)', border: 'rgba(224,93,93,0.2)', accent: 'var(--admin-red)', badgeBg: 'rgba(224,93,93,0.15)' }
    : { bg: 'var(--admin-amber-dim)', border: 'rgba(212,165,58,0.2)', accent: 'var(--admin-amber)', badgeBg: 'rgba(212,165,58,0.15)' }

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-4 transition-all duration-150"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${colors.accent}20`, color: colors.accent }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isCritical ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              background: colors.badgeBg,
              color: colors.accent,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {categoryLabel[a.category]}
          </span>
          {a.projectName && a.projectId && (
            <Link
              href={`/admin/projects/${a.projectId}`}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}
            >
              {a.projectName}
            </Link>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {a.message}
        </p>
      </div>
      {a.projectId && (
        <Link
          href={`/admin/projects/${a.projectId}`}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{
            color: colors.accent,
            border: `1px solid ${colors.border}`,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Voir →
        </Link>
      )}
    </div>
  )
}
