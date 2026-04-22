'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function FoodNav() {
  const pathname = usePathname()

  function active(href: string) {
    if (href === '/food') return pathname === '/food' ? 'active' : ''
    return pathname.startsWith(href) ? 'active' : ''
  }

  return (
    <nav className="nav">
      <Link href="/food" className="nav-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://drive.google.com/thumbnail?id=1RRb284GGOwoOWdy8URqZ0G56KCmc8h4i&sz=w80"
          onError={(e) => {
            const img = e.currentTarget
            img.style.display = 'none'
            const next = img.nextElementSibling as HTMLElement | null
            if (next) next.style.display = 'flex'
          }}
          alt="Omnira Food"
          className="nav-logo"
        />
        <span
          className="nav-logo"
          style={{ display: 'none', background: 'var(--gold-dim)', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display',serif", fontSize: '0.85rem', color: 'var(--gold)' }}
        >
          OF
        </span>
        <span className="nav-wordmark">Omnira Food</span>
      </Link>
      <ul className="nav-links" id="navLinks">
        <li><Link href="/food" className={active('/food')}>Home</Link></li>
        <li><Link href="/food/no-frills" className={active('/food/no-frills')}>No Frills But Kills</Link></li>
        <li><Link href="/food/top5" className={active('/food/top5')}>Top 5 Eats</Link></li>
      </ul>
      <button
        className="nav-menu-btn"
        aria-label="Menu"
        onClick={() => document.getElementById('navLinks')?.classList.toggle('open')}
      >
        <span /><span /><span />
      </button>
    </nav>
  )
}
