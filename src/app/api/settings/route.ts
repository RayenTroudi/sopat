import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getAllSettings,
  updateCompanySettings,
  updateSmtpSettings,
  updateNotificationSettings,
  type CompanySettings,
  type SmtpSettings,
  type NotificationSettings,
} from '@/lib/db/settings'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

function requireAdmin(role: string) { return role === 'admin' }

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const settings = await getAllSettings()
  // Mask SMTP password in response
  return NextResponse.json({
    ...settings,
    smtp: { ...settings.smtp, password: settings.smtp.password ? '••••••••' : '' },
  })
}

const companySchema = z.object({
  name:                 z.string().min(1),
  address:              z.string(),
  isoCertificateNumber: z.string(),
  isoCertificateExpiry: z.string(),
})

const smtpSchema = z.object({
  host:        z.string(),
  port:        z.number().int().min(1).max(65535),
  user:        z.string(),
  password:    z.string(),   // empty string = don't change
  fromAddress: z.string().email(),
})

const notifSchema = z.object({
  budgetAlert:         z.array(z.string()),
  ncAssigned:          z.array(z.string()),
  phaseTransition:     z.array(z.string()),
  maintenanceReminder: z.array(z.string()),
})

const bodySchema = z.object({
  section:       z.enum(['company', 'smtp', 'notifications', 'test-email']),
  company:       companySchema.optional(),
  smtp:          smtpSchema.optional(),
  notifications: notifSchema.optional(),
  testEmail:     z.string().email().optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!requireAdmin(session.user.role)) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const body   = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const { section } = parsed.data
  const uid = session.user.userId

  if (section === 'company' && parsed.data.company) {
    await updateCompanySettings(parsed.data.company as CompanySettings, uid)
    return NextResponse.json({ ok: true })
  }

  if (section === 'smtp' && parsed.data.smtp) {
    const d = parsed.data.smtp
    // If password is the masked placeholder, keep existing
    if (d.password === '••••••••') {
      const current = await getAllSettings()
      await updateSmtpSettings({ ...d, password: current.smtp.password } as SmtpSettings, uid)
    } else {
      await updateSmtpSettings(d as SmtpSettings, uid)
    }
    return NextResponse.json({ ok: true })
  }

  if (section === 'notifications' && parsed.data.notifications) {
    await updateNotificationSettings(parsed.data.notifications as NotificationSettings, uid)
    return NextResponse.json({ ok: true })
  }

  if (section === 'test-email' && parsed.data.testEmail) {
    try {
      await sendEmail({
        to:        parsed.data.testEmail,
        subject:   '[SOPAT Admin] Email de test',
        template:  'phase-transition',
        props: {
          recipientName:  session.user.name ?? 'Admin',
          projectName:    'Projet de test',
          projectReference: 'TEST-001',
          fromPhase:      'etudes',
          toPhase:        'realisation',
          projectUrl:     `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin`,
        },
        createdBy: uid,
      })
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Section inconnue' }, { status: 400 })
}
