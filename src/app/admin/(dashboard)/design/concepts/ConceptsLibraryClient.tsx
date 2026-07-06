'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import {
  DESIGN_VOCABULARY_OPTIONS,
  PLANT_PALETTE_OPTIONS,
  PROJECT_TYPE_LABEL_FR,
  PROJECT_TYPE_ICON,
  PROJECT_TYPE_VALUES,
} from '@/lib/design-vocab'
import { Search, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'

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

type ProjectOption = {
  id:   string
  name: string
  type: string
  ref:  string
}

type Asset = { id: string; url: string; assetType: string }

function excerpt(text: string, max = 200) {
  if (!text) return ''
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, tone }: { label: string; tone: 'emerald' | 'blue' }) {
  const bg = tone === 'emerald' ? 'var(--admin-emerald-dim)' : 'var(--admin-blue-dim)'
  const fg = tone === 'emerald' ? 'var(--admin-emerald)'     : 'var(--admin-blue)'
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>
      {label}
    </span>
  )
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-full transition-colors"
      style={{
        background:  active ? 'var(--green)'        : 'var(--admin-bg)',
        color:       active ? 'var(--ivory)'         : 'var(--admin-fg)',
        border:      '1px solid ' + (active ? 'var(--green)' : 'var(--admin-border)'),
        cursor:      'pointer',
        fontWeight:  active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}

// ─── FilterSection ────────────────────────────────────────────────────────────

function FilterSection({
  label, options, value, onChange, render, collapsed, onToggle,
}: {
  label:    string
  options:  readonly string[]
  value:    string | null
  onChange: (v: string | null) => void
  render?:  (v: string) => string
  collapsed:  boolean
  onToggle:   () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 mb-2 w-full text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
          {label}
        </span>
        {value && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--green)', color: 'var(--ivory)' }}>
            1
          </span>
        )}
        {collapsed
          ? <ChevronDown size={12} style={{ color: 'var(--admin-muted)', marginLeft: 'auto' }} />
          : <ChevronUp   size={12} style={{ color: 'var(--admin-muted)', marginLeft: 'auto' }} />
        }
      </button>
      {!collapsed && (
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={value === null} onClick={() => onChange(null)}>Tous</FilterPill>
          {options.map((o) => (
            <FilterPill key={o} active={value === o} onClick={() => onChange(value === o ? null : o)}>
              {render ? render(o) : o}
            </FilterPill>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AddConceptDrawer ─────────────────────────────────────────────────────────

function AddConceptDrawer({
  projects,
  onClose,
  onSaved,
}: {
  projects: ProjectOption[]
  onClose:  () => void
  onSaved:  () => void
}) {
  const toast   = useToast()
  const router  = useRouter()
  const [pending, startTransition] = useTransition()

  const [projectId, setProjectId] = useState('')
  const [title, setTitle]         = useState('')
  const [description, setDescription] = useState('')
  const [vocab, setVocab]         = useState<string[]>([])
  const [palette, setPalette]     = useState<string[]>([])
  const [aiBusy, setAiBusy]       = useState(false)

  const selectedProject = projects.find((p) => p.id === projectId)

  function toggleArr(arr: string[], v: string, set: (n: string[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  async function aiSuggest() {
    if (!selectedProject) return
    setAiBusy(true)
    try {
      const res = await fetch('/api/design/concept-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType: selectedProject.type, designVocabulary: vocab, plantPalettePhilosophy: palette }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Échec')
      setDescription(j.suggestion)
      toast.toast('Brouillon généré — à relire et personnaliser.', 'info')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAiBusy(false)
    }
  }

  function save() {
    if (!projectId || !title.trim()) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/concept`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conceptTitle:           title.trim(),
            conceptDescription:     description.trim() || null,
            designVocabulary:       vocab,
            plantPalettePhilosophy: palette,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? 'Échec de la sauvegarde')
        }
        toast.success('Concept enregistré.')
        onSaved()
      } catch (e) {
        toast.error((e as Error).message)
      }
    })
  }

  const canSave = !!projectId && title.trim().length > 0 && !pending

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-xl overflow-y-auto"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--green)', opacity: 0.9 }}>
              <Plus size={15} style={{ color: 'var(--ivory)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--admin-fg)' }}>Nouveau concept</p>
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Associer un parti pris à un projet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-70"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
          >
            <X size={14} style={{ color: 'var(--admin-muted)' }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Project picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-muted)' }}>
              Projet *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--admin-border)',
                background:  'var(--admin-bg)',
                color:       projectId ? 'var(--admin-fg)' : 'var(--admin-muted)',
              }}
            >
              <option value="">— Choisir un projet —</option>
              {projects.filter((p) => p.name !== 'T').map((p) => (
                <option key={p.id} value={p.id}>
                  {PROJECT_TYPE_ICON[p.type] ?? '🌿'} {p.name} ({p.ref})
                </option>
              ))}
            </select>
            {selectedProject && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-muted)' }}>
                Type : {PROJECT_TYPE_LABEL_FR[selectedProject.type] ?? selectedProject.type}
              </p>
            )}
          </div>

          {/* Concept title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-muted)' }}>
              Titre du concept *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Jardin andalou contemporain"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }}
            />
          </div>

          {/* Vocabulary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>
              Vocabulaire de design
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DESIGN_VOCABULARY_OPTIONS.map((v) => {
                const on = vocab.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleArr(vocab, v, setVocab)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
                      color:      on ? 'var(--admin-emerald)'     : 'var(--admin-fg)',
                      border:     '1px solid ' + (on ? 'var(--admin-emerald)' : 'var(--admin-border)'),
                      cursor:     'pointer',
                    }}
                  >{v}</button>
                )
              })}
            </div>
          </div>

          {/* Palette */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>
              Palette végétale
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLANT_PALETTE_OPTIONS.map((v) => {
                const on = palette.includes(v)
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleArr(palette, v, setPalette)}
                    className="text-xs px-2.5 py-1 rounded-full transition-colors"
                    style={{
                      background: on ? 'var(--admin-blue-dim)' : 'var(--admin-bg)',
                      color:      on ? 'var(--admin-blue)'     : 'var(--admin-fg)',
                      border:     '1px solid ' + (on ? 'var(--admin-blue)' : 'var(--admin-border)'),
                      cursor:     'pointer',
                    }}
                  >{v}</button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-muted)' }}>
                Description du concept
              </label>
              <button
                type="button"
                onClick={aiSuggest}
                disabled={aiBusy || !selectedProject}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-opacity disabled:opacity-40"
                style={{
                  background: 'var(--admin-blue-dim)',
                  color:      'var(--admin-blue)',
                  border:     '1px solid var(--admin-blue)',
                  cursor:     aiBusy || !selectedProject ? 'default' : 'pointer',
                }}
              >
                {aiBusy ? 'Génération…' : '✨ Générer avec l\'IA'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              placeholder="Décrivez le parti pris paysager, l'atmosphère recherchée, les inspirations…"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--admin-border)',
                background:  'var(--admin-bg)',
                color:       'var(--admin-fg)',
                lineHeight:  1.6,
                resize:      'vertical',
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--admin-muted)' }}>
              {description.trim() ? description.trim().split(/\s+/).length : 0} mots · cible 100–200
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex items-center gap-3 px-6 py-4"
          style={{ background: 'var(--admin-surface)', borderTop: '1px solid var(--admin-border)' }}
        >
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ background: 'var(--green)', color: 'var(--ivory)', cursor: canSave ? 'pointer' : 'default' }}
          >
            {pending ? 'Enregistrement…' : 'Enregistrer le concept'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm"
            style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
          >
            Annuler
          </button>
        </div>
      </aside>
    </div>
  )
}

// ─── ConceptDrawer ────────────────────────────────────────────────────────────

function ConceptDrawer({
  concept, canCreateTemplate, onClose,
}: {
  concept: Concept
  canCreateTemplate: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const [assets, setAssets]           = useState<Asset[] | null>(null)
  const [templateMode, setTemplateMode] = useState(false)
  const [tplName, setTplName]         = useState(concept.conceptTitle || '')
  const [tplTypes, setTplTypes]       = useState<string[]>([concept.projectType])
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    fetch(`/api/design/concepts?projectAssets=${concept.projectId}`)
      .then(async (r) => { if (!r.ok) throw new Error(); const j = await r.json(); setAssets(j.assets) })
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
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Échec') }
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
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-start justify-between"
          style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="min-w-0 pr-4">
            <p className="text-[11px] mb-0.5" style={{ color: 'var(--admin-muted)' }}>
              {PROJECT_TYPE_ICON[concept.projectType]} {PROJECT_TYPE_LABEL_FR[concept.projectType] ?? concept.projectType} · {concept.country}
            </p>
            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-fg)' }}>
              {concept.conceptTitle || '(sans titre)'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>
              {concept.projectName} · {concept.projectReference}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:opacity-70"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
          >
            <X size={14} style={{ color: 'var(--admin-muted)' }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--admin-fg)' }}>
            {concept.conceptDescription || 'Aucune description renseignée.'}
          </p>

          {/* Tags */}
          {concept.designVocabulary.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>Vocabulaire</p>
              <div className="flex flex-wrap gap-1.5">
                {concept.designVocabulary.map((t) => <Chip key={t} label={t} tone="emerald" />)}
              </div>
            </div>
          )}
          {concept.plantPalettePhilosophy.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>Palette végétale</p>
              <div className="flex flex-wrap gap-1.5">
                {concept.plantPalettePhilosophy.map((t) => <Chip key={t} label={t} tone="blue" />)}
              </div>
            </div>
          )}

          {/* Assets */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-muted)' }}>Rendus & plans</p>
            {assets === null && <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Chargement…</p>}
            {assets && assets.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Aucun rendu disponible pour ce projet.</p>
            )}
            {assets && assets.length > 0 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {assets.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden"
                    style={{ background: `center / cover no-repeat url(${a.url}), var(--admin-bg)`, border: '1px solid var(--admin-border)' }}
                    title={a.assetType}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/admin/projects/${concept.projectId}`}
              className="text-sm px-4 py-2 rounded-lg"
              style={{ background: 'transparent', border: '1px solid var(--admin-border)', color: 'var(--admin-fg)' }}
            >
              Voir le projet →
            </Link>
            {canCreateTemplate && !templateMode && (
              <button
                type="button"
                onClick={() => setTemplateMode(true)}
                className="text-sm px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--green)', color: 'var(--ivory)', border: 'none', cursor: 'pointer' }}
              >
                + Créer un modèle
              </button>
            )}
          </div>

          {/* Create template inline form */}
          {templateMode && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-fg)' }}>Nouveau modèle</p>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--admin-muted)' }}>Nom du modèle</label>
                <input
                  type="text"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', color: 'var(--admin-fg)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--admin-muted)' }}>Types de projet adaptés</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_TYPE_VALUES.map((v) => {
                    const on = tplTypes.includes(v)
                    return (
                      <button key={v} type="button"
                        onClick={() => setTplTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-surface)',
                          color:      on ? 'var(--admin-emerald)'     : 'var(--admin-fg)',
                          border:     '1px solid ' + (on ? 'var(--admin-emerald)' : 'var(--admin-border)'),
                          cursor:     'pointer',
                        }}
                      >{PROJECT_TYPE_LABEL_FR[v]}</button>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveAsTemplate}
                  disabled={saving || !tplName.trim()}
                  className="text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-40"
                  style={{ background: 'var(--green)', color: 'var(--ivory)', cursor: saving || !tplName.trim() ? 'default' : 'pointer' }}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer le modèle'}
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode(false)}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ background: 'transparent', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
                >Annuler</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConceptsLibraryClient({
  initialConcepts,
  canCreateTemplate,
  projects,
}: {
  initialConcepts:  Concept[]
  canCreateTemplate: boolean
  projects:         ProjectOption[]
}) {
  const toast  = useToast()
  const router = useRouter()

  const [concepts, setConcepts]       = useState<Concept[]>(initialConcepts)
  const [loading, setLoading]         = useState(false)
  const [q, setQ]                     = useState('')
  const [vocab, setVocab]             = useState<string | null>(null)
  const [palette, setPalette]         = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string | null>(null)
  const [country, setCountry]         = useState<string | null>(null)

  // which filter sections are collapsed
  const [collapsed, setCollapsed] = useState({ vocab: false, palette: false, type: false, country: false })
  function toggleSection(k: keyof typeof collapsed) {
    setCollapsed((p) => ({ ...p, [k]: !p[k] }))
  }

  const [openConcept, setOpenConcept] = useState<Concept | null>(null)
  const [addOpen, setAddOpen]         = useState(false)

  const activeFilterCount = [vocab, palette, projectType, country].filter(Boolean).length

  const countries = useMemo(
    () => Array.from(new Set(initialConcepts.map((c) => c.country).filter(Boolean))).sort(),
    [initialConcepts],
  )

  // Live search via API
  useEffect(() => {
    const params = new URLSearchParams()
    if (q.trim())    params.set('q', q.trim())
    if (vocab)       params.set('vocabulary', vocab)
    if (palette)     params.set('palette', palette)
    if (projectType) params.set('projectType', projectType)
    if (country)     params.set('country', country)

    setLoading(true)
    const ctl = new AbortController()
    fetch(`/api/design/concepts?${params}`, { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Recherche impossible')
        const j = await r.json()
        setConcepts(j.concepts as Concept[])
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') toast.error((e as Error).message) })
      .finally(() => setLoading(false))

    return () => ctl.abort()
  }, [q, vocab, palette, projectType, country, toast])

  function clearFilters() {
    setQ('')
    setVocab(null)
    setPalette(null)
    setProjectType(null)
    setCountry(null)
  }

  return (
    <div className="flex gap-6 min-h-0">

      {/* ── Left sidebar: filters ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-5 shrink-0" style={{ width: 220 }}>
        <div
          className="rounded-xl border p-4 space-y-5 sticky top-6"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-muted)' }}>Filtres</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] hover:underline"
                style={{ color: 'var(--admin-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Effacer ({activeFilterCount})
              </button>
            )}
          </div>

          <FilterSection
            label="Vocabulaire"
            options={DESIGN_VOCABULARY_OPTIONS}
            value={vocab}
            onChange={setVocab}
            collapsed={collapsed.vocab}
            onToggle={() => toggleSection('vocab')}
          />
          <FilterSection
            label="Palette"
            options={PLANT_PALETTE_OPTIONS}
            value={palette}
            onChange={setPalette}
            collapsed={collapsed.palette}
            onToggle={() => toggleSection('palette')}
          />
          <FilterSection
            label="Type de projet"
            options={PROJECT_TYPE_VALUES}
            value={projectType}
            onChange={setProjectType}
            render={(v) => PROJECT_TYPE_LABEL_FR[v] ?? v}
            collapsed={collapsed.type}
            onToggle={() => toggleSection('type')}
          />
          {countries.length > 1 && (
            <FilterSection
              label="Pays"
              options={countries}
              value={country}
              onChange={setCountry}
              collapsed={collapsed.country}
              onToggle={() => toggleSection('country')}
            />
          )}
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5 pb-8">

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[18px] font-bold" style={{ color: 'var(--admin-fg)', letterSpacing: '-0.01em' }}>
              Bibliothèque de concepts
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-muted)' }}>
              {loading ? 'Chargement…' : `${concepts.length} concept${concepts.length === 1 ? '' : 's'}`}
              {' '}— la pensée design de SOPAT, projet par projet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            <Plus size={14} />
            Nouveau concept
          </button>
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          <Search size={14} style={{ color: 'var(--admin-muted)', flexShrink: 0 }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un titre, une description…"
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: 'var(--admin-fg)' }}
          />
          {q && (
            <button type="button" onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Mobile filter pills */}
        <div className="flex lg:hidden flex-wrap gap-1.5">
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters}
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
            >
              Effacer filtres ({activeFilterCount})
            </button>
          )}
          {[
            { label: 'Vocabulaire', opts: DESIGN_VOCABULARY_OPTIONS, val: vocab, set: setVocab },
            { label: 'Palette',     opts: PLANT_PALETTE_OPTIONS,     val: palette, set: setPalette },
          ].map(({ label, opts, val, set }) => (
            <select key={label}
              value={val ?? ''}
              onChange={(e) => set(e.target.value || null)}
              className="text-xs px-2 py-1 rounded-full border"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-fg)' }}
            >
              <option value="">{label}: Tous</option>
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>

        {/* Active filter badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>Filtrés :</span>
            {[
              vocab && { label: vocab, clear: () => setVocab(null) },
              palette && { label: palette, clear: () => setPalette(null) },
              projectType && { label: PROJECT_TYPE_LABEL_FR[projectType] ?? projectType, clear: () => setProjectType(null) },
              country && { label: country, clear: () => setCountry(null) },
            ].filter(Boolean).map((f: any) => (
              <span key={f.label}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--green)', color: 'var(--ivory)' }}
              >
                {f.label}
                <button type="button" onClick={f.clear}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ivory)', lineHeight: 1, padding: 0 }}
                ><X size={10} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && concepts.length === 0 && (
          <div
            className="rounded-xl border p-12 text-center"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)', borderStyle: 'dashed' }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--admin-muted)' }}>
              {activeFilterCount > 0 || q
                ? 'Aucun concept ne correspond à votre recherche.'
                : 'Aucun concept enregistré. Créez le premier depuis un projet ou via le bouton ci-dessus.'}
            </p>
            {(activeFilterCount > 0 || q) && (
              <button type="button" onClick={clearFilters}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--admin-bg)', color: 'var(--admin-fg)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* Concept grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {concepts.map((c) => (
            <article
              key={c.projectId}
              onClick={() => setOpenConcept(c)}
              className="rounded-xl overflow-hidden cursor-pointer group"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', transition: 'box-shadow 150ms ease, transform 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none';              e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Thumbnail */}
              <div
                className="aspect-video flex items-center justify-center"
                style={{
                  background: c.thumbnailUrl
                    ? `center / cover no-repeat url(${c.thumbnailUrl})`
                    : 'linear-gradient(135deg, var(--admin-emerald-dim) 0%, var(--admin-bg) 100%)',
                }}
              >
                {!c.thumbnailUrl && (
                  <span style={{ fontSize: 36, opacity: 0.5 }}>{PROJECT_TYPE_ICON[c.projectType] ?? '🌿'}</span>
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
                    {PROJECT_TYPE_ICON[c.projectType]} {PROJECT_TYPE_LABEL_FR[c.projectType] ?? c.projectType}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--admin-muted)' }}>{c.country}</span>
                </div>

                <h3 className="font-bold text-[14px] leading-snug mb-1" style={{ color: 'var(--admin-fg)' }}>
                  {c.conceptTitle || '(sans titre)'}
                </h3>
                <p className="text-[11px] mb-2" style={{ color: 'var(--admin-muted)' }}>
                  {c.projectName} · {c.projectReference}
                </p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--admin-muted)' }}>
                  {excerpt(c.conceptDescription)}
                </p>

                <div className="flex flex-wrap gap-1">
                  {c.designVocabulary.slice(0, 3).map((t) => <Chip key={'v-' + t} label={t} tone="emerald" />)}
                  {c.plantPalettePhilosophy.slice(0, 2).map((t) => <Chip key={'p-' + t} label={t} tone="blue" />)}
                  {(c.designVocabulary.length + c.plantPalettePhilosophy.length) > 5 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--admin-bg)', color: 'var(--admin-muted)', border: '1px solid var(--admin-border)' }}>
                      +{(c.designVocabulary.length + c.plantPalettePhilosophy.length) - 5}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ── Detail drawer ───────────────────────────────────────────────────── */}
      {openConcept && (
        <ConceptDrawer
          concept={openConcept}
          canCreateTemplate={canCreateTemplate}
          onClose={() => setOpenConcept(null)}
        />
      )}

      {/* ── Add concept drawer ──────────────────────────────────────────────── */}
      {addOpen && (
        <AddConceptDrawer
          projects={projects}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
