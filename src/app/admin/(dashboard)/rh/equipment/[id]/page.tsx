import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { equipmentReceipts, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ArrowLeft, Package } from 'lucide-react'

type Item = { description: string; quantity: number; serialNumber?: string }

export default async function EquipmentReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const [receipt] = await db
    .select({
      id: equipmentReceipts.id,
      issuedDate: equipmentReceipts.issuedDate,
      returnedDate: equipmentReceipts.returnedDate,
      returnedNotes: equipmentReceipts.returnedNotes,
      items: equipmentReceipts.items,
      userName: users.name,
    })
    .from(equipmentReceipts)
    .leftJoin(users, eq(users.id, equipmentReceipts.userId))
    .where(eq(equipmentReceipts.id, id))

  if (!receipt) redirect('/admin/rh/equipment')

  const items = (receipt.items as Item[]) ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rh/equipment" className="p-2 rounded-lg hover:opacity-70" style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--admin-fg)' }} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
            <Package size={18} style={{ color: 'var(--ivory)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Reçu de matériel</h1>
            <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>{receipt.userName} — FOR-RH-28</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Date de remise</div>
          <div className="font-medium" style={{ color: 'var(--admin-fg)' }}>{receipt.issuedDate ? new Date(receipt.issuedDate).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--admin-muted)' }}>Date de retour</div>
          <div className="font-medium" style={{ color: receipt.returnedDate ? '#6b7280' : 'var(--green)' }}>
            {receipt.returnedDate ? new Date(receipt.returnedDate).toLocaleDateString('fr-FR') : 'Matériel en cours d\'utilisation'}
          </div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--admin-muted)' }}>Articles — {items.length} article(s)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['Description', 'Quantité', 'N° série'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: 'var(--admin-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="even:bg-[var(--admin-bg)]/40" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-2" style={{ color: 'var(--admin-fg)' }}>{item.description}</td>
                <td className="px-4 py-2" style={{ color: 'var(--admin-fg)' }}>{item.quantity}</td>
                <td className="px-4 py-2 text-xs" style={{ color: 'var(--admin-muted)' }}>{item.serialNumber ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt.returnedNotes && (
        <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-muted)' }}>
          <strong style={{ color: 'var(--admin-fg)' }}>Notes de retour :</strong> {receipt.returnedNotes}
        </div>
      )}
    </div>
  )
}
