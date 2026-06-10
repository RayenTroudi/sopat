'use client'

import { UseFormReturn } from 'react-hook-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WizardFormValues = any

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const VOCABULARY_OPTIONS = [
  'méditerranéen', 'tropical', 'minimaliste', 'contemporain',
  'traditionnel local', 'bioclimatique', 'japonais', 'autre',
]

const PALETTE_OPTIONS = [
  'végétaux locaux', 'palette xérophyte', 'palette tropicale',
  'palette méditerranéenne', 'intérieur tropical', 'autre',
]

function ChipSelector({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={{
              borderColor: active ? 'var(--green)' : 'var(--admin-border)',
              background: active ? 'var(--green)' : 'var(--admin-surface)',
              color: active ? '#fff' : 'var(--admin-text-muted)',
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function Step3Concept({ form }: { form: UseFormReturn<WizardFormValues> }) {
  const { register, formState: { errors }, watch, setValue } = form
  const vocabulary = watch('designVocabulary') ?? []
  const palette = watch('plantPalettePhilosophy') ?? []

  return (
    <div className="space-y-4">
      <Field label="Titre du concept" error={errors.conceptTitle?.message}>
        <input {...register('conceptTitle')} className={inputClass} style={inputStyle} placeholder="La Lagune, Les Perles du Lac…" />
      </Field>
      <Field label="Description du concept" error={errors.conceptDescription?.message}>
        <textarea
          {...register('conceptDescription')}
          rows={4}
          className={inputClass}
          style={inputStyle}
          placeholder="Décrivez le parti pris conceptuel et l'ambiance recherchée…"
        />
      </Field>
      <Field label="Vocabulaire de design">
        <ChipSelector
          options={VOCABULARY_OPTIONS}
          value={vocabulary}
          onChange={(v) => setValue('designVocabulary', v)}
        />
      </Field>
      <Field label="Philosophie de la palette végétale">
        <ChipSelector
          options={PALETTE_OPTIONS}
          value={palette}
          onChange={(v) => setValue('plantPalettePhilosophy', v)}
        />
      </Field>
    </div>
  )
}
