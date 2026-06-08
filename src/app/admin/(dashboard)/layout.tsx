import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { AdminNav } from '@/components/AdminNav'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await auth()
  if (!authenticated) redirect('/admin/login')

  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}>

        {/* Sidebar */}
        <AdminNav />

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
              <LogoutButton />
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

function LogoutButton() {
  return (
    <form action="/api/admin/auth/logout" method="POST">
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
