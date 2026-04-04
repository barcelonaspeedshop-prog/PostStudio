'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'New post', icon: 'M12 4v16m8-8H4' },
  { href: '/carousel', label: 'Carousel', icon: 'M4 6h16M4 10h16M4 14h16M4 18h7' },
  { href: '/scheduled', label: 'Scheduled', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/drafts', label: 'Drafts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/accounts', label: 'Accounts', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-52 bg-white border-r border-stone-100 flex flex-col py-5 shrink-0 h-screen sticky top-0">
      <div className="px-5 pb-6 text-[15px] font-medium tracking-tight text-stone-900">
        post<span className="text-stone-400 font-normal">studio</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
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
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-5 pt-4 border-t border-stone-100">
        <p className="text-[10px] text-stone-400">3 accounts connected</p>
      </div>
    </aside>
  )
}
