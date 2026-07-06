import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Engagement de la Direction',
    content: `La Direction Générale de SOPAT s'engage à développer les compétences humaines comme levier stratégique de performance et de qualité. Les ressources humaines constituent le premier actif de l'entreprise et leur développement est une priorité inscrite dans la politique qualité ISO 9001:2015.`,
  },
  {
    title: 'Recrutement et intégration',
    content: `Tout recrutement est fondé sur les compétences techniques et comportementales définies dans les fiches de poste (FOR-RH-01). Un plan d'intégration structuré (PLA-RH-01) est mis en place pour chaque nouvel employé afin d'assurer une prise de poste efficace et conforme aux exigences de l'entreprise.`,
  },
  {
    title: 'Formation et développement des compétences',
    content: `SOPAT s'engage à identifier annuellement les besoins en formation à travers les entretiens d'évaluation (FOR-RH-03) et à mettre en œuvre un plan de formation annuel (PLA-RH-02). Chaque formation fait l'objet d'une feuille d'émargement (FOR-RH-05), d'une évaluation à chaud (FOR-RH-06) et d'une évaluation à froid (FOR-RH-07) pour mesurer son efficacité.`,
  },
  {
    title: 'Évaluation des performances',
    content: `Une évaluation annuelle de la performance est conduite pour chaque collaborateur par son responsable hiérarchique direct. Cette évaluation porte sur les compétences techniques liées au poste, la discipline, la qualité du travail et l'intégration au sein de l'équipe. Les résultats alimentent le plan de formation et les décisions de gestion de carrière.`,
  },
  {
    title: 'Conditions de travail et bien-être',
    content: `SOPAT garantit des conditions de travail conformes aux exigences légales tunisiennes et aux standards ISO. La durée du travail est de 45 heures par semaine. Les congés annuels, maladie, maternité et événements familiaux sont gérés selon les dispositions du règlement interne (ORG-RH-01). Toute demande de sortie temporaire est soumise à autorisation préalable (FOR-RH-15).`,
  },
  {
    title: 'Éthique, confidentialité et discipline',
    content: `Chaque employé s'engage au respect de la charte RSE, de la politique anti-harcèlement et des clauses anti-corruption. Le secret professionnel est obligatoire. Les manquements au règlement intérieur font l'objet de sanctions disciplinaires graduées définies à l'article 15 du règlement interne.`,
  },
  {
    title: 'Gestion documentaire RH',
    content: `Tout dossier de personnel est constitué à partir d'une check-list standard (FOR-RH-34) et conservé sous la responsabilité du département RH. Les documents sont traités comme des informations documentées au sens de la norme ISO 9001:2015 — ils font l'objet d'un contrôle de version, d'un archivage sécurisé et ne peuvent être supprimés.`,
  },
  {
    title: 'Amélioration continue',
    content: `La politique RH est révisée annuellement lors de la revue de Direction. Les indicateurs de performance RH (taux de formation, taux d'absentéisme, taux de turn-over) sont analysés pour identifier les axes d'amélioration. Toute non-conformité liée aux processus RH fait l'objet d'une action corrective documentée.`,
  },
]

export default async function HRPolicyPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
          <ShieldCheck size={20} style={{ color: 'var(--ivory)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-fg)' }}>Politique Ressources Humaines</h1>
          <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>ORG-RH-03 — Version en vigueur</p>
        </div>
      </div>

      <div className="rounded-xl border p-6 mb-6" style={{ borderColor: 'var(--green)', background: 'var(--admin-surface)' }}>
        <p className="text-sm leading-relaxed italic" style={{ color: 'var(--admin-muted)' }}>
          "Les hommes et les femmes de SOPAT sont notre principal capital. Notre politique RH vise à attirer,
          développer et fidéliser les talents qui portent notre ambition d'excellence en aménagement paysager et
          en qualité environnementale, dans le respect des valeurs humaines et des exigences de notre système
          de management de la qualité ISO 9001:2015."
        </p>
        <p className="text-xs mt-3 font-semibold" style={{ color: 'var(--admin-fg)' }}>— Direction Générale SOPAT</p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <div key={i} className="rounded-xl border p-5" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
            <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--admin-fg)' }}>
              <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                style={{ background: 'var(--green)' }}>{i + 1}</span>
              {s.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-muted)' }}>{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
