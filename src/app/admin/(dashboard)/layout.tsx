import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminSidebar from './AdminSidebar'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ok = await getAdminSession()
  if (!ok) redirect('/admin/login')

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 flex items-center justify-end px-6 flex-shrink-0"
          style={{
            background: 'var(--admin-surface)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <LogoutButton />
        </header>
        <main
          className="flex-1 overflow-auto p-6 admin-scroll"
          style={{ background: 'var(--admin-bg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

function LogoutButton() {
  return (
    <form action={async () => {
      'use server'
      const { cookies } = await import('next/headers')
      const { ADMIN_COOKIE } = await import('@/lib/auth')
      const jar = await cookies()
      jar.delete(ADMIN_COOKIE)
      const { redirect: serverRedirect } = await import('next/navigation')
      serverRedirect('/admin/login')
    }}>
      <button
        type="submit"
        className="text-xs font-medium px-3 py-1.5 rounded transition-all duration-150 admin-logout-btn"
        style={{
          color: 'var(--admin-text-muted)',
          border: '1px solid var(--admin-border)',
          background: 'transparent',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Déconnexion
      </button>
    </form>
  )
}
