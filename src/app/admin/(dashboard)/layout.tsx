import { redirect } from 'next/navigation'
import { auth, signOut } from '@/auth'
import SessionProvider from '@/components/SessionProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ROLE_LABELS } from '@/lib/auth-utils'
import { AdminNav } from '@/components/AdminNav'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/admin/login')

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <div className="min-h-screen flex" style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}>

          {/* Sidebar */}
          <AdminNav role={session.user.role} />

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar */}
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
                  {session.user.name} ·{' '}
                  <span className="font-medium">{ROLE_LABELS[session.user.role]}</span>
                </span>
                <LogoutButton />
              </div>
            </header>

            <main className="flex-1 p-6" style={{ background: 'var(--admin-bg)' }}>
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  )
}

function LogoutButton() {
  return (
    <form action={async () => {
      'use server'
      await signOut({ redirectTo: '/admin/login' })
    }}>
      <button
        type="submit"
        className="text-xs font-medium px-3 py-1.5 rounded transition-all duration-150"
        style={{ color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)', background: 'transparent', fontFamily: 'var(--font-sans)' }}
      >
        Déconnexion
      </button>
    </form>
  )
}
