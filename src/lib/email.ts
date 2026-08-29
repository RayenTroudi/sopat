import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { db } from '../../db/index'
import { emailQueue } from '../../db/schema'
import { eq } from 'drizzle-orm'

// ─── Transport ────────────────────────────────────────────────────────────────
//
// Deux transports possibles, choisis à l'exécution :
//
//   RESEND_API_KEY défini  → Resend (API HTTP)
//   sinon                  → SMTP via nodemailer (comportement historique)
//
// Le choix est fait par variable d'environnement plutôt que par réécriture des
// appelants : les douze modèles d'e-mail existants (NC, budget, RSE, relances…)
// continuent d'appeler sendEmail() sans savoir par où le message part. Un
// déploiement encore configuré en SMTP n'est donc pas cassé par ce changement.

let _smtp: nodemailer.Transporter | null = null
let _resend: Resend | null = null

function getSmtpTransport() {
  if (!_smtp) {
    _smtp = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return _smtp
}

function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/** Expéditeur affiché. Le domaine doit être vérifié côté Resend. */
function fromAddress(): string {
  return `"SOPAT Admin" <${process.env.EMAIL_FROM ?? 'noreply@sopat.tn'}>`
}

/**
 * Redirection de test : si EMAIL_TO_OVERRIDE est défini, TOUT part vers cette
 * adresse au lieu des destinataires réels.
 *
 * Nécessaire parce que les comptes SOPAT portent des adresses @sopat.tn qui ne
 * sont pas relevées pendant la mise au point — sans redirection, un envoi
 * « réussi » n'arriverait nulle part et ne prouverait rien. Le destinataire
 * réel reste enregistré dans email_queue.recipient_email : la trace n'est pas
 * falsifiée, seul l'acheminement change. Retirer la variable rétablit le
 * routage normal, sans modification de code.
 */
function resolveRecipients(intended: string[]): { to: string[]; redirected: boolean } {
  const override = process.env.EMAIL_TO_OVERRIDE?.trim()
  if (!override) return { to: intended, redirected: false }
  return { to: [override], redirected: true }
}

async function deliver(args: { to: string[]; subject: string; html: string }): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const { error } = await getResend().emails.send({
      from:    fromAddress(),
      to:      args.to,
      subject: args.subject,
      html:    args.html,
    })
    // Le SDK Resend ne lève pas : il renvoie { data, error }. Sans ce contrôle,
    // un refus (domaine non vérifié, adresse invalide) serait enregistré comme
    // un envoi réussi.
    if (error) throw new Error(`Resend: ${error.message ?? 'échec inconnu'}`)
    return
  }

  await getSmtpTransport().sendMail({
    from:    fromAddress(),
    to:      args.to.join(', '),
    subject: args.subject,
    html:    args.html,
  })
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
  | 'smq-alerts-digest'
  | 'ai-meeting-report'

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

  // Write to email_queue first so we have a record even if delivery fails
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
    const { to, redirected } = resolveRecipients(recipients)
    await deliver({ to, subject: opts.subject, html })
    if (redirected) {
      console.log(`[email] redirigé vers ${to[0]} (destinataire réel : ${recipients.join(', ')})`)
    }

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
    case 'smq-alerts-digest': {
      const { SmqAlertsDigestEmail } = await import('../../emails/smq-alerts-digest')
      return render(SmqAlertsDigestEmail(props as Parameters<typeof SmqAlertsDigestEmail>[0]))
    }
    case 'ai-meeting-report': {
      const { AiMeetingReportEmail } = await import('../../emails/ai-meeting-report')
      return render(AiMeetingReportEmail(props as Parameters<typeof AiMeetingReportEmail>[0]))
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
