'use client'

import { useState } from 'react'
import { InternationalDashboard } from './InternationalDashboard'
import type { CountryProjectSummary } from '@/lib/db/international'

type Props = {
  mainContent:        React.ReactNode
  internationalData:  CountryProjectSummary[]
  hasForeignProjects: boolean
}

export function DashboardTabs({ mainContent, internationalData, hasForeignProjects }: Props) {
  const [tab, setTab] = useState<'main' | 'international'>('main')

  const TABS = [
    { key: 'main' as const,          label: 'Vue générale' },
    { key: 'international' as const, label: '🌍 International' },
  ]

  return (
    <div className="space-y-4">
      {hasForeignProjects && (
        <div className="flex gap-1 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                borderColor: tab === t.key ? 'var(--admin-emerald)' : 'transparent',
                color:       tab === t.key ? 'var(--admin-emerald)' : 'var(--admin-text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'main'          && mainContent}
      {tab === 'international' && <InternationalDashboard data={internationalData} />}
    </div>
  )
}
