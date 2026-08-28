'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAiMeetingAction } from '@/lib/actions/ai-meetings'
import { detectPlatform } from '@/lib/meetings/validation'
import { MEETING_PLATFORMS, PLATFORM_LABELS } from '@/lib/recall/types'
import { BOT_DISPLAY_NAME } from '@/lib/meetings/bot-name'

/**
 * Création d'une réunion suivie par l'assistant IA.
 *
 * La plateforme est déduite de l'URL plutôt que laissée au choix : c'est le
 * lien qui détermine ce que le bot peut réellement rejoindre, et un formulaire
 * où l'on peut cocher « Zoom » pour une URL Teams ne produit que des échecs de
 * connexion incompréhensibles côté utilisateur.
 *
 * Le bandeau de consentement n'est pas décoratif : les participants doivent
 * savoir qu'un assistant identifié rejoint, enregistre et transcrit.
 */

const inputClass =
  'w-full px-3 py-2 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-border-light)]'
const inputStyle = {
  borderColor: 'var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
}
const labelClass = 'block text-[12px] font-medium mb-1'

export default function NewAiMeetingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meetingUrl, setMeetingUrl] = useState('')

  const platform = detectPlatform(meetingUrl)
  const urlTouched = meetingUrl.trim().length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!platform) {
      setError('URL non prise en charge — Google Meet, Zoom, Microsoft Teams ou Webex uniquement.')
      return
    }

    const fd = new FormData(e.currentTarget)
    const date = fd.get('scheduledDate') as string
    const time = fd.get('scheduledTime') as string
    if (!date || !time) {
      setError('Date et heure requises.')
      return
    }

    // Heure locale de l'utilisateur convertie en ISO avec décalage : le serveur
    // ne doit pas deviner le fuseau depuis une chaîne sans offset.
    const scheduled = new Date(`${date}T${time}`)
    if (Number.isNaN(scheduled.getTime())) {
      setError('Date ou heure invalide.')
      return
    }

    setLoading(true)
    const result = await createAiMeetingAction({
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      meetingUrl: meetingUrl.trim(),
      platform,
      scheduledAt: scheduled.toISOString(),
      participants: (fd.get('participants') as string) || undefined,
      autoJoin: fd.get('autoJoin') === 'on',
      sendEmailReport: fd.get('sendEmailReport') === 'on',
    })

    if (result.success) {
      router.push(`/admin/meetings/${result.id}`)
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/meetings/ai"
          className="text-[13px] hover:opacity-70 transition-opacity"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          ← Retour
        </Link>
      </div>

      <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--admin-text)' }}>
        Nouvelle réunion assistée
      </h1>
      <p className="text-xs mb-6" style={{ color: 'var(--admin-text-muted)' }}>
        L&apos;assistant rejoint la visioconférence, la transcrit, puis produit un compte rendu
        soumis à votre validation.
      </p>

      {/* Consentement — visible avant la saisie, pas en note de bas de page. */}
      <div
        className="rounded-xl border p-4 mb-6 text-[13px] leading-relaxed"
        style={{
          borderColor: 'var(--admin-border)',
          background: 'var(--admin-accent-dim)',
          color: 'var(--admin-text)',
        }}
      >
        <p className="font-medium mb-1">Enregistrement et transcription</p>
        <p style={{ color: 'var(--admin-text-muted)' }}>
          Un participant nommé <strong>{BOT_DISPLAY_NAME}</strong> rejoindra la réunion et sera
          visible de tous. La réunion sera enregistrée et transcrite, puis analysée automatiquement.
          Informez les participants avant le début de la séance et respectez les obligations de
          consentement applicables à votre plateforme et à votre juridiction.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg border p-3 mb-4 text-[13px]"
          style={{
            borderColor: 'var(--admin-red)',
            background: 'var(--admin-red-dim)',
            color: 'var(--admin-red)',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="title">
            Titre de la réunion *
          </label>
          <input id="title" name="title" required minLength={3} maxLength={255} className={inputClass} style={inputStyle} />
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="description">
            Description / ordre du jour
          </label>
          <textarea id="description" name="description" rows={3} className={inputClass} style={inputStyle} />
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="meetingUrl">
            Lien de la visioconférence *
          </label>
          <input
            id="meetingUrl"
            name="meetingUrl"
            required
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: platform ? 'var(--admin-emerald)' : 'var(--admin-text-muted)' }}>
            {platform
              ? `Plateforme détectée : ${PLATFORM_LABELS[platform]}`
              : urlTouched
                ? 'URL non prise en charge.'
                : `Plateformes prises en charge : ${MEETING_PLATFORMS.map((p) => PLATFORM_LABELS[p]).join(', ')}.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="scheduledDate">
              Date *
            </label>
            <input id="scheduledDate" name="scheduledDate" type="date" required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="scheduledTime">
              Heure *
            </label>
            <input id="scheduledTime" name="scheduledTime" type="time" required className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--admin-text-muted)' }} htmlFor="participants">
            Participants attendus
          </label>
          <textarea
            id="participants"
            name="participants"
            rows={2}
            placeholder="Un nom par ligne, ou séparés par des virgules"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--admin-text)' }}>
            <input type="checkbox" name="autoJoin" defaultChecked />
            L&apos;assistant rejoint automatiquement la réunion
          </label>
          <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--admin-text)' }}>
            <input type="checkbox" name="sendEmailReport" defaultChecked />
            M&apos;envoyer le compte rendu par e-mail
          </label>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="text-[13px] font-medium px-4 py-2 rounded transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--green)', color: 'var(--ivory)' }}
          >
            {loading ? 'Création…' : 'Programmer la réunion'}
          </button>
          <Link href="/admin/meetings/ai" className="text-[13px]" style={{ color: 'var(--admin-text-muted)' }}>
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
