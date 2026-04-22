import Link from 'next/link'

export default function FoodFooter() {
  return (
    <footer className="footer">
      <p className="footer-brand">Omnira Food</p>
      <p className="footer-tagline">Discover · Taste · Remember</p>
      <nav className="footer-links">
        <Link href="/food">Home</Link>
        <Link href="/food/no-frills">No Frills But Kills</Link>
        <Link href="/food/top5">Top 5 Eats</Link>
      </nav>
      <p className="footer-copy">© 2026 Omnira Food · Part of the Premira First network</p>
    </footer>
  )
}
