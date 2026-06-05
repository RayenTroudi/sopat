import { db } from '../index'
import { plantSpecies } from '../schema'
import { sql } from 'drizzle-orm'

// 48 common Tunisian / Mediterranean landscape species
const SPECIES = [
  // Palmiers
  { botanicalName: 'Phoenix dactylifera', commonNameFr: 'Palmier dattier', category: 'palm' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Phoenix canariensis', commonNameFr: 'Palmier des Canaries', category: 'palm' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Washingtonia robusta', commonNameFr: 'Palmier de Californie', category: 'palm' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Washingtonia filifera', commonNameFr: 'Palmier filamenteux', category: 'palm' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Chamaerops humilis', commonNameFr: 'Palmier nain', category: 'palm' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Trachycarpus fortunei', commonNameFr: 'Palmier de Chine', category: 'palm' as const, defaultUnit: 'unit' as const },
  // Arbres
  { botanicalName: 'Olea europaea', commonNameFr: 'Olivier', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Jacaranda mimosifolia', commonNameFr: 'Jacaranda', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Ficus benjamina', commonNameFr: 'Ficus pleureur', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Ficus nitida', commonNameFr: 'Ficus nitida', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Ceratonia siliqua', commonNameFr: 'Caroubier', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Pinus halepensis', commonNameFr: 'Pin d\'Alep', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Cupressus sempervirens', commonNameFr: 'Cyprès commun', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Populus alba', commonNameFr: 'Peuplier blanc', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Eucalyptus globulus', commonNameFr: 'Eucalyptus', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Schinus molle', commonNameFr: 'Faux poivrier', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Cercis siliquastrum', commonNameFr: 'Arbre de Judée', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Lagerstroemia indica', commonNameFr: 'Lilas des Indes', category: 'tree' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Acacia retinodes', commonNameFr: 'Mimosa à quatre saisons', category: 'tree' as const, defaultUnit: 'unit' as const },
  // Arbustes
  { botanicalName: 'Nerium oleander', commonNameFr: 'Laurier-rose', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Bougainvillea spectabilis', commonNameFr: 'Bougainvillée', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Hibiscus rosa-sinensis', commonNameFr: 'Hibiscus', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Lantana camara', commonNameFr: 'Lantana', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Pittosporum tobira', commonNameFr: 'Pittospore du Japon', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Viburnum tinus', commonNameFr: 'Laurestinus', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Photinia x fraseri', commonNameFr: 'Photinia rouge', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Punica granatum', commonNameFr: 'Grenadier', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Teucrium fruticans', commonNameFr: 'Germandrée arborescente', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Plumbago auriculata', commonNameFr: 'Plumbago bleu', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Agave americana', commonNameFr: 'Agave d\'Amérique', category: 'shrub' as const, defaultUnit: 'unit' as const },
  // Haies / arbustes de haie
  { botanicalName: 'Ligustrum japonicum', commonNameFr: 'Troène du Japon', category: 'shrub' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Cupressocyparis leylandii', commonNameFr: 'Cyprès de Leyland', category: 'tree' as const, defaultUnit: 'unit' as const },
  // Couvre-sols et vivaces
  { botanicalName: 'Lavandula angustifolia', commonNameFr: 'Lavande vraie', category: 'ground_cover' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Rosmarinus officinalis', commonNameFr: 'Romarin', category: 'ground_cover' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Salvia officinalis', commonNameFr: 'Sauge officinale', category: 'ground_cover' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Thymus vulgaris', commonNameFr: 'Thym commun', category: 'ground_cover' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Gazania rigens', commonNameFr: 'Gazanie', category: 'ground_cover' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Carpobrotus edulis', commonNameFr: 'Griffe de sorcière', category: 'ground_cover' as const, defaultUnit: 'm2' as const },
  { botanicalName: 'Aptenia cordifolia', commonNameFr: 'Aptenia', category: 'ground_cover' as const, defaultUnit: 'm2' as const },
  { botanicalName: 'Hedera helix', commonNameFr: 'Lierre commun', category: 'climber' as const, defaultUnit: 'm2' as const },
  // Plantes grimpantes
  { botanicalName: 'Wisteria sinensis', commonNameFr: 'Glycine de Chine', category: 'climber' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Campsis radicans', commonNameFr: 'Bignone', category: 'climber' as const, defaultUnit: 'unit' as const },
  { botanicalName: 'Passiflora caerulea', commonNameFr: 'Passiflore bleue', category: 'climber' as const, defaultUnit: 'unit' as const },
  // Gazon
  { botanicalName: 'Cynodon dactylon', commonNameFr: 'Chiendent pied-de-poule / Gazon bermuda', category: 'grass' as const, defaultUnit: 'm2' as const },
  { botanicalName: 'Stenotaphrum secundatum', commonNameFr: 'Gazon Saint-Augustin', category: 'grass' as const, defaultUnit: 'm2' as const },
  { botanicalName: 'Festuca arundinacea', commonNameFr: 'Fétuque élevée', category: 'grass' as const, defaultUnit: 'm2' as const },
  { botanicalName: 'Poa pratensis', commonNameFr: 'Pâturin des prés', category: 'grass' as const, defaultUnit: 'm2' as const },
  // Substrats / amendements (not plants, but often listed)
  { botanicalName: 'Terreau horticole enrichi', commonNameFr: 'Terreau horticole', category: 'other' as const, defaultUnit: 'm3' as const },
  { botanicalName: 'Compost organique', commonNameFr: 'Compost', category: 'other' as const, defaultUnit: 'm3' as const },
]

export async function seedPlantSpecies() {
  console.log(`Inserting ${SPECIES.length} plant species…`)

  // Use ON CONFLICT DO NOTHING so rerunning the seed is safe
  await db
    .insert(plantSpecies)
    .values(SPECIES)
    .onConflictDoNothing()

  console.log('Plant species seeded.')
}
