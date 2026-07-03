import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPhytosanitaryById } from '@/lib/db/phytosanitary'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  insecticide: 'Insecticide', acaricide: 'Acaricide', fongicide: 'Fongicide',
  herbicide: 'Herbicide', engrais: 'Engrais', autre: 'Autre',
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <span className="text-[11px] font-medium w-52 shrink-0 pt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <span className="text-[13px] flex-1 whitespace-pre-line" style={{ color: 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}

export default async function PhytosanitaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const product = await getPhytosanitaryById(id)
  if (!product) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/etude/phytosanitary" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
          ← Produits phytosanitaires
        </Link>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>FOR-ET-05</p>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-[18px] font-semibold flex-1" style={{ color: 'var(--admin-text)' }}>{product.commercialName}</h1>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
            {TYPE_LABELS[product.productType] ?? product.productType}
          </span>
        </div>

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text-muted)' }}>Caractéristiques générales</h3>
        <Row label="N° Homologation" value={product.approvalNumber} />
        <Row label="Matière active" value={product.activeIngredient} />
        <Row label="Formulation" value={product.formulation} />
        <Row label="Concentration" value={product.concentration} />
        <Row label="Dose d'utilisation" value={product.usageDose} />
        <Row label="Dépredateurs / Cibles" value={product.targetPests} />
        <Row label="Culture" value={product.targetCrop} />
        <Row label="Délai de rentrée" value={product.reEntryDelay} />
        <Row label="Conditionnement" value={product.packaging} />

        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-6" style={{ color: 'var(--admin-text-muted)' }}>Classement toxicologique & Sécurité</h3>
        <Row label="Classement" value={product.toxicologicalClass} />
        <Row label="EPI exigés" value={product.ppe} />
        <Row label="Conditions de stockage" value={product.storageConditions} />
        <Row label="Avant l'utilisation" value={product.preUseInstructions} />
        <Row label="Lors de l'utilisation" value={product.duringUseInstructions} />
        <Row label="Déchets" value={product.wasteDisposal} />
        <Row label="Remarques" value={product.notes} />
      </div>
    </div>
  )
}
