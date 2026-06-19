'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  companyName: z.string().min(1, 'Requis'),
  displayName: z.string().min(1, 'Requis'),
  clientType: z.enum([
    'banque', 'hotellerie', 'automobile',
    'institutionnel_public', 'institutionnel_prive',
    'residentiel_prive', 'diplomatique', 'autre',
  ]).optional().default('autre'),
  sectorFreeText: z.string().optional(),
  clientPotential: z.enum(['fort_potentiel', 'faible_potentiel', 'neutre']).optional(),
  country: z.string().length(2).default('TN'),
  city: z.string().optional(),
  address: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactTitle: z.string().optional(),
  primaryContactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  logoCloudinaryId: z.string().uuid().optional(),
  isFeatured: z.boolean().default(false),
  notes: z.string().optional(),
})

export type ClientFormValues = z.infer<typeof schema>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

const TYPE_OPTIONS = [
  { value: 'banque', label: 'Banque' },
  { value: 'hotellerie', label: 'Hôtellerie' },
  { value: 'automobile', label: 'Automobile' },
  { value: 'institutionnel_public', label: 'Institutionnel public' },
  { value: 'institutionnel_prive', label: 'Institutionnel privé' },
  { value: 'residentiel_prive', label: 'Résidentiel privé' },
  { value: 'diplomatique', label: 'Diplomatique' },
  { value: 'autre', label: 'Autre' },
]

type ClientFormProps = {
  initialValues?: Partial<ClientFormValues>
  clientId?: string
  canToggleFeatured: boolean
}

export function ClientForm({ initialValues, clientId, canToggleFeatured }: ClientFormProps) {
  const router = useRouter()
  const isEdit = !!clientId
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      country: 'TN',
      isFeatured: false,
      clientType: 'autre',
      ...initialValues,
    },
  })

  const clientType = watch('clientType')

  async function uploadLogo(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('assetType', 'other')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      setValue('logoCloudinaryId', data.id)
      setLogoPreview(data.secureUrl)
    }
    setUploading(false)
  }

  async function onSubmit(values: ClientFormValues) {
    const url = isEdit ? `/api/clients/${clientId}` : '/api/clients'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) return
    if (isEdit) {
      router.push(`/admin/clients/${clientId}`)
    } else {
      const data = await res.json()
      router.push(`/admin/clients/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <Section title="Identité">
        <div className="sm:col-span-2">
          <Field label="Raison sociale" error={errors.companyName?.message} required>
            <input {...register('companyName')} className={inputClass} style={inputStyle} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Nom d'affichage" error={errors.displayName?.message} required>
            <input
              {...register('displayName')}
              className={inputClass}
              style={inputStyle}
              placeholder="Nom court pour les listes"
            />
          </Field>
        </div>
        <Field label="Secteur">
          <input
            {...register('sectorFreeText')}
            className={inputClass}
            style={inputStyle}
            placeholder="Ex : Hôtellerie, Banque, Santé…"
          />
        </Field>

        <Field label="Potentiel client">
          <select {...register('clientPotential')} className={inputClass} style={inputStyle}>
            <option value="">-- Sélectionner --</option>
            <option value="fort_potentiel">À fort potentiel</option>
            <option value="faible_potentiel">À faible potentiel</option>
            <option value="neutre">Neutre</option>
          </select>
        </Field>
        <Field label="Pays" error={errors.country?.message} required>
          <input {...register('country')} className={inputClass} style={inputStyle} maxLength={2} placeholder="TN" />
        </Field>
        <Field label="Ville" error={errors.city?.message}>
          <input {...register('city')} className={inputClass} style={inputStyle} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Adresse" error={errors.address?.message}>
            <textarea {...register('address')} rows={2} className={inputClass} style={inputStyle} />
          </Field>
        </div>
      </Section>

      <Section title="Contact principal">
        <Field label="Nom" error={errors.primaryContactName?.message}>
          <input {...register('primaryContactName')} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Titre / Fonction" error={errors.primaryContactTitle?.message}>
          <input {...register('primaryContactTitle')} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Email" error={errors.primaryContactEmail?.message}>
          <input {...register('primaryContactEmail')} type="email" className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Téléphone" error={errors.primaryContactPhone?.message}>
          <input
            {...register('primaryContactPhone')}
            className={inputClass}
            style={inputStyle}
            placeholder="+216 XX XXX XXX"
          />
        </Field>
      </Section>

      <Section title="Contact secondaire">
        <Field label="Nom" error={errors.secondaryContactName?.message}>
          <input {...register('secondaryContactName')} className={inputClass} style={inputStyle} />
        </Field>
        <Field label="Email" error={errors.secondaryContactEmail?.message}>
          <input {...register('secondaryContactEmail')} type="email" className={inputClass} style={inputStyle} />
        </Field>
      </Section>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
          Logo
        </h3>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo"
              className="w-16 h-16 rounded-lg object-contain border"
              style={{ borderColor: 'var(--admin-border)' }}
            />
          )}
          <label
            className="cursor-pointer text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            {uploading ? 'Envoi…' : 'Choisir une image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) uploadLogo(e.target.files[0])
              }}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
          Options
        </h3>
        {canToggleFeatured && clientType !== 'residentiel_prive' && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('isFeatured')} className="rounded" />
            <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Mettre en vedette (section &quot;Ils nous font confiance&quot;)
            </span>
          </label>
        )}
        <Field label="Notes internes" error={errors.notes?.message}>
          <textarea {...register('notes')} rows={3} className={inputClass} style={inputStyle} />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="text-sm font-medium px-5 py-2.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'var(--green)' }}
        >
          {isSubmitting
            ? 'Enregistrement…'
            : isEdit
            ? 'Enregistrer les modifications'
            : 'Créer le client'}
        </button>
        <a
          href={isEdit ? `/admin/clients/${clientId}` : '/admin/clients'}
          className="text-sm px-4 py-2.5 rounded-lg border"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          Annuler
        </a>
      </div>
    </form>
  )
}
