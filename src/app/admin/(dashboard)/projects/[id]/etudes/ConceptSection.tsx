'use client'

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  DESIGN_VOCABULARY_OPTIONS,
  PLANT_PALETTE_OPTIONS,
  PROJECT_TYPE_LABEL_FR,
} from '@/lib/design-vocab'

type Template = {
  id:                          string
  templateName:                string
  projectTypeContext:          string[]
  conceptDescriptionTemplate:  string
  recommendedVocabulary:       string[]
  recommendedPalette:          string[]
}

type Props = {
  projectId:          string
  projectType:        string
  initialTitle:       string
  initialDescription: string
  initialVocabulary:  string[]
  initialPalette:     string[]
  canEdit:            boolean
}

const TARGET_WORDS_MIN = 100
const TARGET_WORDS_MAX = 200

function wordCount(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export function ConceptSection(props: Props) {
  const toast = useToast()
  const [title, setTitle]             = useState(props.initialTitle)
  const [description, setDescription] = useState(props.initialDescription)
  const [vocab, setVocab]             = useState<string[]>(props.initialVocabulary)
  const [palette, setPalette]         = useState<string[]>(props.initialPalette)

  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const dirty = useMemo(() => {
    return title !== props.initialTitle
      || description !== props.initialDescription
      || JSON.stringify(vocab.slice().sort())   !== JSON.stringify(props.initialVocabulary.slice().sort())
      || JSON.stringify(palette.slice().sort()) !== JSON.stringify(props.initialPalette.slice().sort())
  }, [title, description, vocab, palette, props])

  const words = wordCount(description)
  const wordStatus: 'low' | 'ok' | 'high' =
    words < TARGET_WORDS_MIN ? 'low' : words > TARGET_WORDS_MAX ? 'high' : 'ok'
  const wordColor =
    wordStatus === 'ok'  ? 'var(--admin-emerald)'
    : wordStatus === 'low' ? 'var(--admin-text-muted)'
    : 'var(--admin-amber)'

  function toggle(list: string[], v: string, setter: (n: string[]) => void) {
    if (!props.canEdit) return
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${props.projectId}/concept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptTitle:           title.trim() || null,
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
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function aiSuggest() {
    setAiBusy(true)
    try {
      const res = await fetch('/api/design/concept-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType:            props.projectType,
          designVocabulary:       vocab,
          plantPalettePhilosophy: palette,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Échec de la génération')
      setDescription(j.suggestion)
      toast.toast('Brouillon généré — à relire et finaliser.', 'info')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <section
      className="rounded-lg p-6"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <header className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          Concept & Identité
        </h2>
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {PROJECT_TYPE_LABEL_FR[props.projectType] ?? props.projectType}
        </span>
      </header>
      <p className="text-xs mb-5" style={{ color: 'var(--admin-text-muted)' }}>
        Définition du parti pris paysager, du vocabulaire de design et de la palette végétale.
      </p>

      {/* Title */}
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>
        Titre du concept
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!props.canEdit}
        placeholder="ex. Jardin méditerranéen contemporain"
        className="w-full mb-4 px-3 py-2 rounded"
        style={{
          background: 'var(--admin-bg)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
          fontSize: 16,
          fontFamily: 'var(--font-sans)',
        }}
      />

      {/* Description */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
          Description du concept
        </label>
        <div className="flex items-center gap-3">
          {props.canEdit && (
            <button
              type="button"
              onClick={aiSuggest}
              disabled={aiBusy}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: 'var(--admin-blue-dim)',
                color: 'var(--admin-blue)',
                border: '1px solid var(--admin-blue)',
                cursor: aiBusy ? 'wait' : 'pointer',
                opacity: aiBusy ? 0.6 : 1,
              }}
              title="Générer un brouillon — toujours éditable"
            >
              {aiBusy ? 'Génération…' : '✨ Générer avec l\'IA'}
            </button>
          )}
          <span className="text-xs" style={{ color: wordColor }}>
            {words} mot{words === 1 ? '' : 's'} · cible {TARGET_WORDS_MIN}–{TARGET_WORDS_MAX}
          </span>
        </div>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={!props.canEdit}
        rows={8}
        placeholder="Décrivez le parti pris paysager, l'atmosphère recherchée, les inspirations…"
        className="w-full mb-5 px-3 py-2 rounded"
        style={{
          background: 'var(--admin-bg)',
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.6,
          resize: 'vertical',
        }}
      />

      {/* Vocabulary chips */}
      <ChipGroup
        label="Vocabulaire de design"
        options={DESIGN_VOCABULARY_OPTIONS as readonly string[]}
        selected={vocab}
        onToggle={(v) => toggle(vocab, v, setVocab)}
        disabled={!props.canEdit}
      />

      {/* Palette chips */}
      <div className="mt-4">
        <ChipGroup
          label="Philosophie de palette végétale"
          options={PLANT_PALETTE_OPTIONS as readonly string[]}
          selected={palette}
          onToggle={(v) => toggle(palette, v, setPalette)}
          disabled={!props.canEdit}
        />
      </div>

      {/* Actions */}
      {props.canEdit && (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="text-sm px-4 py-2 rounded font-medium"
            style={{
              background: dirty ? 'var(--admin-emerald)' : 'var(--admin-bg)',
              color: dirty ? '#fff' : 'var(--admin-text-muted)',
              border: '1px solid ' + (dirty ? 'var(--admin-emerald)' : 'var(--admin-border)'),
              cursor: dirty && !saving ? 'pointer' : 'default',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le concept'}
          </button>

          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="text-sm px-4 py-2 rounded"
            style={{
              background: 'transparent',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
              cursor: 'pointer',
            }}
          >
            📚 Inspiration depuis la bibliothèque
          </button>
        </div>
      )}

      {libraryOpen && (
        <InspirationModal
          projectType={props.projectType}
          onClose={() => setLibraryOpen(false)}
          onPick={(t) => {
            setDescription(t.conceptDescriptionTemplate)
            // Merge tags rather than overwriting selections the user already made.
            setVocab((prev) => Array.from(new Set([...prev, ...t.recommendedVocabulary])))
            setPalette((prev) => Array.from(new Set([...prev, ...t.recommendedPalette])))
            setLibraryOpen(false)
            toast.toast(`Modèle « ${t.templateName} » appliqué — à personnaliser.`, 'info')
          }}
        />
      )}
    </section>
  )
}

function ChipGroup({
  label, options, selected, onToggle, disabled,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              disabled={disabled}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: on ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
                color:      on ? 'var(--admin-emerald)'     : 'var(--admin-text)',
                border:     '1px solid ' + (on ? 'var(--admin-emerald)' : 'var(--admin-border)'),
                cursor:     disabled ? 'default' : 'pointer',
                opacity:    disabled && !on ? 0.6 : 1,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InspirationModal({
  projectType,
  onClose,
  onPick,
}: {
  projectType: string
  onClose: () => void
  onPick: (t: Template) => void
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/design/templates?publishedOnly=1&projectType=${encodeURIComponent(projectType)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Chargement impossible')
        const j = await r.json()
        setTemplates(j.templates)
      })
      .catch((e) => setError((e as Error).message))
  }, [projectType])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--admin-text)' }}>
            Inspiration depuis la bibliothèque
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none"
            style={{ color: 'var(--admin-text-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
            aria-label="Fermer"
          >×</button>
        </header>

        {error && <div className="text-sm" style={{ color: 'var(--admin-red)' }}>{error}</div>}
        {!error && templates === null && (
          <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Chargement…</div>
        )}
        {templates && templates.length === 0 && (
          <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Aucun modèle publié pour ce type de projet pour l’instant.
          </div>
        )}
        {templates && templates.length > 0 && (
          <ul className="space-y-3">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded p-4 cursor-pointer transition-colors"
                style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)' }}
                onClick={() => onPick(t)}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-medium text-sm" style={{ color: 'var(--admin-text)' }}>
                    {t.templateName}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                    {t.projectTypeContext.map((p) => PROJECT_TYPE_LABEL_FR[p] ?? p).join(' · ')}
                  </span>
                </div>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--admin-text-muted)' }}>
                  {t.conceptDescriptionTemplate.slice(0, 200)}{t.conceptDescriptionTemplate.length > 200 ? '…' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...t.recommendedVocabulary, ...t.recommendedPalette].map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}
                    >{tag}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
