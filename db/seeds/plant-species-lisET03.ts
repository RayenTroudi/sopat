/**
 * Seed: initial plant species from LIS-ET-03 palette végétale SOPAT
 * Common species used in Tunisian landscape projects.
 */
import { db } from '../index'
import { plantSpecies } from '../schema'

const SPECIES = [
  // Palmiers
  { lisCode: 'P001', botanicalName: 'Phoenix canariensis', commonNameFr: 'Palmier des Canaries', category: 'palm', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, hasFruit: true, heightAdultMin: '5', heightAdultMax: '15', adaptedEnvironment: 'Zones côtières, résistant au vent et au sel', plantingPeriod: 'Avr–Oct', wateringCold: '1×/semaine', wateringHot: '2–3×/semaine' },
  { lisCode: 'P002', botanicalName: 'Phoenix dactylifera', commonNameFr: 'Palmier dattier', category: 'palm', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, hasFruit: true, heightAdultMin: '10', heightAdultMax: '25', adaptedEnvironment: 'Zones arides et semi-arides, très résistant à la sécheresse', plantingPeriod: 'Avr–Sep' },
  { lisCode: 'P003', botanicalName: 'Washingtonia filifera', commonNameFr: 'Palmier de Californie', category: 'palm', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: false, hasFruit: false, heightAdultMin: '8', heightAdultMax: '20', adaptedEnvironment: 'Résistant à la sécheresse et au gel modéré' },
  { lisCode: 'P004', botanicalName: 'Chamaerops humilis', commonNameFr: 'Palmier nain', category: 'palm', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, hasFruit: true, heightAdultMin: '1', heightAdultMax: '3', adaptedEnvironment: 'Résistant à la sécheresse, tout sol, zones côtières', plantingPeriod: 'Avr–Oct' },

  // Arbres
  { lisCode: 'A001', botanicalName: 'Olea europaea', commonNameFr: 'Olivier', category: 'tree', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: true, flowerColor: 'Blanc crème', floweringPeriod: 'Avr–Juin', hasFruit: true, fruitingPeriod: 'Sep–Nov', heightAdultMin: '3', heightAdultMax: '10', adaptedEnvironment: 'Méditerranéen, très résistant à la sécheresse', soilType: 'Bien drainé, calcaire', wateringCold: 'Rare', wateringHot: '1×/semaine' },
  { lisCode: 'A002', botanicalName: 'Jacaranda mimosifolia', commonNameFr: 'Jacaranda', category: 'tree', defaultUnit: 'unit', isCaducous: true, isToxic: false, hasSpines: false, hasFlowers: true, flowerColor: 'Mauve / violet', floweringPeriod: 'Avr–Juin', hasFruit: false, heightAdultMin: '5', heightAdultMax: '15', adaptedEnvironment: 'Zones chaudes, légèrement sensible au gel', plantingPeriod: 'Mar–Mai' },
  { lisCode: 'A003', botanicalName: 'Ficus nitida', commonNameFr: 'Ficus colonnaire', category: 'tree', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: false, hasFruit: true, heightAdultMin: '3', heightAdultMax: '12', adaptedEnvironment: 'Zones urbaines, haies, alignements', wateringCold: '1×/semaine', wateringHot: '2×/semaine' },
  { lisCode: 'A004', botanicalName: 'Delonix regia', commonNameFr: 'Flamboyant', category: 'tree', defaultUnit: 'unit', isCaducous: true, isToxic: false, hasSpines: false, hasFlowers: true, flowerColor: 'Rouge orangé', floweringPeriod: 'Mai–Aoû', hasFruit: true, heightAdultMin: '8', heightAdultMax: '15', adaptedEnvironment: 'Zones tropicales et semi-tropicales, pas de gel' },

  // Arbustes
  { lisCode: 'AR001', botanicalName: 'Nerium oleander', commonNameFr: 'Laurier-rose', category: 'shrub', defaultUnit: 'unit', isCaducous: false, isToxic: true, hasSpines: false, hasFlowers: true, flowerColor: 'Rose, rouge, blanc', floweringPeriod: 'Mai–Oct', hasFruit: false, heightAdultMin: '1', heightAdultMax: '4', adaptedEnvironment: 'Très résistant à la sécheresse et à la chaleur', wateringCold: 'Rare', wateringHot: '1×/semaine' },
  { lisCode: 'AR002', botanicalName: 'Bougainvillea spectabilis', commonNameFr: 'Bougainvillée', category: 'shrub', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, flowerColor: 'Violet, rose, rouge, orange', floweringPeriod: 'Mars–Nov', hasFruit: false, heightAdultMin: '2', heightAdultMax: '8', adaptedEnvironment: 'Méditerranéen, résistant à la sécheresse, chaleur', plantingPeriod: 'Mars–Mai, Sep–Nov' },
  { lisCode: 'AR003', botanicalName: 'Lantana camara', commonNameFr: 'Lantana', category: 'shrub', defaultUnit: 'unit', isCaducous: false, isToxic: true, hasSpines: false, hasFlowers: true, flowerColor: 'Jaune, orange, rose, rouge', floweringPeriod: 'Mars–Nov', hasFruit: true, heightAdultMin: '0.5', heightAdultMax: '2', adaptedEnvironment: 'Très résistant à la sécheresse, zones arides' },
  { lisCode: 'AR004', botanicalName: 'Hibiscus rosa-sinensis', commonNameFr: 'Hibiscus de Chine', category: 'shrub', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: true, flowerColor: 'Rouge, rose, jaune, blanc', floweringPeriod: 'Mars–Nov', hasFruit: false, heightAdultMin: '1', heightAdultMax: '3', wateringCold: '1×/semaine', wateringHot: '2–3×/semaine' },

  // Graminées
  { lisCode: 'G001', botanicalName: 'Pennisetum setaceum', commonNameFr: 'Herbe fontaine', category: 'grass', defaultUnit: 'm2', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: true, flowerColor: 'Rose violacé', floweringPeriod: 'Été–Automne', hasFruit: false, heightAdultMin: '0.5', heightAdultMax: '1.5', adaptedEnvironment: 'Très résistant à la sécheresse, zones arides', wateringCold: 'Rare' },
  { lisCode: 'G002', botanicalName: 'Stipa tenacissima', commonNameFr: 'Alfa', category: 'grass', defaultUnit: 'm2', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: true, hasFruit: false, heightAdultMin: '0.5', heightAdultMax: '1', adaptedEnvironment: 'Zones arides, très résistant à la sécheresse' },

  // Plantes grasses & succulentes (couvre-sol)
  { lisCode: 'S001', botanicalName: 'Agave americana', commonNameFr: 'Agave d\'Amérique', category: 'ground_cover', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, flowerColor: 'Jaune vert', floweringPeriod: 'Variable (monocarpique)', hasFruit: false, heightAdultMin: '1', heightAdultMax: '2', adaptedEnvironment: 'Zones arides, très résistant à la sécheresse', wateringCold: 'Rare', wateringHot: 'Rare' },
  { lisCode: 'S002', botanicalName: 'Aloe vera', commonNameFr: 'Aloé véra', category: 'ground_cover', defaultUnit: 'unit', isCaducous: false, isToxic: false, hasSpines: true, hasFlowers: true, flowerColor: 'Jaune orangé', floweringPeriod: 'Jan–Mar', hasFruit: false, heightAdultMin: '0.3', heightAdultMax: '0.7', adaptedEnvironment: 'Zones arides, sol bien drainé', wateringCold: 'Rare', wateringHot: '1×/2 semaines' },

  // Gazon
  { lisCode: 'GA001', botanicalName: 'Cynodon dactylon', commonNameFr: 'Gazon chiendent / Bermuda', category: 'ground_cover', defaultUnit: 'm2', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: false, hasFruit: false, heightAdultMin: '0.05', heightAdultMax: '0.15', adaptedEnvironment: 'Très résistant à la chaleur et à la sécheresse, usage intensif', wateringCold: '1×/semaine', wateringHot: '3×/semaine' },
  { lisCode: 'GA002', botanicalName: 'Festuca arundinacea', commonNameFr: 'Fétuque élevée', category: 'ground_cover', defaultUnit: 'm2', isCaducous: false, isToxic: false, hasSpines: false, hasFlowers: false, hasFruit: false, heightAdultMin: '0.05', heightAdultMax: '0.2', adaptedEnvironment: 'Résistant à la chaleur, ombre partielle acceptée', wateringCold: '2×/semaine', wateringHot: '4×/semaine' },
] as const

async function main() {
  let inserted = 0
  for (const s of SPECIES) {
    try {
      await db.insert(plantSpecies).values({
        ...s,
        category: s.category as any,
        defaultUnit: s.defaultUnit as any,
      }).onConflictDoNothing()
      inserted++
    } catch {
      // skip if already exists
    }
  }
  console.log(`Seeded ${inserted}/${SPECIES.length} plant species`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
