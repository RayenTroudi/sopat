'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import type { ClientRow } from '@/lib/db/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CLIENT_TYPE_OPTIONS, POTENTIAL_OPTIONS } from '@/lib/clients/options'

/**
 * Édition du profil client, sur place.
 *
 * Le même enregistrement était jusqu'ici modifié depuis une page séparée
 * (`/clients/[id]/edit`). Deux surfaces d'écriture pour une même entité finissent
 * toujours par diverger — un champ ajouté ici, oublié là — donc celle-ci est
 * désormais la seule, et la route `/edit` renvoie vers elle.
 */

const NONE = '__none__'

const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--admin-border-light)] transition'
const inputSt = {
  background: 'var(--admin-bg)',
  borderColor: 'var(--admin-border)',
  color: 'var(--admin-text)',
}

function Field({
  label,
  error,
  required,
  wide,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5${wide ? ' sm:col-span-2' : ''}`}>
      <label className="block text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: 'var(--admin-emerald)' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: 'var(--admin-red)' }}>{error}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

type Values = {
  companyName: string
  displayName: string
  clientType: string
  sectorFreeText: string
  clientPotential: string
  country: string
  city: string
  address: string
  primaryContactName: string
  primaryContactTitle: string
  primaryContactEmail: string
  primaryContactPhone: string
  secondaryContactName: string
  secondaryContactEmail: string
  isFeatured: boolean
  notes: string
}

function initialise(client: ClientRow): Values {
  return {
    companyName: client.companyName ?? '',
    displayName: client.displayName ?? '',
    clientType: client.clientType ?? 'autre',
    sectorFreeText: client.sectorFreeText ?? '',
    clientPotential: client.clientPotential ?? '',
    country: client.country ?? 'TN',
    city: client.city ?? '',
    address: client.address ?? '',
    primaryContactName: client.primaryContactName ?? '',
    primaryContactTitle: client.primaryContactTitle ?? '',
    primaryContactEmail: client.primaryContactEmail ?? '',
    primaryContactPhone: client.primaryContactPhone ?? '',
    secondaryContactName: client.secondaryContactName ?? '',
    secondaryContactEmail: client.secondaryContactEmail ?? '',
    isFeatured: client.isFeatured ?? false,
    notes: client.notes ?? '',
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ClientProfileForm({
  client,
  canToggleFeatured,
  onDone,
}: {
  client: ClientRow
  canToggleFeatured: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(() => initialise(client))
  const [logoId, setLogoId] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(client.logoUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    setServerError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('assetType', 'other')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json()
      setLogoId(data.id)
      setLogoPreview(data.secureUrl)
    } else {
      setServerError("Le logo n'a pas pu être envoyé.")
    }
    setUploading(false)
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Values, string>> = {}
    if (!values.companyName.trim()) next.companyName = 'Requis'
    if (!values.displayName.trim()) next.displayName = 'Requis'
    if (values.country.trim().length !== 2) next.country = 'Code pays sur 2 lettres (ex. TN)'
    if (values.primaryContactEmail && !EMAIL_RE.test(values.primaryContactEmail))
      next.primaryContactEmail = 'Email invalide'
    if (values.secondaryContactEmail && !EMAIL_RE.test(values.secondaryContactEmail))
      next.secondaryContactEmail = 'Email invalide'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    setServerError(null)

    const res = await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: values.companyName.trim(),
        displayName: values.displayName.trim(),
        clientType: values.clientType,
        sectorFreeText: values.sectorFreeText.trim(),
        clientPotential: values.clientPotential,
        country: values.country.trim().toUpperCase(),
        city: values.city.trim(),
        address: values.address.trim(),
        primaryContactName: values.primaryContactName.trim(),
        primaryContactTitle: values.primaryContactTitle.trim(),
        primaryContactEmail: values.primaryContactEmail.trim(),
        primaryContactPhone: values.primaryContactPhone.trim(),
        secondaryContactName: values.secondaryContactName.trim(),
        secondaryContactEmail: values.secondaryContactEmail.trim(),
        // Le logo n'est transmis que s'il a été remplacé : l'omettre laisse
        // l'image existante en place.
        ...(logoId && { logoCloudinaryId: logoId }),
        // Un client résidentiel privé ne peut pas être en vedette : basculer le
        // type retire la mise en avant, sinon le serveur refuserait l'ensemble
        // de l'enregistrement pour cette seule raison.
        ...(canToggleFeatured && {
          isFeatured: values.isFeatured && values.clientType !== 'residentiel_prive',
        }),
        notes: values.notes.trim(),
      }),
    })

    if (!res.ok) {
      // Le message du serveur porte la vraie raison (rôle, règle « vedette »,
      // validation) : l'afficher plutôt qu'un échec muet.
      const body = await res.text()
      let message = `Échec de l'enregistrement (${res.status}).`
      try {
        const parsed = JSON.parse(body) as { error?: string }
        if (parsed.error) message = parsed.error
      } catch {
        /* réponse non-JSON : on garde le message générique */
      }
      setServerError(message)
      setSaving(false)
      return
    }

    router.refresh()
    setSaving(false)
    onDone()
  }

  const featuredBlocked = values.clientType === 'residentiel_prive'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Identité">
          <Field label="Raison sociale" error={errors.companyName} required wide>
            <input
              value={values.companyName}
              onChange={(e) => set('companyName', e.target.value)}
              className={inputCls}
              style={inputSt}
              autoFocus
            />
          </Field>
          <Field label="Nom d'affichage" error={errors.displayName} required wide>
            <input
              value={values.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              className={inputCls}
              style={inputSt}
              placeholder="Nom court pour les listes"
            />
          </Field>
          <Field label="Type de client">
            <Select value={values.clientType} onValueChange={(v) => set('clientType', v)}>
              <SelectTrigger style={inputSt}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={inputSt}>
                {CLIENT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Potentiel client">
            <Select
              value={values.clientPotential || NONE}
              onValueChange={(v) => set('clientPotential', v === NONE ? '' : v)}
            >
              <SelectTrigger style={inputSt}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent style={inputSt}>
                <SelectItem value={NONE}>— Non renseigné</SelectItem>
                {POTENTIAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Secteur" wide>
            <input
              value={values.sectorFreeText}
              onChange={(e) => set('sectorFreeText', e.target.value)}
              className={inputCls}
              style={inputSt}
              placeholder="Ex : Hôtellerie, Banque, Santé…"
            />
          </Field>
          <Field label="Pays" error={errors.country} required>
            <input
              value={values.country}
              onChange={(e) => set('country', e.target.value.toUpperCase())}
              className={inputCls}
              style={inputSt}
              maxLength={2}
              placeholder="TN"
            />
          </Field>
          <Field label="Ville">
            <input
              value={values.city}
              onChange={(e) => set('city', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
          <Field label="Adresse" wide>
            <textarea
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
              rows={2}
              className={inputCls}
              style={inputSt}
            />
          </Field>
        </Card>

        <Card title="Contacts">
          <Field label="Contact principal" wide>
            <input
              value={values.primaryContactName}
              onChange={(e) => set('primaryContactName', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
          <Field label="Titre / Fonction" wide>
            <input
              value={values.primaryContactTitle}
              onChange={(e) => set('primaryContactTitle', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
          <Field label="Email" error={errors.primaryContactEmail}>
            <input
              type="email"
              value={values.primaryContactEmail}
              onChange={(e) => set('primaryContactEmail', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
          <Field label="Téléphone">
            <input
              value={values.primaryContactPhone}
              onChange={(e) => set('primaryContactPhone', e.target.value)}
              className={inputCls}
              style={inputSt}
              placeholder="+216 XX XXX XXX"
            />
          </Field>
          <Field label="Contact secondaire">
            <input
              value={values.secondaryContactName}
              onChange={(e) => set('secondaryContactName', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
          <Field label="Email secondaire" error={errors.secondaryContactEmail}>
            <input
              type="email"
              value={values.secondaryContactEmail}
              onChange={(e) => set('secondaryContactEmail', e.target.value)}
              className={inputCls}
              style={inputSt}
            />
          </Field>
        </Card>
      </div>

      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-surface)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-muted)' }}>
          Logo & options
        </p>

        <div className="flex items-center gap-4">
          {logoPreview && (
            <img
              src={logoPreview}
              alt=""
              className="w-14 h-14 rounded-lg object-contain border shrink-0"
              style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
            />
          )}
          <label
            className="cursor-pointer text-[13px] px-3.5 py-2 rounded-lg border transition-colors hover:bg-[var(--admin-bg)]"
            style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
          >
            {uploading ? 'Envoi…' : logoPreview ? 'Remplacer le logo' : 'Choisir une image'}
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

        {canToggleFeatured && !featuredBlocked && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
              Mettre en vedette (section « Ils nous font confiance »)
            </span>
          </label>
        )}
        {canToggleFeatured && featuredBlocked && (
          <p className="text-[12px]" style={{ color: 'var(--admin-text-muted)' }}>
            Un client résidentiel privé ne peut pas être mis en vedette.
          </p>
        )}

        <Field label="Notes internes">
          <textarea
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className={inputCls}
            style={inputSt}
          />
        </Field>
      </div>

      {serverError && (
        <p
          className="text-[13px] px-3 py-2 rounded-lg border"
          style={{ color: 'var(--admin-red)', borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}
        >
          {serverError}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || uploading}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
          style={{ background: 'var(--admin-emerald)' }}
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-[13px] px-3.5 py-2 rounded-lg border transition-colors hover:bg-[var(--admin-bg)] disabled:opacity-50"
          style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}
        >
          <X className="w-3.5 h-3.5" />
          Annuler
        </button>
      </div>
    </div>
  )
}
