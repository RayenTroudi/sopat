import { db } from '../../../db/index'
import { systemSettings } from '../../../db/schema'
import { eq } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompanySettings = {
  name:                  string
  address:               string
  isoCertificateNumber:  string
  isoCertificateExpiry:  string  // ISO date string YYYY-MM-DD
}

export type SmtpSettings = {
  host:     string
  port:     number
  user:     string
  password: string  // stored in DB; empty means use env vars
  fromAddress: string
}

export type NotificationSettings = {
  budgetAlert:   string[]   // roles that receive budget alert emails
  ncAssigned:    string[]
  phaseTransition: string[]
  maintenanceReminder: string[]
}

export type AllSettings = {
  company:       CompanySettings
  smtp:          SmtpSettings
  notifications: NotificationSettings
}

const DEFAULTS: AllSettings = {
  company: {
    name: 'SOPAT',
    address: 'Tunis, Tunisie',
    isoCertificateNumber: '',
    isoCertificateExpiry: '',
  },
  smtp: {
    host: '',
    port: 587,
    user: '',
    password: '',
    fromAddress: 'noreply@sopat.tn',
  },
  notifications: {
    budgetAlert:         ['admin', 'realisation_chef'],
    ncAssigned:          ['admin'],
    phaseTransition:     ['admin', 'etudes_chef', 'realisation_chef', 'entretien_chef'],
    maintenanceReminder: ['entretien_chef', 'entretien_team'],
  },
}

// ─── Get / upsert ────────────────────────────────────────────────────────────

async function getSetting<T>(key: string, defaultVal: T): Promise<T> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1)

  if (!row) return defaultVal
  return (row.value ?? defaultVal) as T
}

async function setSetting(key: string, value: unknown, updatedBy: string) {
  const existing = await db
    .select({ id: systemSettings.id })
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1)

  if (existing.length > 0) {
    await db.update(systemSettings)
      .set({ value: value as Record<string, unknown>, updatedAt: new Date(), updatedBy })
      .where(eq(systemSettings.key, key))
  } else {
    await db.insert(systemSettings)
      .values({ key, value: value as Record<string, unknown>, updatedBy })
  }
}

export async function getAllSettings(): Promise<AllSettings> {
  const [company, smtp, notifications] = await Promise.all([
    getSetting<CompanySettings>('company', DEFAULTS.company),
    getSetting<SmtpSettings>('smtp', DEFAULTS.smtp),
    getSetting<NotificationSettings>('notifications', DEFAULTS.notifications),
  ])
  return { company, smtp, notifications }
}

export async function updateCompanySettings(data: CompanySettings, updatedBy: string) {
  await setSetting('company', data, updatedBy)
}

export async function updateSmtpSettings(data: SmtpSettings, updatedBy: string) {
  await setSetting('smtp', data, updatedBy)
}

export async function updateNotificationSettings(data: NotificationSettings, updatedBy: string) {
  await setSetting('notifications', data, updatedBy)
}

// ─── ISO certificate expiry helper ───────────────────────────────────────────

export async function getIsoCertificateWarning(): Promise<{ daysLeft: number; warn: boolean } | null> {
  const company = await getSetting<CompanySettings>('company', DEFAULTS.company)
  if (!company.isoCertificateExpiry) return null

  const expiry   = new Date(company.isoCertificateExpiry)
  const today    = new Date()
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
  return { daysLeft, warn: daysLeft <= 60 }
}
