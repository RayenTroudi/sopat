import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getDecorativeMaterialById } from '@/lib/db/decorative-materials'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <span className="text-[11px] font-medium w-48 shrink-0 pt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <span className="text-[13px] flex-1 whitespace-pre-line" style={{ color: 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}

export default async function DecorativeMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const mat = await getDecorativeMaterialById(id)
  if (!mat) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/etude/decorative-materials" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
            ← Matières décoratives
          </Link>
          {mat.code && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
              {mat.code}
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>FOR-ET-03</p>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h1 className="text-[18px] font-semibold mb-4" style={{ color: 'var(--admin-text)' }}>{mat.name}</h1>

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: 'var(--admin-text-muted)' }}>1. Description</h3>
        <Row label="Matière principale" value={mat.mainMaterial} />
        <Row label="Aspect" value={mat.aspect} />
        <Row label="Couleur" value={mat.color} />

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-6" style={{ color: 'var(--admin-text-muted)' }}>2. Caractéristiques techniques</h3>
        <Row label="Calibre" value={mat.caliber} />
        <Row label="Absorption d'eau" value={mat.waterAbsorption} />
        <Row label="Conditionnement" value={mat.packaging} />

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-6" style={{ color: 'var(--admin-text-muted)' }}>3. Utilisation</h3>
        <div className="py-2 flex gap-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          {mat.usedInterior && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>Intérieur</span>
          )}
          {mat.usedExterior && (
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}>Extérieur</span>
          )}
        </div>

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-6" style={{ color: 'var(--admin-text-muted)' }}>4–7. Manutention & stockage</h3>
        <Row label="4. Manutention" value={mat.handling} />
        <Row label="5. Conditionnement" value={mat.packagingDetails} />
        <Row label="6. Conditions de stockage" value={mat.storageConditions} />
        <Row label="7. Entretien" value={mat.maintenance} />
        <Row label="Remarques" value={mat.notes} />
      </div>
    </div>
  )
}
