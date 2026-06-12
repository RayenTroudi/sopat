'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  DESIGN_VOCABULARY_OPTIONS,
  PLANT_PALETTE_OPTIONS,
  PROJECT_TYPE_LABEL_FR,
  PROJECT_TYPE_VALUES,
} from '@/lib/design-vocab'

type Template = {
  id:                          string
  templateName:                string
  projectTypeContext:          string[]
  conceptDescriptionTemplate:  string
  recommendedVocabulary:       string[]
  recommendedPalette:          string[]
  exampleProjectIds:           string[]
  referenceImageCloudinaryIds: string[]
  createdBy:                   string
  createdByName:               string | null
  isPublished:                 boolean
  createdAt:                   string | Date
  updatedAt:                   string | Date
}

type FormState = {
  templateName:                string
  projectTypeContext:          string[]
  conceptDescriptionTemplate:  string
  recommendedVocabulary:       string[]
  recommendedPalette:          string[]
  referenceImageCloudinaryIds: string[]
  isPublished:                 boolean
}

const EMPTY_FORM: FormState = {
  templateName:                '',
  projectTypeContext:          [],
  conceptDescriptionTemplate:  '',
  recommendedVocabulary:       [],
  recommendedPalette:          [],
  referenceImageCloudinaryIds: [],
  isPublished:                 false,
}

