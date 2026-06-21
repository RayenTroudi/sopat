// src/components/AdminHeader.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AdminNavContent } from '@/components/AdminNav'
import LogoutButton from '@/components/auth/LogoutButton'
import { ROLE_LABELS } from '@/lib/auth-utils'
import type { UserRole } from '@/lib/auth-utils'

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  projects: 'Projets',
  clients: 'Clients',
  nc: 'Non-conformités',
  audits: 'Audits',
  documents: 'Documents',
  suppliers: 'Fournisseurs',
  design: 'Design',
  concepts: 'Concepts',
  templates: 'Modèles',
  rse: 'RSE',
  partnerships: 'Partenariats',
  events: 'Événements',
  impact: 'Impact RSE',
  direction: 'Direction',
  achievements: 'Réalisations',
  portfolio: 'Portfolio',
  reports: 'Rapports',
  team: 'Équipe',
  settings: 'Paramètres',
  currencies: 'Devises',
  ml: 'Modèle ML',
  new: 'Nouveau',
  'calendrier-entretien': 'Calendrier visites',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  // Always starts with 'admin', show up to 3 levels
  const crumbs: { label: string; href: string; isLast: boolean }[] = []
  let path = ''
  for (let i = 0; i < Math.min(segments.length, 3); i++) {
    path += '/' + segments[i]
    const label = SEGMENT_LABELS[segments[i]] ?? segments[i]
    crumbs.push({ label, href: path, isLast: i === segments.length - 1 || i === 2 })
  }
  return crumbs
}

type Props = { name: string; role: UserRole }

export function AdminHeader({ name, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const crumbs = useBreadcrumbs(pathname)

  return (
    <header
      className="h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30"
      style={{ background: 'var(--admin-surface)', borderBottom: '1px solid var(--admin-border)' }}
    >
      {/* Left: hamburger (mobile) + breadcrumbs (desktop) */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <Breadcrumb className="hidden lg:flex">
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right: bell + user dropdown */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ background: 'var(--admin-emerald-dim)', color: 'var(--admin-emerald)' }}
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                {name}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--admin-text-muted)' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{name}</p>
              <p className="text-xs font-normal mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                {ROLE_LABELS[role]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === 'admin' && (
              <DropdownMenuItem asChild>
                <a href="/admin/settings" className="cursor-pointer text-sm">Paramètres</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <div className="cursor-pointer">
                <LogoutButton className="w-full text-left text-sm" />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-56 p-0 flex flex-col" style={{ background: 'var(--admin-surface)' }}>
          <AdminNavContent role={role} name={name} onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
