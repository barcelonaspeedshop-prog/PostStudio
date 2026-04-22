'use client'
import Link from 'next/link'
import { useState } from 'react'
import { restaurants } from '@/lib/restaurants'
import FoodNav from '../components/FoodNav'
import FoodFooter from '../components/FoodFooter'

const FILTERS = ['All', 'Japan', 'Spain', 'UK', 'Tokyo', 'Navarra']

const nfbk = restaurants.filter(r => r.series === 'no-frills')

export default function NoFrillsPage() {
  const [active, setActive] = useState('All')

  const visible = nfbk.filter(r => {
    if (active === 'All') return true
    return r.country === active || r.city === active
  })

  return (
    <>
      <FoodNav />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg grad-nfbk" style={{ backgroundImage: "url('/food/assets/nfbk-banner.jpg')" }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">Series</span>
          <h1 className="hero-title">No Frills<br />But Kills</h1>
          <p className="hero-sub">The restaurants that look like nothing and taste like everything. Found in backstreets, side alleys, and small towns the guidebooks ignore.</p>
        </div>
      </section>

      {/* SERIES INTRO */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '64px 40px 0', textAlign: 'center' }}>
        <div className="gold-rule" />
        <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.75)' }}>
          A <strong style={{ color: 'var(--white)' }}>&ldquo;Kills&rdquo; rating</strong> is Omnira Food&apos;s highest honour for a no-frills restaurant. It means the food is so exceptional that the absence of atmosphere, service, or décor becomes irrelevant. These places earn their place on the list purely on what ends up on your plate.
        </p>
      </div>

      {/* FILTER + GRID */}
      <section className="section">
        <div className="filter-bar">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-btn${active === f ? ' active' : ''}`}
              onClick={() => setActive(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="card-grid card-grid--wide">
          {visible.map(r => (
            <Link key={r.slug} href={`/food/restaurant/${r.slug}`}>
              <div className="card">
                <div className="card-img">
                  <div className={`card-img-placeholder ${r.gradClass}`} />
                  <div className="card-badge"><span className="badge badge--kills">★ Kills</span></div>
                </div>
                <div className="card-body">
                  <p className="card-label">{r.country} · {r.city}</p>
                  <h3 className="card-title">{r.name}</h3>
                  <p className="card-location">{r.location}</p>
                  <p className="card-excerpt">{r.excerpt}</p>
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{r.cuisine}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>{r.priceRange}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {visible.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '40px 0', textAlign: 'center' }}>
            No restaurants found for this filter yet.
          </p>
        )}
      </section>

      <FoodFooter />
    </>
  )
}