export function TemplatesManagerClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const toast = useToast()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setCreating(true)
  }
  function openEdit(t: Template) {
    setForm({
      templateName:                t.templateName,
      projectTypeContext:          t.projectTypeContext,
      conceptDescriptionTemplate:  t.conceptDescriptionTemplate,
      recommendedVocabulary:       t.recommendedVocabulary,
      recommendedPalette:          t.recommendedPalette,
      referenceImageCloudinaryIds: t.referenceImageCloudinaryIds,
      isPublished:                 t.isPublished,
    })
    setEditing(t)
    setCreating(true)
  }

  async function refresh() {
    const res = await fetch('/api/design/templates')
    if (res.ok) {
      const j = await res.json()
      setTemplates(j.templates as Template[])
    }
  }

  async function save() {
    if (!form.templateName.trim() || !form.conceptDescriptionTemplate.trim()) {
      toast.error('Nom et description obligatoires.')
      return
    }
    const url = editing ? `/api/design/templates/${editing.id}` : '/api/design/templates'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        exampleProjectIds: editing?.exampleProjectIds ?? [],
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Échec de la sauvegarde')
      return
    }
    toast.success(editing ? 'Modèle mis à jour.' : 'Modèle créé.')
    setCreating(false)
    setEditing(null)
    await refresh()
  }

  async function togglePublish(t: Template) {
    const res = await fetch(`/api/design/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !t.isPublished }),
    })
    if (!res.ok) {
      toast.error('Échec')
      return
    }
    setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, isPublished: !t.isPublished } : x))
  }

  async function del(t: Template) {
    if (!confirm(`Supprimer le modèle « ${t.templateName} » ?`)) return
    const res = await fetch(`/api/design/templates/${t.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Échec de la suppression')
      return
    }
    setTemplates((prev) => prev.filter((x) => x.id !== t.id))
    toast.success('Modèle supprimé.')
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--admin-text)' }}>
            Modèles de concepts
          </h1>
          <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Les modèles publiés apparaissent dans « Inspiration depuis la bibliothèque » des Études.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="text-sm px-3 py-2 rounded font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff', border: '1px solid var(--admin-emerald)', cursor: 'pointer' }}
        >
          ✚ Nouveau modèle
        </button>
      </header>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}>
              <th className="text-left px-4 py-2 font-medium">Nom</th>
              <th className="text-left px-4 py-2 font-medium">Types de projet</th>
              <th className="text-left px-4 py-2 font-medium">Créé par</th>
              <th className="text-left px-4 py-2 font-medium">Publié</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>
                  Aucun modèle pour l’instant.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--admin-text)' }}>{t.templateName}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {t.projectTypeContext.map((p) => PROJECT_TYPE_LABEL_FR[p] ?? p).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {t.createdByName ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => togglePublish(t)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: t.isPublished ? 'var(--admin-emerald-dim)' : 'var(--admin-bg)',
                      color:      t.isPublished ? 'var(--admin-emerald)'     : 'var(--admin-text-muted)',
                      border: '1px solid ' + (t.isPublished ? 'var(--admin-emerald)' : 'var(--admin-border)'),
                      cursor: 'pointer',
                    }}
                  >{t.isPublished ? 'Publié' : 'Brouillon'}</button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="text-xs px-2 py-1 mr-2"
                    style={{ background: 'transparent', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', borderRadius: 4, cursor: 'pointer' }}
                  >Éditer</button>
                  <button
                    type="button"
                    onClick={() => del(t)}
                    className="text-xs px-2 py-1"
                    style={{ background: 'transparent', color: 'var(--admin-red)', border: '1px solid var(--admin-red)', borderRadius: 4, cursor: 'pointer' }}
                  >Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <TemplateForm
          form={form}
          setForm={setForm}
          editing={!!editing}
          onSave={save}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function TemplateForm({
  form, setForm, editing, onSave, onCancel,
}: {
  form: FormState
  setForm: (f: FormState) => void
  editing: boolean
  onSave: () => void
  onCancel: () => void
}) {
  function toggle<K extends keyof FormState>(key: K, value: string) {
    const current = form[key] as unknown as string[]
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value]
    setForm({ ...form, [key]: next as any })
  }

  function addImage(id: string) {
    const trimmed = id.trim()
    if (!trimmed) return
    if (form.referenceImageCloudinaryIds.includes(trimmed)) return
    setForm({ ...form, referenceImageCloudinaryIds: [...form.referenceImageCloudinaryIds, trimmed] })
  }
  function removeImage(id: string) {
    setForm({ ...form, referenceImageCloudinaryIds: form.referenceImageCloudinaryIds.filter((x) => x !== id) })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto p-6"
        style={{ background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
            {editing ? 'Éditer le modèle' : 'Nouveau modèle'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="text-2xl leading-none"
            style={{ color: 'var(--admin-text-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
          >×</button>
        </header>

        <Field label="Nom du modèle">
          <input
            type="text"
            value={form.templateName}
            onChange={(e) => setForm({ ...form, templateName: e.target.value })}
            className="w-full px-3 py-2 rounded"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          />
        </Field>

        <Field label="Types de projet adaptés">
          <ChipPicker
            options={PROJECT_TYPE_VALUES as readonly string[]}
            selected={form.projectTypeContext}
            onToggle={(v) => toggle('projectTypeContext', v)}
            render={(v) => PROJECT_TYPE_LABEL_FR[v] ?? v}
          />
        </Field>

        <Field label="Description du concept (modèle)">
          <textarea
            value={form.conceptDescriptionTemplate}
            onChange={(e) => setForm({ ...form, conceptDescriptionTemplate: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 rounded"
            style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)', lineHeight: 1.6 }}
          />
        </Field>

        <Field label="Vocabulaire recommandé">
          <ChipPicker
            options={DESIGN_VOCABULARY_OPTIONS as readonly string[]}
            selected={form.recommendedVocabulary}
            onToggle={(v) => toggle('recommendedVocabulary', v)}
          />
        </Field>

        <Field label="Palette recommandée">
          <ChipPicker
            options={PLANT_PALETTE_OPTIONS as readonly string[]}
            selected={form.recommendedPalette}
            onToggle={(v) => toggle('recommendedPalette', v)}
          />
        </Field>

        <Field label="Images de référence (Cloudinary IDs)">
          <ImageList
            items={form.referenceImageCloudinaryIds}
            onAdd={addImage}
            onRemove={removeImage}
          />
        </Field>

        <label className="flex items-center gap-2 mt-2 mb-6 text-sm" style={{ color: 'var(--admin-text)' }}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          />
          Publier — rendre ce modèle disponible dans l’inspiration Études.
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="text-sm px-4 py-2 rounded font-medium"
            style={{ background: 'var(--admin-emerald)', color: '#fff', border: '1px solid var(--admin-emerald)', cursor: 'pointer' }}
          >Enregistrer</button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded"
            style={{ background: 'transparent', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
          >Annuler</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ChipPicker({
  options, selected, onToggle, render,
}: {
  options: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
  render?: (v: string) => string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className="text-xs px-3 py-1.5 rounded-full"
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

function ImageList({
  items, onAdd, onRemove,
}: { items: string[]; onAdd: (id: string) => void; onRemove: (id: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Public ID Cloudinary, ex. sopat/designs/abc123"
          className="flex-1 px-3 py-2 rounded"
          style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
        />
        <button
          type="button"
          onClick={() => { onAdd(val); setVal('') }}
          className="text-sm px-3 py-2 rounded"
          style={{ background: 'transparent', color: 'var(--admin-text)', border: '1px solid var(--admin-border)', cursor: 'pointer' }}
        >Ajouter</button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((id) => (
            <li key={id} className="flex items-center justify-between text-xs px-2 py-1 rounded" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text)' }}>
              <span className="font-mono">{id}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                style={{ background: 'transparent', color: 'var(--admin-red)', border: 0, cursor: 'pointer' }}
              >Retirer</button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-muted)' }}>
        L’upload direct sera ajouté plus tard — coller les Cloudinary public IDs pour l’instant.
      </p>
    </div>
  )
}
