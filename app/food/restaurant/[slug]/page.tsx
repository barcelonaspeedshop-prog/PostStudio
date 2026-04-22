import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { restaurants, getRestaurant, getRelated } from '@/lib/restaurants'
import FoodNav from '../../components/FoodNav'
import FoodFooter from '../../components/FoodFooter'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  return restaurants.map(r => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = getRestaurant(params.slug)
  if (!r) return {}
  return {
    title: `${r.name} — Omnira Food`,
    description: r.metaDescription,
    openGraph: {
      type: 'article',
      url: `https://premirafirst.com/food/restaurant/${r.slug}`,
      title: `${r.name} — Omnira Food`,
      description: r.ogDescription,
      images: [{ url: `https://premirafirst.com/food/assets/${r.slug}-og.jpg`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

const FBIcon = () => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
)

const IGIcon = () => (
  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)

export default function RestaurantPage({ params }: Props) {
  const r = getRestaurant(params.slug)
  if (!r) notFound()

  const related = getRelated(r)
  const seriesLabel = r.series === 'no-frills' ? 'No Frills But Kills' : 'Featured'

  return (
    <>
      <FoodNav />

      {/* HERO */}
      <section className="hero restaurant-hero">
        <div className={`hero-bg ${r.gradClass}`} style={{ backgroundImage: `url('/food/assets/${r.slug}-hero.jpg')` }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span className={`badge ${r.badgeClass}`}>{r.badge}</span>
            <span className="badge badge--top5" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}>{r.country}</span>
          </div>
          <h1 className="hero-title">{r.name}</h1>
          <div className="hero-meta">
            <span>{r.location}</span>
            <span className="dot">·</span>
            <span>{r.cuisine}</span>
            <span className="dot">·</span>
            <span>{r.priceRange}</span>
          </div>
        </div>
      </section>

      {/* BODY */}
      <article className="restaurant-body">

        {/* META ROW */}
        <div className="restaurant-meta-row">
          <div className="meta-item">
            <span className="meta-label">Series</span>
            <span className="meta-value">{seriesLabel}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Location</span>
            <span className="meta-value">{r.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Cuisine</span>
            <span className="meta-value">{r.cuisine}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Price Range</span>
            <span className="meta-value">{r.priceRange}</span>
          </div>
        </div>

        {/* THE STORY */}
        <div className="restaurant-section">
          <h2>The Story</h2>
          {r.story.map((para, i) => (
            <p
              key={i}
              className="story-text"
              style={i > 0 ? { marginTop: '16px' } : undefined}
              dangerouslySetInnerHTML={{ __html: para }}
            />
          ))}
        </div>

        {/* MUST ORDER */}
        <div className="restaurant-section">
          <h2>Must Order</h2>
          <div className="dish-list">
            {r.mustOrder.map(dish => (
              <div key={dish.name} className="dish-item">
                <div className="dish-bullet" />
                <div>
                  <p className="dish-name">{dish.name}</p>
                  <p className="dish-desc">{dish.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPENING HOURS */}
        <div className="restaurant-section">
          <h2>Opening Hours</h2>
          {r.hoursNote && (
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '8px' }}>{r.hoursNote}</p>
          )}
          <dl className="hours-grid">
            {r.hours.map(row => (
              <>
                <dt key={`dt-${row.label}`}>{row.label}</dt>
                <dd key={`dd-${row.label}`}>{row.value}</dd>
              </>
            ))}
          </dl>
        </div>

        {/* BOOK */}
        <div className="restaurant-section">
          <h2>Book a Table</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>{r.bookingNote}</p>
          {r.bookingUrl ? (
            <a href={r.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn--book">
              Reserve at {r.name} →
            </a>
          ) : (
            <a
              href={`https://maps.google.com?q=${r.directionsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline"
            >
              Get Directions
            </a>
          )}
        </div>

        {/* MAP */}
        <div className="restaurant-section">
          <h2>Find It</h2>
          <div className="map-wrap">
            <iframe
              src={`https://www.google.com/maps?q=${r.mapsEmbed}&output=embed&z=15`}
              title={`${r.name} location`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--muted)' }}>{r.mapsLabel}</p>
        </div>

        {/* SHARE */}
        <div className="share-bar">
          <span className="share-label">Share</span>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${r.shareUrlEncoded}`}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn share-btn--fb"
          >
            <FBIcon /> Facebook
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn share-btn--ig"
          >
            <IGIcon /> Instagram
          </a>
        </div>

      </article>

      {/* RELATED */}
      {related.length > 0 && (
        <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '64px 40px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '24px' }}>
              Also in {seriesLabel}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
              {related.map(rel => (
                <Link key={rel.slug} href={`/food/restaurant/${rel.slug}`}>
                  <div className="card">
                    <div className="card-img">
                      <div className={`card-img-placeholder ${rel.gradClass}`} />
                      <div className="card-badge">
                        <span className={`badge ${rel.badgeClass}`}>{rel.badge}</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <p className="card-label">{rel.city}, {rel.country}</p>
                      <h3 className="card-title">{rel.name}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FoodFooter />

      <style>{`.kills-word { color: var(--gold); }`}</style>
    </>
  )
}
