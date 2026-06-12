'use client'

const EVENT_TYPE_LABELS: Record<string, string> = {
  nettoyage_plage: 'Nettoyage plage',
  plantation: 'Plantation',
  sensibilisation: 'Sensibilisation',
  team_building: 'Team building',
  journee_environnement: 'Journée environnement',
  autre: 'Autre',
}

type Results = {
  wasteCollectedKg: string | null
  treesPlanted: number | null
  participantsActual: number | null
  beachLengthCleanedM: string | null
  zonesTreated: number | null
  mediaCoverage: boolean
  pressArticlesCount: number | null
  socialMediaReach: number | null
  satisfactionScore: number | null
  lessonsLearned: string | null
} | null

export function BilanPrint({
  event,
  results,
  onClose,
}: {
  event: Record<string, unknown>
  results: Results
  onClose: () => void
}) {
  const date = event.date
    ? new Date(event.date as string).toLocaleDateString('fr-FR', { dateStyle: 'full' })
    : ''

  return (
    <>
      {/* Screen overlay */}
      <div
        className="print:hidden fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Print content */}
      <div className="bilan-print-content print:block hidden">
        <style>{`
          @media print {
            body > *:not(.bilan-print-wrapper) { display: none !important; }
            .bilan-print-content { display: block !important; }
            .bilan-print-wrapper { padding: 32px; font-family: sans-serif; }
          }
        `}</style>

        <div className="bilan-print-wrapper">
          <div style={{ borderBottom: '2px solid #166534', paddingBottom: '16px', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', margin: 0 }}>
              Bilan RSE — {event.title as string}
            </h1>
            <p style={{ color: '#4b5563', margin: '4px 0 0' }}>
              {EVENT_TYPE_LABELS[event.eventType as string] ?? String(event.eventType)} • {date} • {event.location as string}
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '4px 0 0' }}>
              Réf. {event.eventReference as string}
            </p>
          </div>

          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            Indicateurs de résultat
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {results?.participantsActual != null && (
              <KPI label="Participants" value={String(results.participantsActual)} unit="personnes" />
            )}
            {results?.wasteCollectedKg != null && (
              <KPI label="Déchets collectés" value={parseFloat(results.wasteCollectedKg).toFixed(1)} unit="kg" />
            )}
            {results?.treesPlanted != null && (
              <KPI label="Arbres plantés" value={String(results.treesPlanted)} unit="arbres" />
            )}
            {results?.beachLengthCleanedM != null && (
              <KPI label="Plage nettoyée" value={parseFloat(results.beachLengthCleanedM).toFixed(0)} unit="m" />
            )}
            {results?.zonesTreated != null && (
              <KPI label="Zones traitées" value={String(results.zonesTreated)} unit="zones" />
            )}
            {results?.satisfactionScore != null && (
              <KPI label="Satisfaction" value={String(results.satisfactionScore)} unit="/ 5" />
            )}
          </div>

          {(results?.mediaCoverage || results?.pressArticlesCount || results?.socialMediaReach) && (
            <>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                Impact médiatique
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {results?.pressArticlesCount != null && (
                  <KPI label="Articles presse" value={String(results.pressArticlesCount)} unit="articles" />
                )}
                {results?.socialMediaReach != null && (
                  <KPI label="Portée réseaux" value={String(results.socialMediaReach)} unit="personnes" />
                )}
                {results?.mediaCoverage && (
                  <KPI label="Couverture médias" value="Oui" unit="" />
                )}
              </div>
            </>
          )}

          {results?.lessonsLearned && (
            <>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                Leçons apprises
              </h2>
              <p style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                {results.lessonsLearned}
              </p>
            </>
          )}

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '32px', paddingTop: '12px', color: '#9ca3af', fontSize: '11px' }}>
            SOPAT — Bilan RSE généré le {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    </>
  )
}

function KPI({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ color: '#166534', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
        {value}
        {unit && <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '4px', color: '#4b5563' }}>{unit}</span>}
      </p>
    </div>
  )
}
