'use client'

import { UseFormReturn } from 'react-hook-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WizardFormValues = any

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const PROJECT_TYPE_OPTIONS = [
  { value: 'ingenierie_territoriale', label: 'Ingénierie territoriale', icon: '🗺️' },
  { value: 'espace_public', label: 'Espace public', icon: '🌳' },
  { value: 'siege_social', label: 'Siège social', icon: '🏢' },
  { value: 'hotelier_touristique', label: 'Hôtelier & touristique', icon: '🏨' },
  { value: 'residentiel', label: 'Résidentiel', icon: '🏡' },
  { value: 'interieur', label: 'Intérieur', icon: '🪴' },
]

const SECTOR_OPTIONS = [
  { value: 'banque', label: 'Banque' },
  { value: 'hotellerie', label: 'Hôtellerie' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'institutionnel_public', label: 'Institutionnel public' },
  { value: 'institutionnel_prive', label: 'Institutionnel privé' },
  { value: 'residentiel_prive', label: 'Résidentiel privé' },
  { value: 'diplomatique', label: 'Diplomatique' },
  { value: 'autre', label: 'Autre' },
]

const CURRENCY_OPTIONS = [
  { value: 'TND', label: 'TND — Dinar tunisien' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'OMR', label: 'OMR — Rial omanais' },
  { value: 'XOF', label: 'XOF — Franc CFA' },
  { value: 'QAR', label: 'QAR — Riyal qatari' },
  { value: 'LYD', label: 'LYD — Dinar libyen' },
  { value: 'USD', label: 'USD — Dollar américain' },
]

export function Step1Basic({ form }: { form: UseFormReturn<WizardFormValues> }) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label="Nom du projet" error={errors.name?.message} required>
            <input {...register('name')} className={inputClass} style={inputStyle} placeholder="Villa Méditerranée — La Marsa" />
          </Field>
        </div>

        <Field label="Type de projet" error={errors.projectType?.message} required>
          <select {...register('projectType')} className={inputClass} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            {PROJECT_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Pays" error={errors.country?.message} required>
          <input {...register('country')} className={inputClass} style={inputStyle} placeholder="TN" maxLength={2} />
        </Field>

        <Field label="Devise" error={errors.currency?.message}>
          <select {...register('currency')} className={inputClass} style={inputStyle}>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Secteur client" error={errors.clientSector?.message}>
          <select {...register('clientSector')} className={inputClass} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            {SECTOR_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Nom du client" error={errors.clientName?.message} required>
            <input {...register('clientName')} className={inputClass} style={inputStyle} placeholder="M. Ahmed Ben Salah" />
          </Field>
        </div>

        <Field label="Email du client" error={errors.clientEmail?.message}>
          <input {...register('clientEmail')} type="email" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="Téléphone" error={errors.clientPhone?.message}>
          <input {...register('clientPhone')} className={inputClass} style={inputStyle} placeholder="+216 XX XXX XXX" />
        </Field>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('clientAnonymized')}
              className="mt-0.5 rounded"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>Anonymiser le nom du client</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                Le nom du client sera remplacé par des initiales dans tous les exports et vues liste.
              </p>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Field label="Adresse du site" error={errors.siteAddress?.message} required>
            <input {...register('siteAddress')} className={inputClass} style={inputStyle} placeholder="12 rue des Jasmins, La Marsa, Tunis" />
          </Field>
        </div>
      </div>
    </div>
  )
}
