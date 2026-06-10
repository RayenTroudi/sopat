'use client'

import { UseFormReturn, useWatch } from 'react-hook-form'
import { ZoneBuilder } from '@/components/projects/ZoneBuilder'
import type { WizardFormValues } from '../NewProjectForm'

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

export function Step2TypeFields({ form }: { form: UseFormReturn<WizardFormValues> }) {
  const { register, formState: { errors }, control, setValue, watch } = form
  const projectType = useWatch({ control, name: 'projectType' })
  const zones = watch('zones') ?? []

  if (!projectType) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
        Sélectionnez un type de projet à l'étape précédente.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {projectType === 'ingenierie_territoriale' && (
        <>
          <Field label="Nom de la municipalité / institution" error={errors.municipalityClient?.message} required>
            <input {...register('municipalityClient')} className={inputClass} style={inputStyle} placeholder="Municipalité de Sfax" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de communes" error={errors.numberOfMunicipalities?.message}>
              <input {...register('numberOfMunicipalities', { valueAsNumber: true })} type="number" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Superficie du territoire (km²)" error={errors.territorySurfaceKm2?.message}>
              <input {...register('territorySurfaceKm2')} type="number" step="0.0001" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Livrables types (indicatif)</p>
          <div className="space-y-1.5 pl-1">
            {['Diagnostic territorial', 'Identification des carences', 'Plan de masse', 'Ratio espaces verts/habitant', 'Rapport final'].map((item) => (
              <p key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                <span className="text-xs">•</span>
                {item}
              </p>
            ))}
          </div>
        </>
      )}

      {projectType === 'espace_public' && (
        <>
          <Field label="Commune / maître d'ouvrage" error={errors.municipalityClient?.message} required>
            <input {...register('municipalityClient')} className={inputClass} style={inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Surface du site (m²)" error={errors.siteAreaM2?.message}>
              <input {...register('siteAreaM2')} type="number" step="0.01" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Linéaire (m)" error={errors.linearMeters?.message}>
              <input {...register('linearMeters')} type="number" step="0.01" className={inputClass} style={inputStyle} placeholder="Boulevard" />
            </Field>
          </div>
          <Field label="Zones du projet">
            <ZoneBuilder value={zones} onChange={(z) => setValue('zones', z)} />
          </Field>
        </>
      )}

      {projectType === 'siege_social' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre d'étages" error={errors.floorCount?.message}>
              <input {...register('floorCount', { valueAsNumber: true })} type="number" className={inputClass} style={inputStyle} />
            </Field>
            <Field label="Surface du site (m²)" error={errors.siteAreaM2?.message}>
              <input {...register('siteAreaM2')} type="number" step="0.01" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <div
            className="rounded-lg border p-3 text-sm"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
          >
            ℹ️ Précisez les services inclus (extérieur, intérieur, rooftop, parking) dans la description du concept (étape 3).
          </div>
          <Field label="Zones par étage">
            <ZoneBuilder value={zones} onChange={(z) => setValue('zones', z)} showFloor />
          </Field>
        </>
      )}

      {projectType === 'hotelier_touristique' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Surface du site (m²)" error={errors.siteAreaM2?.message}>
              <input {...register('siteAreaM2')} type="number" step="0.01" className={inputClass} style={inputStyle} />
            </Field>
            <div
              className="rounded-lg border p-3 text-sm"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
            >
              ℹ️ Le classement étoiles peut être précisé dans la description du concept (étape 3).
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--admin-text)' }}>
            <input type="checkbox" {...register('lightingIncluded')} className="rounded" />
            Éclairage inclus dans la prestation
          </label>
          <Field label="Zones hôtelières">
            <ZoneBuilder value={zones} onChange={(z) => setValue('zones', z)} />
          </Field>
        </>
      )}

      {projectType === 'residentiel' && (
        <>
          <Field label="Surface du site (m²)" error={errors.siteAreaM2?.message} required>
            <input {...register('siteAreaM2')} type="number" step="0.01" className={inputClass} style={inputStyle} />
          </Field>
          <div
            className="rounded-lg border p-3 text-sm"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
          >
            ℹ️ Si le client souhaite rester anonyme, activez l'option à l'étape précédente.
          </div>
        </>
      )}

      {projectType === 'interieur' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type de bâtiment">
              <select className={inputClass} style={inputStyle} {...register('municipalityClient')}>
                <option value="">—</option>
                {['Siège social', 'Hôtel', 'Résidence', 'Commerce', 'Autre'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Nombre d'étages" error={errors.floorCount?.message}>
              <input {...register('floorCount', { valueAsNumber: true })} type="number" className={inputClass} style={inputStyle} />
            </Field>
          </div>
          <Field label="Estimation pots (total)" error={errors.numberOfMunicipalities?.message}>
            <input {...register('numberOfMunicipalities', { valueAsNumber: true })} type="number" className={inputClass} style={inputStyle} placeholder="120" />
          </Field>
          <div
            className="rounded-lg border p-3 text-sm"
            style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)', color: 'var(--admin-text-muted)' }}
          >
            ℹ️ La fréquence d'entretien et autres détails opérationnels peuvent être précisés dans les notes (étape 4).
          </div>
        </>
      )}
    </div>
  )
}
