import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { equipmentReceipts, users } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
import { Package, Plus, ChevronRight } from 'lucide-react'

export default async function EquipmentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const receipts = await db
    .select({
      id: equipmentReceipts.id,
      userName: users.name,
      issuedDate: equipmentReceipts.issuedDate,
      returnedDate: equipmentReceipts.returnedDate,
      items: equipmentReceipts.items,
    })
    .from(equipmentReceipts)
    .leftJoin(users, eq(users.id, equipmentReceipts.userId))
    .where(isNull(equipmentReceipts.deletedAt))
    .orderBy(desc(equipmentReceipts.createdAt))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Package size={20} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Reçus de matériel</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>FOR-RH-28 — {receipts.length} reçu(s)</p>
          </div>
        </div>
        <Link href="/admin/rh/equipment/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
          <Plus size={16} /> Nouveau reçu
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Employé', 'Date remise', 'Nb articles', 'Rendu le', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--admin-muted)' }}>
                Aucun reçu de matériel
              </td></tr>
            )}
            {receipts.map(r => {
              const items = (r.items as { description: string }[]) ?? []
              const returned = !!r.returnedDate
              return (
                <tr key={r.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors"
                  style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--admin-fg)' }}>{r.userName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {r.issuedDate ? new Date(r.issuedDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--admin-fg)' }}>{items.length}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-muted)' }}>
                    {r.returnedDate ? new Date(r.returnedDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ background: returned ? '#6b7280' : 'var(--green)' }}>
                      {returned ? 'Rendu' : 'En cours'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/rh/equipment/${r.id}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--green)' }}>
                      Voir <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
