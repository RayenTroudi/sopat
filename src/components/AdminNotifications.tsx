'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  projectId: string | null
  createdAt: string
  readAt: string | null
}

const POLL_MS = 30_000

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

export function AdminNotifications() {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notifications: NotificationRow[]; unreadCount: number } | null) => {
        if (!data) return
        setItems(data.notifications)
        setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSelect(n: NotificationRow) {
    setOpen(false)
    if (!n.readAt) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      fetch(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => {})
    }
    if (n.href) router.push(n.href)
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    fetch('/api/notifications/mark-all-read', { method: 'POST' }).catch(() => {})
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        style={{ color: 'rgba(0,0,0,0.5)' }}
        onClick={() => setOpen((p) => !p)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center text-white"
            style={{ background: '#DC2626' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border shadow-lg overflow-hidden z-50"
          style={{ background: '#F4F8F5', borderColor: 'rgba(0,0,0,0.12)' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <p className="text-sm font-semibold" style={{ color: 'rgba(0,0,0,0.8)' }}>Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium"
                style={{ color: '#1F6B3D' }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-center" style={{ color: 'rgba(0,0,0,0.4)' }}>
              Aucune notification
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleSelect(n)}
                    className="w-full text-left px-4 py-3 border-b transition-colors hover:bg-[rgba(0,0,0,0.03)]"
                    style={{ borderColor: 'rgba(0,0,0,0.06)', background: n.readAt ? 'transparent' : 'rgba(31,107,61,0.05)' }}
                  >
                    <p className="text-sm" style={{ color: 'rgba(0,0,0,0.85)', fontWeight: n.readAt ? 400 : 600 }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgba(0,0,0,0.5)' }}>{n.body}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(0,0,0,0.35)' }}>{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
