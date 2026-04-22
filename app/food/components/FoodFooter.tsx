'use client'
import Link from 'next/link'
import { useState } from 'react'

function NewsletterSignup() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/food/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{
      borderTop: '1px solid rgba(201,168,76,0.15)',
      padding: '56px 40px',
      textAlign: 'center',
      background: 'var(--surface)',
    }}>
      <p style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        marginBottom: '14px',
      }}>
        Newsletter
      </p>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
        fontWeight: 700,
        marginBottom: '10px',
      }}>
        Get the best hidden gems delivered weekly
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '28px' }}>
        No frills. No filler. Just the restaurants worth knowing about.
      </p>

      {status === 'done' ? (
        <p style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>
          ✓ You&apos;re on the list. We&apos;ll be in touch with something worth eating.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', gap: '0', maxWidth: '440px', margin: '0 auto', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)' }}
        >
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            style={{
              flex: 1,
              padding: '13px 16px',
              background: 'var(--surface2)',
              border: 'none',
              color: 'var(--white)',
              fontSize: '0.88rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              padding: '13px 22px',
              background: 'var(--gold)',
              color: 'var(--black)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              opacity: status === 'sending' ? 0.7 : 1,
            }}
          >
            {status === 'sending' ? '…' : 'Subscribe →'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <p style={{ color: '#e55', fontSize: '0.8rem', marginTop: '10px' }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}

export default function FoodFooter() {
  return (
    <>
      <NewsletterSignup />
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
    </>
  )
}
