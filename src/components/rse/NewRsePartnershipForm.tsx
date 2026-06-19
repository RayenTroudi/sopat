'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TeamMemberRow } from '@/lib/db/team'

const schema = z.object({
  partnerName: z.string().min(1, 'Nom du partenaire requis'),
  partnerAddress: z.string().optional(),
  partnerContactName: z.string().optional(),
  partnerContactEmail: z.string().email('Email invalide').or(z.literal('')).optional(),
  partnerContactPhone: z.string().optional(),
  sopatReferentId: z.string().uuid('Référent SOPAT requis'),
  partnerReferentName: z.string().optional(),
  signedDate: z.string().optional(),
  startDate: z.string().optional(),
  autoRenewal: z.boolean().optional(),
  noticePeriodDays: z.string().optional(),
  status: z.enum(['actif', 'expire', 'resilie', 'en_cours_de_negociation'] as const).optional(),
  notes: z.string().optional(),
  teamName: z.enum(['equipe_sd_pat', 'equipe_convention'] as const).optional(),
  teamLeadName: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TEAM_OPTIONS = [
  { value: 'equipe_sd_pat', label: 'Équipe SD Pat' },
  { value: 'equipe_convention', label: 'Équipe Convention' },
]

const STATUS_OPTIONS = [
  { value: 'en_cours_de_negociation', label: 'En cours de négociation' },
  { value: 'actif', label: 'Actif' },
  { value: 'resilie', label: 'Résilié' },
  { value: 'expire', label: 'Expiré' },
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
      </div>
      <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

const inputClass = 'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green/20 transition'
const inputStyle = {
  background: 'var(--admin-surface)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

export function NewRsePartnershipForm({
  users,
  currentUserId,
}: {
  users: TeamMemberRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sopatReferentId: currentUserId,
      status: 'en_cours_de_negociation',
      noticePeriodDays: '60',
      autoRenewal: false,
      teamLeadName: 'Mohamed Mrabet',
    },
  })

  async function onSubmit(values: FormValues) {
    const body: Record<string, unknown> = { ...values }
    body.partnerType = 'autre'
    if (values.signedDate) body.signedDate = new Date(values.signedDate).toISOString()
    if (values.startDate) body.startDate = new Date(values.startDate).toISOString()
    if (values.noticePeriodDays) body.noticePeriodDays = Number(values.noticePeriodDays)

    const res = await fetch('/api/rse/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError('root', { message: data.error ?? 'Erreur serveur' })
      return
    }

    const partnership = await res.json()
    router.push(`/admin/rse/partnerships/${partnership.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card title="Informations partenaire">
        <Field label="Nom du partenaire" required error={errors.partnerName?.message}>
          <input
            {...register('partnerName')}
            className={inputClass}
            style={inputStyle}
            placeholder="Ex: Hôtel Medina Bellevue"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Adresse du partenaire" error={errors.partnerAddress?.message}>
            <textarea
              {...register('partnerAddress')}
              rows={2}
              className={inputClass}
              style={inputStyle}
              placeholder="Adresse complète"
            />
          </Field>
        </div>

        <Field label="Nom du contact partenaire" error={errors.partnerContactName?.message}>
          <input
            {...register('partnerContactName')}
            className={inputClass}
            style={inputStyle}
            placeholder="Nom du référent chez le partenaire"
          />
        </Field>

        <Field label="Référent convention (partenaire)" error={errors.partnerReferentName?.message}>
          <input
            {...register('partnerReferentName')}
            className={inputClass}
            style={inputStyle}
            placeholder="Signataire de la convention"
          />
        </Field>

        <Field label="Email du contact" error={errors.partnerContactEmail?.message}>
          <input
            {...register('partnerContactEmail')}
            type="email"
            className={inputClass}
            style={inputStyle}
            placeholder="contact@partenaire.tn"
          />
        </Field>

        <Field label="Téléphone du contact" error={errors.partnerContactPhone?.message}>
          <input
            {...register('partnerContactPhone')}
            className={inputClass}
            style={inputStyle}
            placeholder="+216 XX XXX XXX"
          />
        </Field>
      </Card>

      <Card title="Convention">
        <Field label="Référent SOPAT" required error={errors.sopatReferentId?.message}>
          <select {...register('sopatReferentId')} className={inputClass} style={inputStyle}>
            <option value="">Sélectionner un référent...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Statut initial" error={errors.status?.message}>
          <select {...register('status')} className={inputClass} style={inputStyle}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Date de signature" error={errors.signedDate?.message}>
          <input {...register('signedDate')} type="date" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="Date de début" error={errors.startDate?.message}>
          <input {...register('startDate')} type="date" className={inputClass} style={inputStyle} />
        </Field>

        <Field label="Préavis (jours)" error={errors.noticePeriodDays?.message}>
          <input
            {...register('noticePeriodDays')}
            type="number"
            min={0}
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="sm:col-span-2 flex items-center gap-3">
          <input
            {...register('autoRenewal')}
            type="checkbox"
            id="autoRenewal"
            className="w-4 h-4 rounded"
          />
          <label htmlFor="autoRenewal" className="text-sm" style={{ color: 'var(--admin-text)' }}>
            Renouvellement automatique
          </label>
        </div>

        <Field label="Nom de l'équipe" error={errors.teamName?.message}>
          <select {...register('teamName')} className={inputClass} style={inputStyle}>
            <option value="">Sélectionner une équipe...</option>
            {TEAM_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Chef d'équipe" error={errors.teamLeadName?.message}>
          <input
            {...register('teamLeadName')}
            className={inputClass}
            style={inputStyle}
            placeholder="Nom du chef d'équipe"
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Notes" error={errors.notes?.message}>
            <textarea
              {...register('notes')}
              rows={3}
              className={inputClass}
              style={inputStyle}
              placeholder="Remarques sur la convention..."
            />
          </Field>
        </div>
      </Card>

      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--admin-border)',
            color: 'var(--admin-text-muted)',
            background: 'var(--admin-surface)',
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity disabled:opacity-50"
          style={{ background: 'var(--admin-emerald)', color: '#fff' }}
        >
          {isSubmitting ? 'Création...' : 'Créer le partenariat'}
        </button>
      </div>
    </form>
  )
}
