import type { Metadata } from 'next'
import Link from 'next/link'
import FoodNav from './components/FoodNav'
import FoodFooter from './components/FoodFooter'

export const metadata: Metadata = {
  title: 'Omnira Food — Discover. Taste. Remember.',
  description: 'Omnira Food — your guide to extraordinary dining. Discover hidden gems, iconic restaurants, and unforgettable meals around the world.',
  openGraph: {
    type: 'website',
    url: 'https://premirafirst.com/food',
    title: 'Omnira Food — Discover. Taste. Remember.',
    description: 'Your guide to extraordinary dining. From backstreet noodle counters in Tokyo to iconic Bombay cafés in London.',
    images: [{ url: 'https://premirafirst.com/food/assets/og-home.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

export default function FoodHome() {
  return (
    <>
      <FoodNav />

      {/* HERO */}
      <section className="hero hero--tall">
        <div className="hero-bg" style={{ background: "url('/food/assets/food-banner.png') center/cover no-repeat, linear-gradient(135deg,#000 0%,#1a0e04 50%,#0d0802 100%)" }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">Omnira Food</span>
          <h1 className="hero-title">Discover.<br />Taste.<br />Remember.</h1>
          <p className="hero-sub">The places worth travelling for. The meals you&apos;ll never forget.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/food/no-frills" className="btn btn--gold">No Frills But Kills</Link>
            <Link href="/food/top5" className="btn btn--outline">Top 5 Eats</Link>
          </div>
        </div>
      </section>

      {/* TAGLINE */}
      <div className="tagline-block">
        <p className="eyebrow">The World on a Plate</p>
        <h2 className="tagline">Some restaurants change the way you think about food. We find them.</h2>
      </div>

      {/* FEATURED RESTAURANT */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Featured Restaurant</h2>
          <Link href="/food/no-frills" className="section-link">View All</Link>
        </div>
        <Link href="/food/restaurant/dishoom-kensington" style={{ display: 'block' }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: '860px' }} id="featured-card">
            <div className="card-img" style={{ aspectRatio: 'auto', minHeight: '360px' }}>
              <div className="card-img-placeholder grad-london" style={{ minHeight: '360px' }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.2 }}>
                  <path d="M32 8C32 8 16 20 16 34C16 42.837 23.163 50 32 50C40.837 50 48 42.837 48 34C48 20 32 8 32 8Z" fill="#C9A84C" />
                </svg>
              </div>
              <div className="card-badge"><span className="badge badge--featured">Featured</span></div>
            </div>
            <div className="card-body" style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p className="card-label">London, United Kingdom</p>
              <h3 className="card-title" style={{ fontSize: '1.7rem', marginBottom: '12px' }}>Dishoom Kensington</h3>
              <p className="card-location">Kensington, London, UK</p>
              <p className="card-excerpt" style={{ WebkitLineClamp: 5 } as React.CSSProperties}>
                Dishoom reimagines the Irani cafés of old Bombay with impeccable style. The Kensington branch is the most elegant of the group. Queue outside is part of the experience.
              </p>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Modern Indian · £25–40pp</span>
                <span className="badge badge--featured">Featured</span>
              </div>
            </div>
          </div>
        </Link>
        <style>{`@media(max-width:640px){#featured-card{grid-template-columns:1fr!important}#featured-card .card-img{min-height:220px!important}}`}</style>
      </section>

      {/* NO FRILLS BUT KILLS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">No Frills But Kills</h2>
          <Link href="/food/no-frills" className="section-link">All Restaurants</Link>
        </div>
        <div className="card-grid">
          <Link href="/food/restaurant/chinchinken">
            <div className="card">
              <div className="card-img">
                <div className="card-img-placeholder grad-tokyo" />
                <div className="card-badge"><span className="badge badge--kills">Kills</span></div>
              </div>
              <div className="card-body">
                <p className="card-label">Tokyo, Japan</p>
                <h3 className="card-title">Chinchinken</h3>
                <p className="card-location">Taito City, Tokyo</p>
                <p className="card-excerpt">A tiny counter restaurant in the backstreets of Taito City. The Abura Soba is legendary among Tokyo locals. No tourists, no frills, just extraordinary noodles.</p>
              </div>
            </div>
          </Link>
          <Link href="/food/restaurant/restaurante-garcia">
            <div className="card">
              <div className="card-img">
                <div className="card-img-placeholder grad-navarra" />
                <div className="card-badge"><span className="badge badge--kills">Kills</span></div>
              </div>
              <div className="card-body">
                <p className="card-label">Navarra, Spain</p>
                <h3 className="card-title">Restaurante Garcia</h3>
                <p className="card-location">Murchante, Navarra</p>
                <p className="card-excerpt">In the small town of Murchante in Navarra, Garcia has been serving honest, exceptional food for decades. A local secret that deserves to be known.</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* LATEST NEWS */}
      <section className="section" style={{ background: 'var(--surface)', maxWidth: '100%', paddingLeft: 0, paddingRight: 0 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 40px' }}>
          <div className="section-header">
            <h2 className="section-title">Latest from Omnira Food</h2>
          </div>
          <div className="news-list">
            {[
              { num: '01', cat: 'No Frills But Kills', title: 'The Tokyo noodle bar with no sign, no menu, and a permanent queue — Chinchinken', date: 'April 2026' },
              { num: '02', cat: 'Destination', title: "Why Navarra is Spain's most underrated food destination (and Garcia is proof)", date: 'April 2026' },
              { num: '03', cat: 'Featured', title: "Dishoom Kensington: the Irani café that changed London's relationship with Indian food", date: 'April 2026' },
              { num: '04', cat: 'Guide', title: 'Abura Soba 101: Tokyo\'s brothless ramen that locals love and tourists miss completely', date: 'March 2026' },
            ].map(item => (
              <div key={item.num} className="news-item">
                <span className="news-num">{item.num}</span>
                <div className="news-body">
                  <p className="news-category">{item.cat}</p>
                  <p className="news-title">{item.title}</p>
                  <p className="news-date">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section style={{ padding: '80px 40px', textAlign: 'center', background: 'var(--black)' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>Explore the Series</p>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 900, maxWidth: '600px', margin: '0 auto 32px' }}>Find your next remarkable meal.</h2>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/food/no-frills" className="btn btn--gold">No Frills But Kills →</Link>
          <Link href="/food/top5" className="btn btn--outline">Top 5 Eats →</Link>
        </div>
      </section>

      <FoodFooter />
    </>
  )
}
