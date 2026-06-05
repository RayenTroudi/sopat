'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  clientName: z.string().min(1, 'Nom du client requis'),
  clientEmail: z.string().email('Email invalide').or(z.literal('')).optional(),
  clientPhone: z.string().optional(),
  siteAddress: z.string().min(1, 'Adresse du site requise'),
  siteAreaM2: z.string().optional(),
  projectType: z.enum(['residential', 'commercial', 'public'] as const, { error: 'Type requis' }),
  startDate: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const PROJECT_TYPES = [
  { value: 'residential', label: 'Résidentiel' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'public', label: 'Public' },
]

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
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

const inputClass =
  'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

export function NewProjectForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const data = await res.json()
      setError('root', { message: data.error ?? 'Erreur serveur' })
      return
    }
    const project = await res.json()
    router.push(`/admin/projects/${project.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card title="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nom du projet" error={errors.name?.message} required>
              <input {...register('name')} className={inputClass} style={inputStyle} placeholder="Villa Méditerranée — Tunis" />
            </Field>
          </div>
          <Field label="Type de projet" error={errors.projectType?.message} required>
            <select {...register('projectType')} className={inputClass} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Surface du site (m²)" error={errors.siteAreaM2?.message}>
            <input {...register('siteAreaM2')} type="number" step="0.01" className={inputClass} style={inputStyle} placeholder="450" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Adresse du site" error={errors.siteAddress?.message} required>
              <input {...register('siteAddress')} className={inputClass} style={inputStyle} placeholder="12 rue des Jasmins, La Marsa, Tunis" />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Client">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nom du client" error={errors.clientName?.message} required>
              <input {...register('clientName')} className={inputClass} style={inputStyle} placeholder="M. Ahmed Ben Salah" />
            </Field>
          </div>
          <Field label="Email du client" error={errors.clientEmail?.message}>
            <input {...register('clientEmail')} type="email" className={inputClass} style={inputStyle} placeholder="client@example.com" />
          </Field>
          <Field label="Téléphone du client" error={errors.clientPhone?.message}>
            <input {...register('clientPhone')} className={inputClass} style={inputStyle} placeholder="+216 XX XXX XXX" />
          </Field>
        </div>
      </Card>

      <Card title="Planification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de début" error={errors.startDate?.message}>
            <input {...register('startDate')} type="date" className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Livraison estimée" error={errors.estimatedDeliveryDate?.message}>
            <input {...register('estimatedDeliveryDate')} type="date" className={inputClass} style={inputStyle} />
          </Field>
        </div>
      </Card>

      <Card title="Notes">
        <Field label="Notes internes" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={3}
            className={inputClass}
            style={inputStyle}
            placeholder="Informations complémentaires…"
          />
        </Field>
      </Card>

      {errors.root && (
        <p className="text-sm text-red-500 px-1">{errors.root.message}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-sm font-medium px-5 py-2.5 rounded-lg text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--green)' }}
        >
          {isSubmitting ? 'Création…' : 'Créer le projet'}
        </button>
        <a
          href="/admin/projects"
          className="text-sm px-4 py-2.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </a>
      </div>
    </form>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
