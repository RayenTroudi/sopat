'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Step1Basic } from './steps/Step1Basic'
import { Step2TypeFields } from './steps/Step2TypeFields'
import { Step3Concept } from './steps/Step3Concept'
import { Step4Dates } from './steps/Step4Dates'

const wizardSchema = z.object({
  // Step 1
  name: z.string().min(1, 'Nom requis'),
  clientName: z.string().min(1, 'Nom du client requis'),
  clientEmail: z.string().email('Email invalide').or(z.literal('')).optional(),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(1, 'Adresse requise'),
  projectType: z.enum([
    'ingenierie_territoriale', 'espace_public', 'siege_social',
    'hotelier_touristique', 'residentiel', 'interieur',
  ], { message: 'Type requis' }),
  country: z.string().length(2).default('TN'),
  currency: z.enum(['TND', 'EUR', 'OMR', 'XOF', 'QAR', 'LYD', 'USD']).default('TND'),
  clientSector: z.enum([
    'banque', 'hotellerie', 'automobile',
    'institutionnel_public', 'institutionnel_prive',
    'residentiel_prive', 'diplomatique', 'autre',
  ]).optional(),
  clientAnonymized: z.boolean().default(false),
  // Step 2 (type-specific)
  siteAreaM2: z.string().optional(),
  linearMeters: z.string().optional(),
  floorCount: z.number().int().positive().optional(),
  municipalityClient: z.string().optional(),
  territorySurfaceKm2: z.string().optional(),
  numberOfMunicipalities: z.number().int().positive().optional(),
  lightingIncluded: z.boolean().default(false),
  zones: z.array(z.object({
    zoneName: z.string().min(1),
    zoneType: z.string().default('autre'),
    floorNumber: z.number().int().optional(),
    surfaceM2: z.string().optional(),
    plantPaletteNotes: z.string().optional(),
    lightingNotes: z.string().optional(),
  })).default([]),
  // Step 3
  conceptTitle: z.string().optional(),
  conceptDescription: z.string().optional(),
  designVocabulary: z.array(z.string()).default([]),
  plantPalettePhilosophy: z.array(z.string()).default([]),
  // Step 4
  startDate: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

export type WizardFormValues = z.infer<typeof wizardSchema>

const STEPS = [
  { label: 'Informations de base', number: 1 },
  { label: 'Détails du projet', number: 2 },
  { label: 'Concept & design', number: 3 },
  { label: 'Dates & équipe', number: 4 },
]

export function NewProjectForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      country: 'TN',
      currency: 'TND',
      clientAnonymized: false,
      lightingIncluded: false,
      zones: [],
      designVocabulary: [],
      plantPalettePhilosophy: [],
    },
  })

  const { handleSubmit, formState: { errors, isSubmitting }, setError } = form

  async function onSubmit(values: WizardFormValues) {
    const { zones, ...projectData } = values
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    })
    if (!res.ok) {
      const data = await res.json()
      setError('root', { message: data.error ?? 'Erreur serveur' })
      return
    }
    const project = await res.json()

    if (zones.length > 0) {
      const zonesRes = await fetch(`/api/projects/${project.id}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones }),
      })
      if (!zonesRes.ok) {
        setError('root', { message: 'Projet créé mais erreur lors de la sauvegarde des zones.' })
        router.push(`/admin/projects/${project.id}`)
        router.refresh()
        return
      }
    }

    router.push(`/admin/projects/${project.id}`)
    router.refresh()
  }

  const stepTitles = ['Informations de base', 'Détails du projet', 'Concept & design', 'Dates & équipe']

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
              style={{
                background: step >= s.number ? 'var(--green)' : 'var(--admin-surface)',
                color: step >= s.number ? '#fff' : 'var(--admin-text-muted)',
                border: step === s.number ? '2px solid var(--green)' : '1px solid var(--admin-border)',
              }}
            >
              {s.number}
            </div>
            <span className="text-xs hidden sm:inline" style={{ color: step === s.number ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px mx-1" style={{ background: 'var(--admin-border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Étape {step} — {stepTitles[step - 1]}
        </h2>

        {step === 1 && <Step1Basic form={form as UseFormReturn<WizardFormValues>} />}
        {step === 2 && <Step2TypeFields form={form as UseFormReturn<WizardFormValues>} />}
        {step === 3 && <Step3Concept form={form as UseFormReturn<WizardFormValues>} />}
        {step === 4 && <Step4Dates form={form as UseFormReturn<WizardFormValues>} />}
      </div>

      {errors.root && (
        <p className="text-sm text-red-500 px-1">{errors.root.message}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-sm px-4 py-2.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            ← Précédent
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={async () => {
              const stepFields: Record<number, (keyof WizardFormValues)[]> = {
                1: ['name', 'clientName', 'projectType', 'siteAddress'],
                2: [],
                3: [],
              }
              const fields = stepFields[step] ?? []
              const valid = fields.length === 0 || await form.trigger(fields)
              if (valid) setStep(step + 1)
            }}
            className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
            style={{ background: 'var(--green)' }}
          >
            Suivant →
          </button>
        ) : (
          <button
            type="button"
            onClick={(form as UseFormReturn<WizardFormValues>).handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="text-sm font-medium px-5 py-2.5 rounded-lg text-white disabled:opacity-50 transition-colors"
            style={{ background: 'var(--green)' }}
          >
            {isSubmitting ? 'Création…' : 'Créer le projet'}
          </button>
        )}

        <a
          href="/admin/projects"
          className="text-sm px-4 py-2.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </a>
      </div>
    </div>
  )
}
