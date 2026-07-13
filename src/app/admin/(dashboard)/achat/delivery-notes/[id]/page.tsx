import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getDeliveryNoteById, NOTE_TYPE_LABELS } from '@/lib/db/achat'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bon de livraison / retour | SOPAT Admin' }

export default async function DeliveryNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [session, { id }] = await Promise.all([auth(), params])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const row = await getDeliveryNoteById(id)
  if (!row) notFound()
  const { note, projectName, supplierName } = row
  const items = note.items ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/achat/delivery-notes" className="text-[13px] hover:opacity-70" style={{ color: 'var(--admin-text-muted)' }}>
            ← Retour
          </Link>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            {note.reference}
          </h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            note.noteType === 'livraison'
              ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
              : 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'
          }`}>
            {NOTE_TYPE_LABELS[note.noteType]}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {new Date(note.noteDate).toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <dl className="space-y-3">
          {[
            { label: 'Projet', value: projectName },
            { label: 'Fournisseur / Destinataire', value: supplierName ?? note.counterparty },
            { label: 'Chauffeur / livreur', value: note.driverName },
            { label: 'Réceptionné par', value: note.receiverName },
            { label: 'Observations', value: note.observations },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 text-sm">
              <dt className="text-[12px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{label}</dt>
              <dd className="col-span-2 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--admin-text)' }}>Articles</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              {['#', 'Désignation', 'Unité', 'Quantité', 'Observation'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="even:bg-[var(--admin-bg)]/40" style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{i + 1}</td>
                <td className="px-4 py-2.5 text-[13px]" style={{ color: 'var(--admin-text)' }}>{it.designation}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{it.unit}</td>
                <td className="px-4 py-2.5 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>{it.quantity}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{it.observation ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
