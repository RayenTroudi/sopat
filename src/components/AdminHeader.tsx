// src/components/AdminHeader.tsx
'use client'

import { useState } from 'react'
import { Menu, Bell, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

type Props = { name: string; role: UserRole }

export function AdminHeader({ name, role }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <header
      className="h-12 flex items-center justify-between px-4 lg:px-5 flex-shrink-0"
      style={{ background: '#F4F8F5', borderRadius: '20px', margin: '8px 8px 0 8px' }}
    >
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          style={{ color: '#2F6F4F' }}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div
          className="relative hidden lg:flex items-center"
          style={{ maxWidth: '320px', width: '100%' }}
        >
          <Search
            className="absolute left-3 pointer-events-none"
            style={{ width: '14px', height: '14px', color: 'rgba(47,111,79,0.5)' }}
          />
          <input
            type="search"
            placeholder="Rechercher…"
            className="w-full text-sm outline-none bg-transparent"
            style={{
              height:       '34px',
              paddingLeft:  '34px',
              paddingRight: '12px',
              borderRadius: '10px',
              border:       '1.5px solid rgba(47,111,79,0.2)',
              color:        '#2F6F4F',
              background:   '#F4F8F5',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(47,111,79,0.5)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(47,111,79,0.2)'}
          />
        </div>
      </div>

      {/* Right: bell + user dropdown */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          style={{ color: '#2F6F4F' }}
        >
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9" style={{ color: '#2F6F4F' }}>
              <Avatar className="w-7 h-7">
                <AvatarFallback
                  className="text-xs font-semibold"
                  style={{ background: 'rgba(47,111,79,0.12)', color: '#2F6F4F', border: '1px solid rgba(47,111,79,0.25)' }}
                >
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium" style={{ color: '#2F6F4F' }}>
                {name}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(47,111,79,0.6)' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" style={{ background: '#F4F8F5', border: '1px solid rgba(47,111,79,0.15)' }}>
            <DropdownMenuLabel>
              <p className="text-sm font-medium" style={{ color: '#2F6F4F' }}>{name}</p>
              <p className="text-xs font-normal mt-0.5" style={{ color: 'rgba(47,111,79,0.6)' }}>
                {ROLE_LABELS[role]}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: 'rgba(47,111,79,0.1)' }} />
            {role === 'admin' && (
              <DropdownMenuItem asChild>
                <a href="/admin/settings" className="cursor-pointer text-sm" style={{ color: '#2F6F4F' }}>Paramètres</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator style={{ background: 'rgba(47,111,79,0.1)' }} />
            <DropdownMenuItem asChild>
              <div className="cursor-pointer">
                <LogoutButton className="w-full text-left text-sm" style={{ color: '#2F6F4F' }} />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[200px] p-0 flex flex-col" style={{ background: 'var(--admin-surface)', borderRight: '1px solid var(--admin-border)' }}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AdminNavContent role={role} name={name} onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
