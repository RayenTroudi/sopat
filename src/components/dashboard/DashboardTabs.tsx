'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InternationalDashboard } from './InternationalDashboard'
import type { CountryProjectSummary } from '@/lib/db/international'

type Props = {
  mainContent:        React.ReactNode
  internationalData:  CountryProjectSummary[]
  hasForeignProjects: boolean
}

export function DashboardTabs({ mainContent, internationalData, hasForeignProjects }: Props) {
  if (!hasForeignProjects) {
    return <>{mainContent}</>
  }

  return (
    <Tabs defaultValue="main" className="space-y-4">
      <TabsList>
        <TabsTrigger value="main">Vue générale</TabsTrigger>
        <TabsTrigger value="international">🌍 International</TabsTrigger>
      </TabsList>
      <TabsContent value="main">{mainContent}</TabsContent>
      <TabsContent value="international">
        <InternationalDashboard data={internationalData} />
      </TabsContent>
    </Tabs>
  )
}
