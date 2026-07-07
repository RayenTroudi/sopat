import { db } from '../index'
import { weeklyProjectPlans } from '../schema'

// Seed dummy weekly planning data for PLA-RE-02
// Uses realisation_chef ID for createdBy
const REALISATION_CHEF_ID = '8db3b807-ee00-444c-abd4-f185a7599067'

// Helper: get Monday date string offset by N weeks from today (2026-07-07)
function monday(weekOffset: number): string {
  const base = new Date('2026-07-06') // Monday of current week
  base.setDate(base.getDate() + weekOffset * 7)
  return base.toISOString().slice(0, 10)
}
function saturday(weekOffset: number): string {
  const base = new Date('2026-07-11')
  base.setDate(base.getDate() + weekOffset * 7)
  return base.toISOString().slice(0, 10)
}

const PLANS = [
  // Current week (week 0): Tunis Nord — in progress
  {
    region: 'Tunis Nord',
    chefEquipe: 'M. Nabil Mzoughi',
    weekStartDate: monday(0),
    weekEndDate: saturday(0),
    rows: [
      { equipe: 'Équipe A – Engazonnement', lundi: 'Prépar. sol', mardi: 'Semis gazon', mercredi: 'Semis gazon', jeudi: 'Arrosage', vendredi: 'Arrosage', samedi: '', realise: true, causeNon: '', suivi: 'Conforme' },
      { equipe: 'Équipe B – Plantation', lundi: 'Réception plants', mardi: 'Plantation A1', mercredi: 'Plantation A2', jeudi: 'Tuteurage', vendredi: 'Tuteurage', samedi: 'Nettoyage', realise: true, causeNon: '', suivi: 'Avance légère' },
      { equipe: 'Équipe C – Maçonnerie', lundi: 'Fondations', mardi: 'Fondations', mercredi: 'Coulage béton', jeudi: 'Décoffrage', vendredi: '', samedi: '', realise: false, causeNon: 'Pluie – arrêt coulage', suivi: 'Retard 1j' },
      { equipe: 'Équipe D – Réseaux', lundi: 'Tranchées', mardi: 'Pose canalis.', mercredi: 'Pose canalis.', jeudi: 'Test étanchéité', vendredi: 'Remblaiement', samedi: '', realise: true, causeNon: '', suivi: 'OK' },
    ],
    nombreActionsPrevues: 23,
    pourcentageRealisation: '75',
    createdBy: REALISATION_CHEF_ID,
  },

  // Current week (week 0): Sousse — second team
  {
    region: 'Sousse',
    chefEquipe: 'M. Houssem Gharbi',
    weekStartDate: monday(0),
    weekEndDate: saturday(0),
    rows: [
      { equipe: 'Équipe Paysage', lundi: 'Arb. ornement.', mardi: 'Arb. ornement.', mercredi: 'Gazonnage', jeudi: 'Gazonnage', vendredi: 'Finitions', samedi: '', realise: true, causeNon: '', suivi: 'Phase IX terminée' },
      { equipe: 'Équipe Décor', lundi: 'Graviers pose', mardi: 'Graviers pose', mercredi: 'Pierres déco', jeudi: 'Paillage', vendredi: 'Paillage', samedi: 'Nettoyage final', realise: true, causeNon: '', suivi: 'Conforme' },
    ],
    nombreActionsPrevues: 11,
    pourcentageRealisation: '100',
    createdBy: REALISATION_CHEF_ID,
  },

  // Last week (week -1): Tunis Sud
  {
    region: 'Tunis Sud',
    chefEquipe: 'M. Nabil Mzoughi',
    weekStartDate: monday(-1),
    weekEndDate: saturday(-1),
    rows: [
      { equipe: 'Équipe A – Terrassement', lundi: 'Piquetage', mardi: 'Excavation', mercredi: 'Excavation', jeudi: 'Nivellement', vendredi: 'Nivellement', samedi: '', realise: true, causeNon: '', suivi: 'Terminé' },
      { equipe: 'Équipe B – Réseaux eau', lundi: 'Tranchées', mardi: 'Tranchées', mercredi: 'Canalis. irrig.', jeudi: 'Canalis. irrig.', vendredi: 'Test pression', samedi: '', realise: true, causeNon: '', suivi: 'Pression OK 6 bars' },
      { equipe: 'Équipe C – Éclairage', lundi: '', mardi: 'Câblage', mercredi: 'Câblage', jeudi: 'Armoires élec.', vendredi: 'Test lumières', samedi: '', realise: false, causeNon: 'Livraison armoires différée', suivi: 'Report sem. suivante' },
    ],
    nombreActionsPrevues: 16,
    pourcentageRealisation: '67',
    createdBy: REALISATION_CHEF_ID,
  },

  // 2 weeks ago (week -2): Monastir
  {
    region: 'Monastir',
    chefEquipe: 'Mme Sonia Khediri',
    weekStartDate: monday(-2),
    weekEndDate: saturday(-2),
    rows: [
      { equipe: 'Plantation Hôtelière', lundi: 'Fosses plant.', mardi: 'Substrat', mercredi: 'Plantation palm.', jeudi: 'Plantation palm.', vendredi: 'Arrosage reprise', samedi: 'Tuteurage', realise: true, causeNon: '', suivi: 'Terminé à 100%' },
      { equipe: 'Engazonnement Piscine', lundi: 'Prépar. terrain', mardi: 'Semis Bermuda', mercredi: 'Semis Bermuda', jeudi: 'Arrosage J1', vendredi: 'Arrosage J2', samedi: '', realise: true, causeNon: '', suivi: 'Germination en cours' },
      { equipe: 'Mobilier & Fontaines', lundi: 'Livraison mob.', mardi: 'Pose bancs', mercredi: 'Pose luminaires', jeudi: 'Fontaine install.', vendredi: 'Test fontaine', samedi: '', realise: true, causeNon: '', suivi: 'Réception provisoire le vendredi' },
    ],
    nombreActionsPrevues: 17,
    pourcentageRealisation: '100',
    createdBy: REALISATION_CHEF_ID,
  },

  // 3 weeks ago (week -3): Sfax
  {
    region: 'Sfax',
    chefEquipe: 'M. Ridha Hamdi',
    weekStartDate: monday(-3),
    weekEndDate: saturday(-3),
    rows: [
      { equipe: 'Terrassements généraux', lundi: 'Décapage', mardi: 'Décapage', mercredi: 'Remblai', jeudi: 'Compactage', vendredi: 'Géotextile', samedi: '', realise: true, causeNon: '', suivi: 'OK' },
      { equipe: 'Réseaux eau potable', lundi: 'Tranchée', mardi: 'Tranchée', mercredi: 'PE100 pose', jeudi: 'PE100 pose', vendredi: 'Remblai', samedi: '', realise: true, causeNon: '', suivi: 'Conforme au plan' },
      { equipe: 'Dallage & Allées', lundi: '', mardi: 'Coffrage', mercredi: 'Coulage béton', jeudi: 'Coulage béton', vendredi: '', samedi: '', realise: false, causeNon: 'Chaleur excessive – arrêt coulage', suivi: 'Reprise lundi matin tôt' },
      { equipe: 'Plantes aromatiques', lundi: 'Réception plants', mardi: 'Plantation zone A', mercredi: 'Plantation zone B', jeudi: 'Paillage', vendredi: 'Étiquetage', samedi: '', realise: true, causeNon: '', suivi: 'Toutes espèces conformes' },
    ],
    nombreActionsPrevues: 20,
    pourcentageRealisation: '75',
    createdBy: REALISATION_CHEF_ID,
  },

  // Next week (week +1): Nabeul — planning ahead
  {
    region: 'Nabeul',
    chefEquipe: 'M. Nabil Mzoughi',
    weekStartDate: monday(1),
    weekEndDate: saturday(1),
    rows: [
      { equipe: 'Équipe A – Plantation', lundi: 'Fosses palm.', mardi: 'Plantation', mercredi: 'Plantation', jeudi: 'Arrosage', vendredi: 'Tuteurage', samedi: '', realise: false, causeNon: '', suivi: '' },
      { equipe: 'Équipe B – Gazon', lundi: 'Prépar. sol', mardi: 'Semis Stenotaphrum', mercredi: 'Semis', jeudi: 'Arrosage', vendredi: 'Arrosage', samedi: '', realise: false, causeNon: '', suivi: '' },
      { equipe: 'Équipe C – Décoration', lundi: 'Graviers blancs', mardi: 'Graviers blancs', mercredi: 'Pierres volcan.', jeudi: 'Paillage', vendredi: 'Finitions', samedi: 'Nettoyage', realise: false, causeNon: '', suivi: '' },
    ],
    nombreActionsPrevues: 17,
    pourcentageRealisation: '0',
    createdBy: REALISATION_CHEF_ID,
  },
]

async function main() {
  console.log('Seeding weekly plans...')
  for (const plan of PLANS) {
    await db.insert(weeklyProjectPlans).values({
      region: plan.region,
      chefEquipe: plan.chefEquipe,
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      rows: plan.rows as never,
      nombreActionsPrevues: plan.nombreActionsPrevues,
      pourcentageRealisation: plan.pourcentageRealisation,
      createdBy: plan.createdBy,
    })
    console.log(`  ✓ ${plan.region} — semaine du ${plan.weekStartDate}`)
  }
  console.log('Done.')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
