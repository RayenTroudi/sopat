import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { AdminNav } from '@/components/AdminNav'
import { ROLE_LABELS } from '@/lib/auth-utils'
import LogoutButton from '@/components/auth/LogoutButton'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session
  try {
    session = await requireAuth()
  } catch {
    redirect('/login')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}>

        <AdminNav />

        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30"
            style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
          >
            <span className="font-semibold text-sm lg:hidden" style={{ color: 'var(--admin-text)' }}>
              SOPAT Admin
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <span className="text-xs hidden sm:block" style={{ color: 'var(--admin-text-muted)' }}>
                {session.name} ·{' '}
                <span className="font-medium">{ROLE_LABELS[session.role]}</span>
              </span>
              <LogoutButton
                className="text-xs font-medium px-3 py-1.5 rounded transition-all duration-150"
                style={{
                  color: 'var(--admin-text-muted)',
                  border: '1px solid var(--admin-border)',
                  background: 'transparent',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              />
            </div>
          </header>

          <main className="flex-1 p-6" style={{ background: 'var(--admin-bg)' }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
