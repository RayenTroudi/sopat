'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { WizardDraft } from '../EventWizard'

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  eventType: z.enum(['nettoyage_plage', 'plantation', 'sensibilisation', 'team_building', 'journee_environnement', 'autre'], { error: 'Type requis' }),
  date: z.string().min(1, 'Date requise'),
  location: z.string().min(1, 'Lieu requis'),
  partnerId: z.string().optional(),
  sopatCoordinatorId: z.string().min(1, 'Coordinateur requis'),
  participantCountPlanned: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function Step1General({
  draft,
  teamMembers,
  partnerships,
  onNext,
}: {
  draft: WizardDraft
  teamMembers: Array<{ id: string; name: string; role: string }>
  partnerships: Array<{ id: string; partnerName: string }>
  onNext: (data: Partial<WizardDraft>) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: draft.title ?? '',
      eventType: draft.eventType as FormValues['eventType'] ?? 'nettoyage_plage',
      date: draft.date ?? '',
      location: draft.location ?? '',
      partnerId: draft.partnerId ?? '',
      sopatCoordinatorId: draft.sopatCoordinatorId ?? '',
      participantCountPlanned: draft.participantCountPlanned ?? '',
      notes: draft.notes ?? '',
    },
  })

  function submit(values: FormValues) {
    onNext({
      ...values,
      partnerId: values.partnerId || null,
      participantCountPlanned: values.participantCountPlanned || undefined,
    })
  }

  const fieldStyle = {
    background: 'var(--admin-bg)',
    borderColor: 'var(--admin-border)',
    color: 'var(--admin-text)',
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <h2 className="font-semibold text-base" style={{ color: 'var(--admin-text)' }}>
        Étape 1 — Informations générales
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Titre *</label>
        <input
          {...register('title')}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={fieldStyle}
          placeholder="Ex: Journée nettoyage plage Hammamet"
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Type *</label>
          <select
            {...register('eventType')}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={fieldStyle}
          >
            <option value="nettoyage_plage">Nettoyage plage</option>
            <option value="plantation">Plantation</option>
            <option value="sensibilisation">Sensibilisation</option>
            <option value="team_building">Team building</option>
            <option value="journee_environnement">Journée environnement</option>
            <option value="autre">Autre</option>
          </select>
          {errors.eventType && <p className="text-xs text-red-500 mt-1">{errors.eventType.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Date *</label>
          <input
            type="datetime-local"
            {...register('date')}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={fieldStyle}
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Lieu *</label>
        <input
          {...register('location')}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={fieldStyle}
          placeholder="Ex: Plage de Hammamet"
        />
        {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Coordinateur SOPAT *</label>
          <select
            {...register('sopatCoordinatorId')}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={fieldStyle}
          >
            <option value="">Sélectionner…</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {errors.sopatCoordinatorId && <p className="text-xs text-red-500 mt-1">{errors.sopatCoordinatorId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Partenariat RSE</label>
          <select
            {...register('partnerId')}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={fieldStyle}
          >
            <option value="">Aucun</option>
            {partnerships.map((p) => (
              <option key={p.id} value={p.id}>{p.partnerName}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Participants prévus</label>
        <input
          type="number"
          {...register('participantCountPlanned')}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={fieldStyle}
          placeholder="Ex: 50"
          min={1}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--admin-text)' }}>Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={fieldStyle}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          Suivant →
        </button>
      </div>
    </form>
  )
}
