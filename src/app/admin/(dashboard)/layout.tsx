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
      <div className="min-h-screen flex admin-bg-override" style={{ background: '#D4E4DA', fontFamily: 'var(--font-sans)' }}>
        <AdminNav role={session.role} userId={session.userId} />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader name={session.name} role={session.role} userId={session.userId} />
          <main className="flex-1 admin-fade-in" style={{ background: '#D4E4DA', padding: '8px 8px 8px 8px' }}>
            <div style={{
              background:   '#F4F8F5',
              borderRadius: '20px',
              padding:      '20px',
              minHeight:    '100%',
            }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
