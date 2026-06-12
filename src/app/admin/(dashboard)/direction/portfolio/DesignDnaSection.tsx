type Freq = { tag: string; count: number }

export function DesignDnaSection({
  vocabularyFrequency,
  paletteFrequency,
  totalProjects,
}: {
  vocabularyFrequency: Freq[]
  paletteFrequency:    Freq[]
  totalProjects:       number
}) {
  const vocabMax = Math.max(1, ...vocabularyFrequency.map((v) => v.count))
  const paletteMax = Math.max(1, ...paletteFrequency.map((v) => v.count))

  return (
    <section
      className="rounded-lg p-6"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <header className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>Design DNA</h2>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Lecture instantanée de l’identité paysagère de SOPAT à travers ses {totalProjects} projet{totalProjects === 1 ? '' : 's'} avec concept renseigné.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tag cloud */}
        <div>
          <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>
            Vocabulaire de design — le plus utilisé
          </h3>
          {vocabularyFrequency.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée.</p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {vocabularyFrequency.map((v) => {
                const scale = 0.85 + (v.count / vocabMax) * 1.1
                const weight = v.count >= vocabMax * 0.75 ? 600 : 400
                return (
                  <span
                    key={v.tag}
                    style={{
                      fontSize: `${scale}rem`,
                      fontWeight: weight,
                      color: 'var(--admin-emerald)',
                      lineHeight: 1.4,
                    }}
                    title={`${v.count} projet${v.count === 1 ? '' : 's'}`}
                  >
                    {v.tag}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Horizontal bar chart */}
        <div>
          <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--admin-text-muted)' }}>
            Philosophie de palette — fréquence
          </h3>
          {paletteFrequency.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucune donnée.</p>
          ) : (
            <ul className="space-y-2">
              {paletteFrequency.map((p) => {
                const pct = (p.count / paletteMax) * 100
                return (
                  <li key={p.tag}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--admin-text)' }}>
                      <span>{p.tag}</span>
                      <span style={{ color: 'var(--admin-text-muted)' }}>{p.count}</span>
                    </div>
                    <div className="h-2 rounded overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: 'var(--admin-blue)' }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
