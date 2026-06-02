'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AddClientModal from '@/components/admin/AddClientModal'

type Client = {
  id: string
  name: string
  type: string
  email: string | null
  phone: string | null
  createdAt: Date
  projects: Array<{ id: string; name: string; status: string }>
}

export default function ClientsClient({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.12em' }}
          >
            SOPAT Finance
          </p>
          <h1
            className="text-3xl font-semibold"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-playfair)' }}
          >
            Clients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg transition-all duration-150"
          style={{
            background: 'var(--admin-accent)',
            color: '#0B1012',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(c => (
          <div
            key={c.id}
            className="admin-card-shine rounded-xl p-5 space-y-3"
            style={{
              background: 'var(--admin-card)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3
                  className="font-semibold text-base"
                  style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-sans)' }}
                >
                  {c.name}
                </h3>
                <span
                  className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--admin-accent-dim)',
                    color: 'var(--admin-accent)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {c.type}
                </span>
              </div>
            </div>

            {(c.email || c.phone) && (
              <div className="space-y-1">
                {c.email && (
                  <p className="text-xs flex items-center gap-2" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {c.email}
                  </p>
                )}
                {c.phone && (
                  <p className="text-xs flex items-center gap-2" style={{ color: 'var(--admin-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {c.phone}
                  </p>
                )}
              </div>
            )}

            <div>
              <p
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em' }}
              >
                Projets ({c.projects.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.projects.slice(0, 3).map(proj => (
                  <Link
                    key={proj.id}
                    href={`/admin/projects/${proj.id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all duration-150"
                    style={{
                      background: 'var(--admin-surface)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text-muted)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: proj.status === 'Active'
                          ? 'var(--admin-emerald)'
                          : proj.status === 'Pending'
                          ? 'var(--admin-amber)'
                          : 'var(--admin-text-dim)',
                      }}
                    />
                    {proj.name}
                  </Link>
                ))}
                {c.projects.length > 3 && (
                  <span
                    className="text-xs self-center"
                    style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}
                  >
                    +{c.projects.length - 3} autres
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div
            className="col-span-3 py-12 text-center text-sm"
            style={{ color: 'var(--admin-text-dim)', fontFamily: 'var(--font-sans)' }}
          >
            Aucun client enregistré
          </div>
        )}
      </div>

      {showModal && (
        <AddClientModal onClose={() => setShowModal(false)} onSuccess={() => router.refresh()} />
      )}
    </div>
  )
}
