import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDeliveryNotes, NOTE_TYPE_LABELS } from '@/lib/db/achat'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bons de livraison / retour | SOPAT Admin' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function DeliveryNotesPage({ searchParams }: { searchParams: SearchParams }) {
  const [session, sp] = await Promise.all([auth(), searchParams])
  if (!session) redirect('/login')
  if (!['admin', 'direction', 'realisation_chef', 'etudes_chef'].includes(session.user.role)) redirect('/admin')

  const type = typeof sp.type === 'string' ? (sp.type as 'livraison' | 'retour') : undefined
  const rows = await getDeliveryNotes({ type })

  const livraisons = rows.filter(({ note }) => note.noteType === 'livraison').length
  const retours = rows.filter(({ note }) => note.noteType === 'retour').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>
            Bons de livraison &amp; retour
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
            FOR-AC-06 / FOR-AC-05 — Mouvements de matériel et fournitures
          </p>
        </div>
        <Link
          href="/admin/achat/delivery-notes/new"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--green)', color: 'var(--ivory)' }}
        >
          + Nouveau bon
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: rows.length, color: 'var(--admin-text)' },
          { label: 'Livraisons', value: livraisons, color: 'var(--admin-emerald)' },
          { label: 'Retours', value: retours, color: 'var(--admin-amber)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          { label: 'Tous', value: undefined },
          { label: 'Livraisons', value: 'livraison' },
          { label: 'Retours', value: 'retour' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/admin/achat/delivery-notes?type=${value}` : '/admin/achat/delivery-notes'}
            className="px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors"
            style={type === value
              ? { background: 'var(--admin-text)', color: 'var(--admin-surface)', borderColor: 'transparent' }
              : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }
            }
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
                {['Réf.', 'Type', 'Date', 'Projet', 'Fournisseur / Destinataire', 'Articles', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium" style={{ color: 'var(--admin-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ note, projectName, supplierName }) => (
                <tr key={note.id} className="even:bg-[var(--admin-bg)]/40 hover:bg-[var(--admin-bg)] transition-colors" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
                      {note.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      note.noteType === 'livraison'
                        ? 'bg-[var(--admin-emerald-dim)] text-[var(--admin-emerald)]'
                        : 'bg-[var(--admin-amber-dim)] text-[var(--admin-amber)]'
                    }`}>
                      {NOTE_TYPE_LABELS[note.noteType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--admin-text)' }}>
                    {new Date(note.noteDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{projectName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {supplierName ?? note.counterparty ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {(note.items ?? []).length} article{(note.items ?? []).length > 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/achat/delivery-notes/${note.id}`}
                      className="text-[13px] font-medium hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Aucun bon.{' '}
                    <Link href="/admin/achat/delivery-notes/new" style={{ color: 'var(--admin-accent)' }} className="hover:underline">
                      Créer le premier
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
