import type { AiReport } from '@/lib/db/ai-meetings'

/**
 * Rendu du compte rendu IA.
 *
 * Les catégories vides sont affichées explicitement (« Aucune décision actée »)
 * plutôt que masquées : dans un enregistrement qualité, « rien n'a été décidé »
 * et « la rubrique n'existe pas » ne veulent pas dire la même chose, et masquer
 * les vides laisserait croire à un compte rendu incomplet.
 */

const QMS_LABELS: Record<string, string> = {
  NON_CONFORMITY:       'Non-conformité potentielle',
  CORRECTIVE_ACTION:    'Action corrective évoquée',
  SUPPLIER_ISSUE:       'Problème fournisseur',
  CUSTOMER_REQUIREMENT: 'Exigence client',
  QUALITY_ISSUE:        'Problème qualité',
  AUDIT_FINDING:        "Constat d'audit",
  PROCESS_ISSUE:        'Problème de processus',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--admin-text-muted)',
  MEDIUM: 'var(--admin-amber)',
  HIGH: 'var(--admin-red)',
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <h2 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--admin-text-muted)' }}>
          {subtitle}
        </p>
      )}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="text-[13px] italic" style={{ color: 'var(--admin-text-muted)' }}>
        {empty}
      </p>
    )
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text)' }}>
          • {item}
        </li>
      ))}
    </ul>
  )
}

export function AiReportSections({ report }: { report: AiReport }) {
  return (
    <div className="space-y-4">
      <Card
        title="Résumé exécutif"
        subtitle={`Généré le ${report.generatedAt.toLocaleString('fr-FR')} · modèle ${report.model} · invite ${report.promptVersion}`}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>
          {report.summary}
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Sujets abordés">
          <List items={report.topics} empty="Aucun sujet identifié." />
        </Card>
        <Card title="Décisions">
          <List items={report.decisions.map((d) => d.decision)} empty="Aucune décision actée." />
        </Card>
      </div>

      <Card
        title="Actions extraites"
        subtitle="Les actions non attribuées le restent volontairement : l'assistant n'affecte personne lorsque la transcription est ambiguë."
      >
        {report.actionItems.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: 'var(--admin-text-muted)' }}>
            Aucune action identifiée.
          </p>
        ) : (
          <ul className="space-y-3">
            {report.actionItems.map((action, i) => (
              <li
                key={i}
                className="pb-3"
                style={{ borderBottom: i < report.actionItems.length - 1 ? '1px solid var(--admin-border)' : undefined }}
              >
                <p className="text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
                  {action.title}
                </p>
                {action.description && (
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                    {action.description}
                  </p>
                )}
                <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
                  Responsable : {action.responsiblePerson ?? 'Non attribué'}
                  {' · '}
                  Échéance : {action.deadline ?? 'Non précisée'}
                  {action.priority && (
                    <>
                      {' · '}
                      <span style={{ color: PRIORITY_COLORS[action.priority], fontWeight: 600 }}>
                        Priorité {PRIORITY_LABELS[action.priority]}
                      </span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Risques / points d'attention">
          <List items={report.risks} empty="Aucun risque signalé." />
        </Card>
        <Card title="Questions en suspens">
          <List items={report.questions} empty="Aucune question restée sans réponse." />
        </Card>
      </div>

      <Card title="Suivis">
        <List items={report.followUps} empty="Aucun suivi identifié." />
      </Card>

      <Card
        title="Constats qualité proposés"
        subtitle="Propositions soumises à validation humaine. Aucune non-conformité ni action corrective n'est créée automatiquement — l'ouverture d'une fiche reste une décision du responsable qualité."
      >
        {report.qmsFindings.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun constat qualité relevé dans la transcription.
          </p>
        ) : (
          <ul className="space-y-2">
            {report.qmsFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                  style={{ background: 'var(--admin-amber-dim)', color: 'var(--admin-amber)' }}
                >
                  {QMS_LABELS[finding.type] ?? finding.type}
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                  {finding.description}
                </span>
              </li>
            ))}
          </ul>
        )}
        {report.qmsFindings.length > 0 && (
          <p className="text-[11px] mt-3" style={{ color: 'var(--admin-text-muted)' }}>
            Pour transformer un constat en fiche formelle, ouvrez une non-conformité depuis le
            module Non-conformités.
          </p>
        )}
      </Card>
    </div>
  )
}
