import nodemailer from 'nodemailer'
import { render } from '@react-email/components'
import { db } from '../../db/index'
import { emailQueue } from '../../db/schema'
import { eq } from 'drizzle-orm'

// ─── Transport ────────────────────────────────────────────────────────────────

let _transport: nodemailer.Transporter | null = null

function getTransport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return _transport
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailTemplate =
  | 'prediction-email'
  | 'validation-confirmed'
  | 'validation-modified'
  | 'phase-transition'
  | 'budget-alert'
  | 'nc-assigned'
  | 'maintenance-reminder'
  | 'reminder-48h'
  | 'rse-expiry-warning'
  | 'rse-commitment-overdue'
  | 'rse-communication-submitted'

export type SendEmailOptions = {
  to:                  string | string[]
  subject:             string
  template:            EmailTemplate
  props:               Record<string, unknown>
  projectId?:          string
  recipientId?:        string
  relatedEntityType?:  string
  relatedEntityId?:    string
  metadata?:           Record<string, unknown>
  createdBy:           string
}

// ─── Core send function ───────────────────────────────────────────────────────

export async function sendEmail(opts: SendEmailOptions): Promise<string> {
  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to]

  // Dynamically import the template so Next.js RSC bundling doesn't break
  const html = await renderTemplate(opts.template, opts.props)

  // Write to email_queue first so we have a record even if SMTP fails
  const [queueRow] = await db
    .insert(emailQueue)
    .values({
      projectId:         opts.projectId ?? null,
      recipientId:       opts.recipientId ?? null,
      recipientEmail:    recipients.join(', '),
      templateName:      opts.template,
      subject:           opts.subject,
      status:            'pending',
      relatedEntityType: opts.relatedEntityType ?? null,
      relatedEntityId:   opts.relatedEntityId ?? null,
      metadata:          opts.metadata ?? null,
      createdBy:         opts.createdBy,
    })
    .returning()

  try {
    await getTransport().sendMail({
      from:    `"SOPAT Admin" <${process.env.EMAIL_FROM ?? 'noreply@sopat.tn'}>`,
      to:      recipients.join(', '),
      subject: opts.subject,
      html,
    })

    await db
      .update(emailQueue)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(emailQueue.id, queueRow.id))

    return queueRow.id
  } catch (err) {
    await db
      .update(emailQueue)
      .set({ status: 'failed', errorMessage: String(err) })
      .where(eq(emailQueue.id, queueRow.id))
    throw err
  }
}

// ─── Template renderer ────────────────────────────────────────────────────────

async function renderTemplate(
  template: EmailTemplate,
  props: Record<string, unknown>
): Promise<string> {
  // Dynamic imports so each template is only bundled when needed
  switch (template) {
    case 'prediction-email': {
      const { PredictionEmail } = await import('../../emails/prediction-email')
      return render(PredictionEmail(props as Parameters<typeof PredictionEmail>[0]))
    }
    case 'validation-confirmed': {
      const { ValidationConfirmedEmail } = await import('../../emails/validation-confirmed')
      return render(ValidationConfirmedEmail(props as Parameters<typeof ValidationConfirmedEmail>[0]))
    }
    case 'validation-modified': {
      const { ValidationModifiedEmail } = await import('../../emails/validation-modified')
      return render(ValidationModifiedEmail(props as Parameters<typeof ValidationModifiedEmail>[0]))
    }
    case 'phase-transition': {
      const { PhaseTransitionEmail } = await import('../../emails/phase-transition')
      return render(PhaseTransitionEmail(props as Parameters<typeof PhaseTransitionEmail>[0]))
    }
    case 'budget-alert': {
      const { BudgetAlertEmail } = await import('../../emails/budget-alert')
      return render(BudgetAlertEmail(props as Parameters<typeof BudgetAlertEmail>[0]))
    }
    case 'nc-assigned': {
      const { NcAssignedEmail } = await import('../../emails/nc-assigned')
      return render(NcAssignedEmail(props as Parameters<typeof NcAssignedEmail>[0]))
    }
    case 'maintenance-reminder': {
      const { MaintenanceReminderEmail } = await import('../../emails/maintenance-reminder')
      return render(MaintenanceReminderEmail(props as Parameters<typeof MaintenanceReminderEmail>[0]))
    }
    case 'reminder-48h': {
      const { Reminder48hEmail } = await import('../../emails/reminder-48h')
      return render(Reminder48hEmail(props as Parameters<typeof Reminder48hEmail>[0]))
    }
    case 'rse-expiry-warning':
    case 'rse-commitment-overdue':
    case 'rse-communication-submitted': {
      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      const title = template === 'rse-expiry-warning'
        ? 'Convention RSE arrivant à échéance'
        : template === 'rse-commitment-overdue'
        ? 'Engagement RSE en retard'
        : 'Nouvelle demande de communication RSE'
      return `<html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#166534">[SOPAT RSE] ${esc(title)}</h2>
        <pre style="font-size:14px;white-space:pre-wrap">${esc(JSON.stringify(props, null, 2))}</pre>
        <hr/><p style="color:#6b7280;font-size:12px">SOPAT Admin — Ne pas répondre à cet e-mail.</p>
      </body></html>`
    }
  }
}

// ─── Email queue helpers ──────────────────────────────────────────────────────

/** Find prediction emails sent > N hours ago with no validation yet */
export async function findOverdueValidations(hours: number) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  return db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.templateName, 'prediction-email'))
    // status = 'sent' (not yet validated/expired) and sent before cutoff
    .then((rows) =>
      rows.filter(
        (r) =>
          r.status === 'sent' &&
          r.sentAt !== null &&
          r.sentAt < cutoff
      )
    )
}

export async function markEmailValidated(emailQueueId: string) {
  await db
    .update(emailQueue)
    .set({ status: 'validated' })
    .where(eq(emailQueue.id, emailQueueId))
}
