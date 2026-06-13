'use client'
import { useState } from 'react'
import type { PortfolioSettings } from '@/lib/portfolio/types'

const TEXT_FIELDS: Array<[keyof PortfolioSettings, string]> = [
  ['companyTagline', 'Tagline (Mission & Vision)'],
  ['ceoName', 'Nom du PDG'],
  ['ceoTitle', 'Titre du PDG'],
  ['companyAddress', 'Adresse'],
  ['phone1', 'Téléphone 1'],
  ['phone2', 'Téléphone 2'],
  ['email', 'Email'],
  ['website', 'Site web'],
  ['facebookUrl', 'Facebook'],
  ['instagramHandle', 'Instagram (@)'],
  ['isoCertNumber', 'Numéro ISO 9001'],
  ['rseLabelLevel', 'Niveau Label RSE'],
]

export function PortfolioSettingsForm({ initial }: { initial: PortfolioSettings }) {
  const [v, setV] = useState<PortfolioSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/portfolio/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    })
    setSaving(false)
    setMsg(res.ok ? 'Enregistré.' : 'Erreur')
  }

  return (
    <form
      className="space-y-3 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {TEXT_FIELDS.map(([key, label]) => (
        <label key={key as string} className="block">
          <span className="text-sm">{label}</span>
          <input
            className="w-full border rounded px-2 py-1"
            value={(v[key] as string | null) ?? ''}
            onChange={(e) => setV({ ...v, [key]: e.target.value })}
          />
        </label>
      ))}
      <div className="flex gap-4 items-center">
        <label>
          <span className="text-sm block">Couleur de couverture</span>
          <input
            type="color"
            value={v.coverBackgroundColor}
            onChange={(e) => setV({ ...v, coverBackgroundColor: e.target.value })}
          />
        </label>
        <label>
          <span className="text-sm block">Couleur d&apos;accent</span>
          <input
            type="color"
            value={v.accentColor}
            onChange={(e) => setV({ ...v, accentColor: e.target.value })}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  )
}
