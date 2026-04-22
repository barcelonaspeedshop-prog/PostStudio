import type { Metadata } from 'next'
import FoodNav from '../components/FoodNav'
import FoodFooter from '../components/FoodFooter'

export const metadata: Metadata = {
  title: 'Top 5 Eats — Omnira Food',
  description: "Omnira Food's Top 5 Eats — destination guides to the five dishes you must order in the world's greatest food cities.",
  openGraph: {
    type: 'website',
    url: 'https://premirafirst.com/food/top5',
    title: 'Top 5 Eats — Omnira Food',
    description: 'Five dishes. Five reasons to visit. Omnira Food\'s city-by-city guide to the world\'s best meals.',
    images: [{ url: 'https://premirafirst.com/food/assets/og-top5.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

const destinations = [
  { num: '01', city: 'Tokyo', country: 'Japan', bg: 'linear-gradient(135deg,#0d0d0d,#1a1208,#2a1c00)' },
  { num: '02', city: 'London', country: 'United Kingdom', bg: 'linear-gradient(135deg,#0d0d0d,#0d1218,#081424)' },
  { num: '03', city: 'San Sebastián', country: 'Spain', bg: 'linear-gradient(135deg,#0d0d0d,#120d08,#241800)' },
  { num: '04', city: 'Naples', country: 'Italy', bg: 'linear-gradient(135deg,#0d0d0d,#140808,#200a00)' },
  { num: '05', city: 'Bangkok', country: 'Thailand', bg: 'linear-gradient(135deg,#0d0d0d,#0d1008,#0a1400)' },
  { num: '06', city: 'Mexico City', country: 'Mexico', bg: 'linear-gradient(135deg,#0d0d0d,#0e0d12,#0a0818)' },
]

const CompassIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.3 }}>
    <circle cx="24" cy="24" r="20" stroke="#C9A84C" strokeWidth="1.5" />
    <path d="M24 8v32M8 24h32" stroke="#C9A84C" strokeWidth="1" />
  </svg>
)

export default function Top5Page() {
  return (
    <>
      <FoodNav />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg grad-top5" style={{ backgroundImage: "url('/food/assets/top5-banner.jpg')" }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">Series</span>
          <h1 className="hero-title">Top 5<br />Eats</h1>
          <p className="hero-sub">Five dishes. Five reasons to visit. City-by-city guides to the meals that define a destination.</p>
        </div>
      </section>

      {/* SERIES INTRO */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 40px 0', textAlign: 'center' }}>
        <div className="gold-rule" />
        <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.75)' }}>
          Every city has a culinary soul. <strong style={{ color: 'var(--white)' }}>Top 5 Eats</strong> cuts through the noise to give you exactly five dishes that capture what makes eating in that city special — from the street corner staple to the restaurant you&apos;ll remember for decades.
        </p>
      </div>

      {/* DESTINATIONS GRID */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Destination Guides</h2>
        </div>
        <div className="dest-grid">
          {destinations.map(d => (
            <div key={d.num} className="dest-card">
              <div className="dest-card-img">
                <div style={{ width: '100%', height: '100%', background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CompassIcon />
                </div>
              </div>
              <div className="dest-card-body">
                <p className="dest-card-num">{d.num}</p>
                <p className="dest-card-city">{d.city}</p>
                <p className="dest-card-country">{d.country} · Coming Soon</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMING SOON */}
      <section style={{ padding: '80px 40px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '16px' }}>In Development</p>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.6rem,3.5vw,2.6rem)', fontWeight: 900, maxWidth: '560px', margin: '0 auto 16px' }}>Full city guides dropping soon.</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto' }}>Each guide covers the five dishes that define the city — from the unmissable to the surprising.</p>
      </section>

      <FoodFooter />
    </>
  )
}
