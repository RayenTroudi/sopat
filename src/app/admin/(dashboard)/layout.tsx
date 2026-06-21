import { requireAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'
import { AdminNav } from '@/components/AdminNav'
import { AdminHeader } from '@/components/AdminHeader'

export const metadata = { title: 'SOPAT Admin' }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // requireAuth() calls redirect('/login') if not authenticated.
  // Do NOT wrap in try/catch — Next.js redirect() throws a special
  // error that must propagate for the redirect to work.
  const session = await requireAuth()

  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ background: 'var(--admin-bg)', fontFamily: 'var(--font-sans)' }}>
        <AdminNav role={session.role} name={session.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader name={session.name} role={session.role} />
          <main className="flex-1 p-6 admin-fade-in" style={{ background: 'var(--admin-bg)' }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
