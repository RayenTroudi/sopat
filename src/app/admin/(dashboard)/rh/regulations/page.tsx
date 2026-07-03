import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ScrollText } from 'lucide-react'

const ARTICLES = [
  {
    num: 1, title: 'Modalités de recrutement',
    content: `Les contrats proposés sont : CDD (Contrat à Durée Déterminée), CDI (Contrat à Durée Indéterminée), CIVP (Contrat d'Insertion à la Vie Professionnelle). Tout recrutement est soumis à validation de la Direction Générale.`,
  },
  {
    num: 2, title: 'Constitution du dossier administratif',
    content: `Tout nouvel employé doit fournir : copie CIN, acte de naissance, 2 photos, fiche de renseignements FOR-RH-02, bulletin N°3 (chefs de projet et jardiniers), numéro CNSS, RIB, certificat médical si maladie chronique, copies de diplômes, dernier bulletin de salaire, copie permis de conduire si applicable, attestation d'emploi précédent si applicable.`,
  },
  {
    num: 3, title: 'Règles de présence',
    content: `Horaires de travail : 45h/semaine, de 8H à 17H. La présence est obligatoire et contrôlée par une fiche de pointage mensuelle (FOR-RH-13). Les heures supplémentaires sont soumises à autorisation préalable.`,
  },
  {
    num: 4, title: 'Assiduité et discipline',
    content: `Toute absence doit faire l'objet d'une demande d'autorisation préalable (FOR-RH-14 pour congés, FOR-RH-15 pour sorties). Toute absence non justifiée est considérée comme abandon de poste.`,
  },
  {
    num: 5, title: 'Jours fériés chômés payés',
    content: `17 Décembre, 20 Mars (Fête de l'Indépendance), 1er Mai (Fête du Travail), 25 Juillet (Fête de la République), Aïd Al-Fitr (2 jours), Aïd Al-Adha (1 jour), Mouled (1 jour).`,
  },
  {
    num: 6, title: 'Jours fériés chômés non payés',
    content: `1er Janvier, 9 Avril, 13 Août, Nouvel An Hégirien (1 jour).`,
  },
  {
    num: 7, title: 'Congé annuel',
    content: `18 jours ouvrables par an (1,5 jour/mois). Un préavis de 48h est requis pour les congés ≤ 3 jours et de 15 jours pour les congés > 3 jours. Il est interdit de laisser son poste sans remplaçant désigné. Les congés sont soumis à la procédure PRC-RH-03.`,
  },
  {
    num: 8, title: 'Congé maternité',
    content: `60 jours de congé maternité. Des pauses allaitement sont accordées sur présentation de justificatifs médicaux.`,
  },
  {
    num: 9, title: 'Congé maladie',
    content: `5 jours par an pris en charge par l'entreprise. Un certificat médical doit être fourni dans les 48 heures suivant le début de l'absence.`,
  },
  {
    num: 10, title: 'Congés pour événements familiaux',
    content: `Naissance : 1 jour. Mariage : 3 jours. Décès du conjoint, enfant ou parent : 3 jours. Décès d'un frère/sœur : 1 jour.`,
  },
  {
    num: 11, title: 'Secret professionnel',
    content: `Tout employé est tenu au secret professionnel concernant les informations relatives aux clients, projets, procédés et savoir-faire de l'entreprise, pendant et après la durée du contrat.`,
  },
  {
    num: 12, title: 'Code de conduite et éthique',
    content: `Respect de la Charte RSE, politique anti-harcèlement, clauses anti-corruption. Tout comportement contraire aux valeurs de l'entreprise est passible de sanctions disciplinaires conformément à l'article 15.`,
  },
  {
    num: 13, title: 'Salaire',
    content: `Le salaire est versé par virement bancaire. Les bulletins de paie sont remis chaque mois. Primes annuelles : Bonus annuel = 50% de la moyenne mensuelle. Prime Aïd = 70 DT.`,
  },
  {
    num: 14, title: 'Formation et développement des compétences',
    content: `L'entreprise s'engage à mettre en œuvre un plan de formation annuel (PLA-RH-02) visant le développement des compétences de chaque employé conformément à la politique qualité ISO 9001.`,
  },
  {
    num: 15, title: 'Sanctions disciplinaires',
    content: `Sanctions de 1er degré : avertissement verbal, avertissement écrit, blâme, mise à pied d'une semaine maximum. Sanctions de 2ème degré (fautes graves répétées) : pouvant aller jusqu'au licenciement après passage en conseil administratif.`,
  },
]

export default async function RegulationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
          <ScrollText size={20} style={{ color: 'var(--ivory)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Règlement interne de l'entreprise</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>ORG-RH-01 — Version 3 — 08/12/2021</p>
        </div>
      </div>

      <div className="space-y-4">
        {ARTICLES.map(art => (
          <div key={art.num} className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'var(--green)' }}>
                {art.num}
              </div>
              <div>
                <h2 className="font-semibold mb-2" style={{ color: 'var(--admin-fg)' }}>
                  Article {art.num} — {art.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-muted)' }}>{art.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--green)', background: 'var(--admin-surface)', color: 'var(--admin-muted)' }}>
        <strong style={{ color: 'var(--admin-fg)' }}>Engagement employé :</strong> En rejoignant l'entreprise, chaque employé reconnaît avoir pris connaissance de ce règlement intérieur et s'engage à le respecter dans son intégralité.
      </div>
    </div>
  )
}
