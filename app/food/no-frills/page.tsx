'use client'
import Link from 'next/link'
import { useState } from 'react'
import { restaurants } from '@/lib/restaurants'
import FoodNav from '../components/FoodNav'
import FoodFooter from '../components/FoodFooter'

const FILTERS = ['All', 'Japan', 'Spain', 'UK', 'Tokyo', 'Navarra']

const nfbk = restaurants.filter(r => r.series === 'no-frills')

function SubmitForm() {
  const [name, setName]       = useState('')
  const [city, setCity]       = useState('')
  const [why, setWhy]         = useState('')
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg]         = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !city.trim() || !why.trim()) {
      setMsg('Please fill in the required fields.')
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/food/submit-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, why, email }),
      })
      if (!res.ok) throw new Error('Submit failed')
      setStatus('done')
      setName(''); setCity(''); setWhy(''); setEmail('')
    } catch {
      setStatus('error')
      setMsg('Something went wrong. Try again.')
    }
  }

  return (
    <section style={{ padding: '80px 40px', maxWidth: '680px', margin: '0 auto' }}>
      <div className="gold-rule" style={{ marginBottom: '40px' }} />
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>
        Submit a Restaurant
      </p>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 700, marginBottom: '12px' }}>
        Know a hidden gem?
      </h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '40px' }}>
        We&apos;re always looking for No Frills But Kills candidates. If you&apos;ve eaten somewhere extraordinary that most people haven&apos;t heard of, tell us about it. We read every submission.
      </p>

      {status === 'done' ? (
        <div style={{ padding: '32px', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <p style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', marginBottom: '8px' }}>Thank you</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>We&apos;ve received your suggestion. If it earns the Kills rating, we&apos;ll be in touch.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Restaurant name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bar Pinotxo" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City / Country *</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Barcelona, Spain" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Why it kills *</label>
            <textarea
              value={why}
              onChange={e => setWhy(e.target.value)}
              placeholder="Tell us what makes it extraordinary. Be specific — the dish, the experience, why it earns a Kills rating."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Your email (optional)</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="We&apos;ll notify you if it makes the list" style={inputStyle} />
          </div>
          {status === 'error' && <p style={{ fontSize: '0.8rem', color: '#e55' }}>{msg}</p>}
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              alignSelf: 'flex-start',
              padding: '12px 32px',
              background: 'var(--gold)',
              color: 'var(--black)',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              opacity: status === 'sending' ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {status === 'sending' ? 'Submitting…' : 'Submit Restaurant →'}
          </button>
        </form>
      )}
    </section>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--surface2)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 'var(--radius)',
  color: 'var(--white)',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'inherit',
}

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
        <div className="hero-bg" style={{ background: "url('/food/assets/no-frills-hero.png') center/cover no-repeat, linear-gradient(135deg,#0d0d0d 0%,#1a0505 50%,#240800 100%)" }} />
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
                  <img
                    src={`/food/assets/${r.slug}-hero.jpg`}
                    alt={r.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                  />
                  <div className="card-badge"><span className="badge badge--kills">★ Kills</span></div>
                </div>
                <div className="card-body">
                  <p className="card-label">{r.country} · {r.city}</p>
                  <h3 className="card-title">{r.name}</h3>
                  <p className="card-location">{r.location}</p>
                  <p className="card-excerpt">{r.excerpt}</p>
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em' }}>{r.priceRange}</span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--black)',
                      background: 'var(--gold)',
                      padding: '5px 12px',
                      borderRadius: '2px',
                    }}>
                      View Restaurant →
                    </span>
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

      <SubmitForm />

      <FoodFooter />
    </>
  )
}
