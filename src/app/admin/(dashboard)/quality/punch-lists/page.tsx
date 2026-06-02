import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, Empty } from '@/components/admin/ui'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Listes de défauts – SOPAT Admin' }

export default async function PunchListsPage() {
  const inspections = await prisma.inspection.findMany({
    where: { punchListItems: { some: {} } },
    include: {
      project: { select: { name: true } },
      punchListItems: { orderBy: { severity: 'asc' } },
    },
    orderBy: { inspectionDate: 'desc' },
  })

  const allItems = inspections.flatMap(i => i.punchListItems)
  const openCount = allItems.filter(p => p.status === 'Open').length
  const criticalOpen = allItems.filter(p => p.severity === 'Critical' && p.status === 'Open').length

  const severityStyle: Record<string, { color: string; bg: string }> = {
    Minor:    { color: 'var(--admin-text-muted)', bg: 'var(--admin-border)' },
    Major:    { color: 'var(--admin-amber)',       bg: 'var(--admin-amber-dim)' },
    Critical: { color: 'var(--admin-red)',         bg: 'var(--admin-red-dim)' },
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}>
            Contrôle Qualité
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}>
            Listes de défauts
          </h1>
        </div>
        <Link href="/admin/quality/inspections"
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--admin-accent)', background: 'var(--admin-accent-dim)', fontFamily: 'var(--font-sans)' }}>
          Gérer les inspections →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total défauts', value: allItems.length, color: 'var(--admin-text)' },
          { label: 'Ouverts', value: openCount, color: 'var(--admin-amber)' },
          { label: 'Critiques ouverts', value: criticalOpen, color: 'var(--admin-red)' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{k.label}</p>
            <p className="text-2xl font-semibold" style={{ color: k.color, fontFamily: 'var(--font-playfair)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {inspections.length === 0 ? (
          <Card><Empty message="Aucune liste de défauts. Créez des inspections pour commencer." /></Card>
        ) : (
          inspections.map(insp => (
            <div key={insp.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}>{insp.title}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>
                    {insp.project.name} · {new Date(insp.inspectionDate).toLocaleDateString('fr-TN')}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--admin-border)', color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {insp.punchListItems.filter(p => p.status === 'Open').length} ouvert{insp.punchListItems.filter(p => p.status === 'Open').length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                {insp.punchListItems.map(item => {
                  const s = severityStyle[item.severity]
                  return (
                    <div key={item.id} className="px-5 py-3 flex items-center gap-4 admin-tr">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === 'Resolved' ? 'opacity-40' : ''}`}
                        style={{ background: s?.color ?? 'var(--admin-border)' }} />
                      <p className={`flex-1 text-sm ${item.status === 'Resolved' ? 'line-through opacity-60' : ''}`}
                        style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                        {item.description}
                      </p>
                      {item.location && (
                        <span className="text-xs" style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}>{item.location}</span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                        style={{ background: s?.bg, color: s?.color, fontFamily: 'var(--font-sans)' }}>
                        {item.severity}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
