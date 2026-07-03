import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getPlantSpeciesById } from '@/lib/db/plant-species'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  tree: 'Arbres', shrub: 'Arbustes', ground_cover: 'Couvre-sol',
  climber: 'Grimpantes', palm: 'Palmiers', grass: 'Graminées',
  aquatic: 'Aquatiques', other: 'Autre',
}

function Bool({ val }: { val: boolean | null | undefined }) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
  return <span style={{ color: val ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>{val ? 'Oui' : 'Non'}</span>
}

function Row({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-4 py-2" style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <span className="text-[11px] font-medium w-48 shrink-0 pt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <span className="text-[13px] flex-1" style={{ color: 'var(--admin-text)' }}>{value}</span>
    </div>
  )
}

export default async function PlantSpeciesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const species = await getPlantSpeciesById(id)
  if (!species) notFound()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/etude/plant-species" className="text-[13px] hover:opacity-70 transition-opacity" style={{ color: 'var(--admin-text-muted)' }}>
            ← Palette végétale
          </Link>
          {species.lisCode && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}>
              {species.lisCode}
            </span>
          )}
        </div>
        <Link href={`/admin/etude/plant-species/${id}/edit`}
          className="text-[13px] font-medium px-3 py-1.5 rounded border transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)', background: 'var(--admin-bg)' }}>
          Modifier
        </Link>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[20px] font-semibold italic" style={{ color: 'var(--admin-text)', letterSpacing: '-0.01em' }}>{species.botanicalName}</h1>
            {species.commonNameFr && (
              <p className="text-[14px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>{species.commonNameFr}</p>
            )}
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
            {CATEGORY_LABELS[species.category] ?? species.category}
          </span>
        </div>

        <div className="space-y-0">
          <Row label="Caduque" value={<Bool val={species.isCaducous} />} />
          <Row label="Toxique" value={<Bool val={species.isToxic} />} />
          <Row label="Épines" value={<Bool val={species.hasSpines} />} />
          <Row label="Fleurs" value={<Bool val={species.hasFlowers} />} />
          {species.hasFlowers && <Row label="Couleur de fleur" value={species.flowerColor} />}
          {species.hasFlowers && <Row label="Période de floraison" value={species.floweringPeriod} />}
          <Row label="Fruits" value={<Bool val={species.hasFruit} />} />
          {species.hasFruit && <Row label="Période de fructification" value={species.fruitingPeriod} />}
          <Row label="Environnement adapté" value={species.adaptedEnvironment} />
          <Row label="Maladies & insectes" value={species.diseases} />
          <Row label="Hauteur adulte" value={
            species.heightAdultMin || species.heightAdultMax
              ? `${species.heightAdultMin ?? '?'} – ${species.heightAdultMax ?? '?'} m`
              : null
          } />
          <Row label="Diamètre adulte" value={
            species.diameterAdultMin || species.diameterAdultMax
              ? `${species.diameterAdultMin ?? '?'} – ${species.diameterAdultMax ?? '?'} m`
              : null
          } />
        </div>
      </div>

      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--admin-text-muted)' }}>Plantation & Entretien</h2>
        <div className="space-y-0">
          <Row label="Période de plantation" value={species.plantingPeriod} />
          <Row label="Type de sol" value={species.soilType} />
          <Row label="Exposition plantation" value={species.plantingExposure} />
          <Row label="Exposition stockage" value={species.storageExposure} />
          <Row label="Lieu de stockage" value={species.storagePlace} />
          <Row label="Arrosage (période froide)" value={species.wateringCold} />
          <Row label="Arrosage (période sèche)" value={species.wateringHot} />
          <Row label="Taille" value={species.pruning} />
          <Row label="Traitement phytosanitaire" value={species.phytosanitaryTreatment} />
          <Row label="Remarques" value={species.notes} />
        </div>
      </div>
    </div>
  )
}
