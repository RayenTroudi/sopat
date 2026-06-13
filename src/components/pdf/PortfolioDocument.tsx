import { Document } from '@react-pdf/renderer'
import { CoverPage } from './pages/CoverPage'
import { CompanyPage } from './pages/CompanyPage'
import { CertificationsPage } from './pages/CertificationsPage'
import { TeamPage } from './pages/TeamPage'
import { ProjectTypesPage } from './pages/ProjectTypesPage'
import { ProjectPage } from './pages/ProjectPage'
import { RealisationPage } from './pages/RealisationPage'
import { EntretienPage } from './pages/EntretienPage'
import { EclairageDecorationPage } from './pages/EclairageDecorationPage'
import { RsePage } from './pages/RsePage'
import { ClientsPage } from './pages/ClientsPage'
import { AchievementsPage } from './pages/AchievementsPage'
import { ContactsPage } from './pages/ContactsPage'
import type { PortfolioBundle, ExportConfig } from '@/lib/portfolio/types'

type Props = {
  bundle: PortfolioBundle
  config: ExportConfig
  logoUrl?: string
  ceoPhotoUrl?: string
}

export function PortfolioDocument({ bundle, config, logoUrl, ceoPhotoUrl }: Props) {
  const sec = config.sections
  return (
    <Document title={config.name}>
      {sec.cover &&          <CoverPage s={bundle.settings} logoUrl={logoUrl} />}
      {sec.company &&        <CompanyPage s={bundle.settings} ceoPhotoUrl={ceoPhotoUrl} />}
      {sec.certifications && <CertificationsPage s={bundle.settings} />}
      {sec.team &&           <TeamPage team={bundle.team} />}
      {sec.projectTypes &&   <ProjectTypesPage counts={bundle.projectTypeCounts} />}
      {sec.projects &&       bundle.projects.map((p) => <ProjectPage key={p.id} p={p} />)}
      {sec.realisation &&    <RealisationPage projects={bundle.projects} />}
      {sec.entretien &&      <EntretienPage projects={bundle.projects} afterPhotoUrls={bundle.maintenanceVisitsAfterPhotos.map((a) => a.secureUrl)} />}
      {sec.eclairageDecoration && <EclairageDecorationPage projects={bundle.projects} />}
      {sec.rse &&            <RsePage events={bundle.rseEvents} />}
      {sec.clients &&        <ClientsPage clients={bundle.featuredClients} />}
      {sec.achievements &&   <AchievementsPage a={bundle.achievements} />}
      {sec.contacts &&       <ContactsPage s={bundle.settings} logoUrl={logoUrl} />}
    </Document>
  )
}
