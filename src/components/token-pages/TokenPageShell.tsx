import React from 'react'

// ─── Shared mobile-first shell for /validate and /edit pages ─────────────────

const SOPAT_GREEN = '#2D5A27'

export function TokenPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F3F4F6',
        fontFamily: "'Inter', -apple-system, Arial, sans-serif",
        padding: '0 0 40px',
      }}
    >
      {/* Top bar */}
      <div style={{ backgroundColor: SOPAT_GREEN, padding: '16px 20px', marginBottom: 0 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>SOPAT</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>
              Aménagement Paysager · ISO 9001:2015
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Status screens ───────────────────────────────────────────────────────────

export function TokenExpiredScreen() {
  return (
    <TokenPageShell>
      <StatusCard
        icon="⏰"
        title="Lien expiré"
        body="Ce lien de validation est expiré (validité 7 jours). Veuillez contacter votre administrateur SOPAT pour obtenir un nouveau lien."
        color="#D97706"
        bg="#FFFBEB"
        border="#FCD34D"
      />
    </TokenPageShell>
  )
}

export function TokenUsedScreen({ action }: { action: string }) {
  const isEdit = action === 'edit'
  return (
    <TokenPageShell>
      <StatusCard
        icon="✓"
        title={isEdit ? 'Budget déjà modifié' : 'Budget déjà validé'}
        body={
          isEdit
            ? 'Vous avez déjà soumis des modifications pour ce budget. Contactez votre administrateur si vous avez besoin d\'effectuer une nouvelle modification.'
            : 'Vous avez déjà validé ce budget. Le montant approuvé a été enregistré dans le système SOPAT.'
        }
        color="#16A34A"
        bg="#F0FBF0"
        border="#BBF7D0"
      />
    </TokenPageShell>
  )
}

export function TokenInvalidScreen() {
  return (
    <TokenPageShell>
      <StatusCard
        icon="✕"
        title="Lien invalide"
        body="Ce lien n'est pas valide ou a déjà été utilisé. Contactez votre administrateur SOPAT."
        color="#DC2626"
        bg="#FEF2F2"
        border="#FECACA"
      />
    </TokenPageShell>
  )
}

export function TokenSuccessScreen({ message }: { message: string }) {
  return (
    <TokenPageShell>
      <StatusCard
        icon="✓"
        title="Opération réussie"
        body={message}
        color="#16A34A"
        bg="#F0FBF0"
        border="#BBF7D0"
      />
    </TokenPageShell>
  )
}

function StatusCard({
  icon, title, body, color, bg, border,
}: {
  icon: string; title: string; body: string; color: string; bg: string; border: string
}) {
  return (
    <div style={{ paddingTop: 32 }}>
      <div
        style={{
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>{body}</div>
      </div>
      <PageFooter />
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function ProjectBadge({
  name,
  reference,
  clientName,
}: {
  name: string
  reference: string
  clientName: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#F0FBF0',
        border: '1px solid #D6E4D3',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        Projet
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 12, color: '#6B7280' }}>Réf. {reference} · {clientName}</div>
    </div>
  )
}

export function BreakdownTable({
  rows,
  total,
}: {
  rows: { label: string; amount: number }[]
  total: number
}) {
  const FMT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  function tnd(n: number) { return `${FMT.format(Math.round(n))} TND` }

  return (
    <div
      style={{
        border: '1px solid #D6E4D3',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '0 16px',
          backgroundColor: SOPAT_GREEN,
          padding: '10px 16px',
        }}
      >
        {['Poste', 'Montant', '%'].map((h) => (
          <div key={h} style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const pct = total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0'
        return (
          <div
            key={row.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '0 16px',
              padding: '11px 16px',
              backgroundColor: i % 2 === 0 ? '#fff' : '#F9FBF9',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            <div style={{ fontSize: 13, color: '#374151' }}>{row.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{tnd(row.amount)}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{pct}%</div>
          </div>
        )
      })}

      {/* Total */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '0 16px',
          padding: '12px 16px',
          backgroundColor: '#F0FBF0',
          borderTop: `2px solid ${SOPAT_GREEN}`,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Total</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: SOPAT_GREEN }}>{tnd(total)}</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>100%</div>
      </div>
    </div>
  )
}

export function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #E5E7EB',
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

export function PageFooter() {
  return (
    <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
      SOPAT — Système de gestion qualité ISO 9001:2015
      <br />
      Ce lien est à usage unique et personnel. Ne le partagez pas.
    </div>
  )
}
