'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const links = [
  { href: '/', label: 'New post', icon: 'M12 4v16m8-8H4' },
  { href: '/carousel', label: 'Carousel', icon: 'M4 6h16M4 10h16M4 14h16M4 18h7' },
  { href: '/longform', label: 'Long Form', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3m0 0a2 2 0 012 2v4a2 2 0 01-2 2m0-8a2 2 0 00-2 2v4a2 2 0 002 2' },
  { href: '/curation', label: 'Curation', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', curationBadge: true },
  { href: '/hooks', label: 'Hooks', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { href: '/hashtags', label: 'Hashtags', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14' },
  { href: '/approvals', label: 'Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: true },
  { href: '/scheduled', label: 'Scheduled', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/drafts', label: 'Drafts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/accounts', label: 'Accounts', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [curationCount, setCurationCount] = useState(0)

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Fetch pending approval count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/approvals')
        if (res.ok) {
          const items = await res.json()
          setPendingCount(items.filter((i: { status: string }) => i.status === 'pending').length)
        }
      } catch {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch pending curation count (channels with stories awaiting review)
  useEffect(() => {
    const fetchCuration = async () => {
      try {
        const res = await fetch('/api/curation')
        if (res.ok) {
          const queue = await res.json()
          const count = Object.values(queue.channels || {}).filter(
            (ch) => {
              const c = ch as { status: string; stories?: unknown[] }
              return c.stories && c.stories.length > 0 && c.status === 'pending'
            }
          ).length
          setCurationCount(count)
        }
      } catch {}
    }
    fetchCuration()
    const interval = setInterval(fetchCuration, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-stone-200 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
        )}
      </button>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile (fixed overlay when open), in-flow on desktop */}
      <aside
        className="sidebar-aside w-52 bg-white border-r border-stone-100 flex-col py-5 shrink-0 h-screen hidden md:flex md:sticky md:top-0"
      >
        <div className="px-5 pb-6">
          <span className="text-[15px] font-medium tracking-tight text-stone-900">
            post<span className="text-stone-400 font-normal">studio</span>
          </span>
        </div>
        <SidebarNav pathname={pathname} pendingCount={pendingCount} curationCount={curationCount} />
        <div className="mt-auto px-5 pt-4 border-t border-stone-100">
          <p className="text-[10px] text-stone-400">3 accounts connected</p>
        </div>
      </aside>

      {/* Mobile drawer — completely separate from desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-52 bg-white border-r border-stone-100 flex flex-col py-5 transition-transform duration-200 ease-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pb-6 flex items-center justify-between">
          <span className="text-[15px] font-medium tracking-tight text-stone-900">
            post<span className="text-stone-400 font-normal">studio</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarNav pathname={pathname} pendingCount={pendingCount} curationCount={curationCount} />
        <div className="mt-auto px-5 pt-4 border-t border-stone-100">
          <p className="text-[10px] text-stone-400">3 accounts connected</p>
        </div>
      </aside>
    </>
  )
}

function SidebarNav({ pathname, pendingCount, curationCount }: { pathname: string; pendingCount: number; curationCount: number }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {links.map(({ href, label, icon, badge, curationBadge }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors min-h-[44px] ${
              active
                ? 'bg-stone-100 text-stone-900 font-medium'
                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
            }`}
          >
            <svg
              className="w-[15px] h-[15px] shrink-0"
              style={{ opacity: active ? 1 : 0.55 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
            </svg>
            {label}
            {badge && pendingCount > 0 && (
              <span className="ml-auto px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[18px] text-center">{pendingCount}</span>
            )}
            {curationBadge && curationCount > 0 && (
              <span className="ml-auto px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[18px] text-center">{curationCount}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
