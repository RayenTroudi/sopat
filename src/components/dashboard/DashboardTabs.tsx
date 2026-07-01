'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InternationalDashboard } from './InternationalDashboard'
import type { CountryProjectSummary } from '@/lib/db/international'
import type { getSmqKpis } from '@/lib/db/kpi-smq'
import { SmqDashboard } from './SmqDashboard'

type Props = {
  mainContent:        React.ReactNode
  internationalData:  CountryProjectSummary[]
  hasForeignProjects: boolean
  smqKpis:            Awaited<ReturnType<typeof getSmqKpis>>
  smqYear:            number
}

export function DashboardTabs({ mainContent, internationalData, hasForeignProjects, smqKpis, smqYear }: Props) {
  return (
    <Tabs defaultValue="main" className="space-y-4">
      <TabsList>
        <TabsTrigger value="main">Vue générale</TabsTrigger>
        {hasForeignProjects && (
          <TabsTrigger value="international">🌍 International</TabsTrigger>
        )}
        <TabsTrigger value="smq">📋 SMQ</TabsTrigger>
      </TabsList>
      <TabsContent value="main">{mainContent}</TabsContent>
      {hasForeignProjects && (
        <TabsContent value="international">
          <InternationalDashboard data={internationalData} />
        </TabsContent>
      )}
      <TabsContent value="smq">
        <SmqDashboard kpis={smqKpis} year={smqYear} />
      </TabsContent>
    </Tabs>
  )
}
