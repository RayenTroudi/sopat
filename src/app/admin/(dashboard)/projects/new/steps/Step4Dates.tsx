'use client'

import { UseFormReturn } from 'react-hook-form'
import type { WizardFormValues } from '../NewProjectForm'

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = { background: 'var(--admin-surface)', borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-[#2F6F4F]">{error}</p>}
    </div>
  )
}

export function Step4Dates({ form }: { form: UseFormReturn<WizardFormValues> }) {
  const { register, formState: { errors } } = form
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date de début" error={errors.startDate?.message}>
          <input {...register('startDate')} type="date" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Livraison estimée" error={errors.estimatedDeliveryDate?.message}>
          <input {...register('estimatedDeliveryDate')} type="date" className={inputClass} style={inputStyle} />
        </Field>
      </div>
      <Field label="Notes internes" error={errors.notes?.message}>
        <textarea {...register('notes')} rows={3} className={inputClass} style={inputStyle} placeholder="Informations complémentaires…" />
      </Field>
    </div>
  )
}
