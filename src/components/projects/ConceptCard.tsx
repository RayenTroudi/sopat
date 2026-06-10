type Props = {
  conceptTitle?: string | null
  conceptDescription?: string | null
  designVocabulary?: string[] | null
  plantPalettePhilosophy?: string[] | null
}

export function ConceptCard({ conceptTitle, conceptDescription, designVocabulary, plantPalettePhilosophy }: Props) {
  if (!conceptTitle && !conceptDescription && !designVocabulary?.length && !plantPalettePhilosophy?.length) {
    return null
  }

  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      {conceptTitle && (
        <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          {conceptTitle}
        </h2>
      )}
      {conceptDescription && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
          {conceptDescription}
        </p>
      )}
      {(designVocabulary?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>
            Vocabulaire de design
          </p>
          <div className="flex flex-wrap gap-1.5">
            {designVocabulary!.map((v) => (
              <span
                key={v}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{ borderColor: 'var(--green)', color: 'var(--green)', background: 'color-mix(in srgb, var(--green) 10%, transparent)' }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
      {(plantPalettePhilosophy?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--admin-text-muted)' }}>
            Palette végétale
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plantPalettePhilosophy!.map((p) => (
              <span
                key={p}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
              >
                🌿 {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
