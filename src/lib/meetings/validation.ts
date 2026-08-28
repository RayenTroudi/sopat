import { z } from 'zod'
import { MEETING_PLATFORMS, type MeetingPlatform } from '@/lib/recall/types'

/**
 * Validation des entrées de création de réunion IA.
 *
 * Le contrôle d'URL est une liste d'autorisation, pas un simple `URL()` : une
 * URL arbitraire envoyée à Recall consomme un bot et de la facturation pour un
 * lien qui ne peut de toute façon pas être rejoint. On refuse donc tout ce qui
 * n'est pas un domaine de visioconférence pris en charge, et on vérifie que la
 * plateforme déclarée correspond bien au lien fourni — sinon l'écran
 * annoncerait « Zoom » pour une réunion Teams.
 */

const PLATFORM_HOSTS: Record<MeetingPlatform, RegExp[]> = {
  google_meet:     [/^meet\.google\.com$/i],
  zoom:            [/(^|\.)zoom\.us$/i, /(^|\.)zoom\.com$/i, /(^|\.)zoomgov\.com$/i],
  microsoft_teams: [/^teams\.microsoft\.com$/i, /^teams\.live\.com$/i],
  webex:           [/(^|\.)webex\.com$/i, /(^|\.)webex\.com\.cn$/i],
}

/** Déduit la plateforme depuis l'URL, ou null si le domaine n'est pas pris en charge. */
export function detectPlatform(meetingUrl: string): MeetingPlatform | null {
  let host: string
  try {
    const parsed = new URL(meetingUrl.trim())
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    host = parsed.hostname
  } catch {
    return null
  }
  for (const platform of MEETING_PLATFORMS) {
    if (PLATFORM_HOSTS[platform].some((re) => re.test(host))) return platform
  }
  return null
}

export const meetingUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL de réunion requise')
  .max(2048)
  .refine((value) => detectPlatform(value) !== null, {
    message: 'URL non prise en charge — Google Meet, Zoom, Microsoft Teams ou Webex uniquement.',
  })

export const createAiMeetingSchema = z
  .object({
    title:        z.string().trim().min(3, 'Titre trop court').max(255),
    description:  z.string().trim().max(5000).optional(),
    meetingUrl:   meetingUrlSchema,
    platform:     z.enum(MEETING_PLATFORMS as unknown as [MeetingPlatform, ...MeetingPlatform[]]),
    /** Date/heure locale ISO envoyée par le formulaire. */
    scheduledAt:  z.string().datetime({ offset: true }),
    participants: z.string().trim().max(2000).optional(),
    autoJoin:     z.boolean().default(true),
    sendEmailReport: z.boolean().default(true),
  })
  .refine((data) => detectPlatform(data.meetingUrl) === data.platform, {
    message: "La plateforme sélectionnée ne correspond pas à l'URL fournie.",
    path: ['platform'],
  })

export type CreateAiMeetingInput = z.infer<typeof createAiMeetingSchema>
