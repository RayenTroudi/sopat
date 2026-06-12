'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import {
  DESIGN_VOCABULARY_OPTIONS,
  PLANT_PALETTE_OPTIONS,
  PROJECT_TYPE_LABEL_FR,
  PROJECT_TYPE_ICON,
  PROJECT_TYPE_VALUES,
} from '@/lib/design-vocab'

type Concept = {
  projectId:              string
  projectName:            string
  projectReference:       string
  projectType:            string
  country:                string
  conceptTitle:           string
  conceptDescription:     string
  designVocabulary:       string[]
  plantPalettePhilosophy: string[]
  thumbnailUrl:           string | null
}

type Asset = { id: string; url: string; assetType: string }

function excerpt(text: string, max = 220) {
  if (!text) return ''
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export function ConceptsLibraryClient({
  initialConcepts,
  canCreateTemplate,
}: {
  initialConcepts: Concept[]
  canCreateTemplate: boolean
}) {
  const toast = useToast()
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts)
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')
  const [vocab, setVocab]       = useState<string | null>(null)
  const [palette, setPalette]   = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string | null>(null)
  const [country, setCountry]   = useState<string | null>(null)

  const [openConcept, setOpenConcept] = useState<Concept | null>(null)

  const countries = useMemo(() => {
    return Array.from(new Set(initialConcepts.map((c) => c.country).filter(Boolean))).sort()
  }, [initialConcepts])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q.trim())     params.set('q', q.trim())
    if (vocab)        params.set('vocabulary', vocab)
    if (palette)      params.set('palette', palette)
    if (projectType)  params.set('projectType', projectType)
    if (country)      params.set('country', country)

    setLoading(true)
    const ctl = new AbortController()
    fetch(`/api/design/concepts?${params.toString()}`, { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Recherche impossible')
        const j = await r.json()
        setConcepts(j.concepts as Concept[])
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') toast.error((e as Error).message) })
      .finally(() => setLoading(false))

    return () => ctl.abort()
  }, [q, vocab, palette, projectType, country, toast])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
          Bibliothèque de concepts
        </h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {concepts.length} concept{concepts.length === 1 ? '' : 's'} — la pensée design de SOPAT, projet par projet.
        </p>
      </header>

      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un titre ou un mot dans le concept…"
          className="w-full px-3 py-2 rounded"
          style={{
            background: 'var(--admin-bg)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
            fontSize: 14,
          }}
        />

        <FilterRow
          label="Vocabulaire"
          options={DESIGN_VOCABULARY_OPTIONS as readonly string[]}
          value={vocab}
          onChange={setVocab}
        />
        <FilterRow
          label="Palette"
          options={PLANT_PALETTE_OPTIONS as readonly string[]}
          value={palette}
          onChange={setPalette}
        />
        <FilterRow
          label="Type"
          options={PROJECT_TYPE_VALUES as readonly string[]}
          value={projectType}
          onChange={setProjectType}
          render={(v) => PROJECT_TYPE_LABEL_FR[v] ?? v}
        />
        {countries.length > 1 && (
          <FilterRow
            label="Pays"
            options={countries}
            value={country}
            onChange={setCountry}
          />
        )}
      </div>

      {loading && (
        <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</div>
      )}

      {!loading && concepts.length === 0 && (
        <div
          className="rounded-lg p-10 text-center text-sm"
          style={{ background: 'var(--admin-surface)', border: '1px dashed var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Aucun concept ne correspond à votre recherche.
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {concepts.map((c) => (
          <article
            key={c.projectId}
            onClick={() => setOpenConcept(c)}
            className="rounded-lg overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <div
              className="aspect-video flex items-center justify-center text-4xl"
              style={{
                background: c.thumbnailUrl
                  ? `center / cover no-repeat url(${c.thumbnailUrl})`
                  : 'linear-gradient(135deg, var(--admin-emerald-dim), var(--admin-bg))',
              }}
            >
              {!c.thumbnailUrl && <span>{PROJECT_TYPE_ICON[c.projectType] ?? '🌿'}</span>}
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {PROJECT_TYPE_ICON[c.projectType]} {PROJECT_TYPE_LABEL_FR[c.projectType] ?? c.projectType}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>{c.country}</span>
              </div>
              <h3 className="font-semibold text-base mb-1 leading-tight" style={{ color: 'var(--admin-text)' }}>
                {c.conceptTitle || '(sans titre)'}
              </h3>
              <div className="text-[11px] mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                {c.projectName} · {c.projectReference}
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                {excerpt(c.conceptDescription)}
              </p>
              <div className="flex flex-wrap gap-1">
                {c.designVocabulary.slice(0, 4).map((t) => (
                  <Chip key={'v-' + t} tone="emerald" label={t} />
                ))}
                {c.plantPalettePhilosophy.slice(0, 3).map((t) => (
                  <Chip key={'p-' + t} tone="blue" label={t} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {openConcept && (
        <ConceptDrawer
          concept={openConcept}
          canCreateTemplate={canCreateTemplate}
          onClose={() => setOpenConcept(null)}
        />
      )}
    </div>
  )
}

function FilterRow({
  label, options, value, onChange, render,
}: {
  label: string
  options: readonly string[]
  value: string | null
  onChange: (v: string | null) => void
  render?: (v: string) => string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium w-20" style={{ color: 'var(--admin-text-muted)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className="text-xs px-2 py-1 rounded-full"
        style={{
          background: value === null ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
          color:      value === null ? 'var(--admin-emerald)'     : 'var(--admin-text-muted)',
          border: '1px solid ' + (value === null ? 'var(--admin-emerald)' : 'var(--admin-border)'),
          cursor: 'pointer',
        }}
      >Tous</button>
      {options.map((o) => {
        const on = value === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? null : o)}
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
              color:      on ? 'var(--admin-emerald)'     : 'var(--admin-text)',
              border: '1px solid ' + (on ? 'var(--admin-emerald)' : 'var(--admin-border)'),
              cursor: 'pointer',
            }}
          >{render ? render(o) : o}</button>
        )
      })}
    </div>
  )
}

function Chip({ label, tone }: { label: string; tone: 'emerald' | 'blue' }) {
  const bg = tone === 'emerald' ? 'var(--admin-emerald-dim)' : 'var(--admin-blue-dim)'
  const fg = tone === 'emerald' ? 'var(--admin-emerald)'     : 'var(--admin-blue)'
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>
      {label}
    </span>
  )
}

function ConceptDrawer({
  concept, canCreateTemplate, onClose,
}: {
  concept: Concept
  canCreateTemplate: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [templateMode, setTemplateMode] = useState(false)
  const [tplName, setTplName] = useState(concept.conceptTitle || '')
  const [tplTypes, setTplTypes] = useState<string[]>([concept.projectType])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/design/concepts?projectAssets=${concept.projectId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Chargement impossible')
        const j = await r.json()
        setAssets(j.assets as Asset[])
      })
      .catch(() => setAssets([]))
  }, [concept.projectId])

  async function saveAsTemplate() {
    setSaving(true)
    try {
      const res = await fetch('/api/design/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName:                tplName.trim() || concept.conceptTitle || 'Modèle sans nom',
          projectTypeContext:          tplTypes,
          conceptDescriptionTemplate:  concept.conceptDescription,
          recommendedVocabulary:       concept.designVocabulary,
          recommendedPalette:          concept.plantPalettePhilosophy,
          exampleProjectIds:           [concept.projectId],
          referenceImageCloudinaryIds: [],
          isPublished:                 false,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Échec de la sauvegarde')
      }
      toast.success('Modèle créé — à publier depuis la gestion des modèles.')
      setTemplateMode(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto p-6"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>
              {PROJECT_TYPE_ICON[concept.projectType]} {PROJECT_TYPE_LABEL_FR[concept.projectType] ?? concept.projectType} · {concept.country}
            </div>
            <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {concept.conceptTitle || '(sans titre)'}
            </h2>
            <div className="text-xs mt-1" style={{ color: 'var(--admin-text-muted)' }}>
              {concept.projectName} · {concept.projectReference}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-2xl leading-none"
            style={{ color: 'var(--admin-text-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
          >×</button>
        </header>

        <p className="text-sm leading-relaxed mb-5 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>
          {concept.conceptDescription || 'Aucune description renseignée.'}
        </p>

        <TagBlock title="Vocabulaire" items={concept.designVocabulary} tone="emerald" />
        <TagBlock title="Palette végétale" items={concept.plantPalettePhilosophy} tone="blue" />

        <section className="mt-5">
          <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
            Rendus 3D & plans
          </h3>
          {assets === null && (
            <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</div>
          )}
          {assets && assets.length === 0 && (
            <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Aucun rendu disponible pour ce projet.</div>
          )}
          {assets && assets.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {assets.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square rounded overflow-hidden"
                  style={{
                    background: `center / cover no-repeat url(${a.url}), var(--admin-bg)`,
                    border: '1px solid var(--admin-border)',
                  }}
                  title={a.assetType}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href={`/admin/projects/${concept.projectId}`}
            className="text-sm px-3 py-2 rounded"
            style={{ background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Voir le projet →
          </Link>

          {canCreateTemplate && !templateMode && (
            <button
              type="button"
              onClick={() => setTemplateMode(true)}
              className="text-sm px-3 py-2 rounded"
              style={{ background: 'var(--admin-emerald)', color: '#fff', border: '1px solid var(--admin-emerald)', cursor: 'pointer' }}
            >
              ✚ Créer un modèle
            </button>
          )}
        </div>

        {templateMode && (
          <div
            className="mt-4 rounded p-4"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
          >
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--admin-text)' }}>Nouveau modèle</h4>
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Nom du modèle</label>
            <input
              type="text"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            />
            <label className="block text-xs mb-1" style={{ color: 'var(--admin-text-muted)' }}>Types de projet adaptés</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PROJECT_TYPE_VALUES.map((v) => {
                const on = tplTypes.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTplTypes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
                      color:      on ? 'var(--admin-emerald)'     : 'var(--admin-text)',
                      border: '1px solid ' + (on ? 'var(--admin-emerald)' : 'var(--admin-border)'),
                      cursor: 'pointer',
                    }}
                  >{PROJECT_TYPE_LABEL_FR[v]}</button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={saving || !tplName.trim()}
                className="text-sm px-3 py-2 rounded font-medium"
                style={{ background: 'var(--admin-emerald)', color: '#fff', border: '1px solid var(--admin-emerald)', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer le modèle'}
              </button>
              <button
                type="button"
                onClick={() => setTemplateMode(false)}
                className="text-sm px-3 py-2 rounded"
                style={{ background: 'transparent', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
              >Annuler</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function TagBlock({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'blue' }) {
  if (items.length === 0) return null
  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => <Chip key={t} label={t} tone={tone} />)}
      </div>
    </div>
  )
}
