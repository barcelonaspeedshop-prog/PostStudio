import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { restaurants, getRestaurant, getRelated } from '@/lib/restaurants'
import FoodNav from '../../components/FoodNav'
import FoodFooter from '../../components/FoodFooter'
import ShareBar from '../../components/ShareBar'

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

const GRAD: Record<string, string> = {
  'grad-tokyo':  'linear-gradient(135deg,#0d0d0d 0%,#1a1208 40%,#2a1c00 100%)',
  'grad-london': 'linear-gradient(135deg,#0d0d0d 0%,#0d1218 40%,#081424 100%)',
  'grad-navarra':'linear-gradient(135deg,#0d0d0d 0%,#120d08 40%,#241800 100%)',
}


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
        <div className="hero-bg" style={{ background: `url('/food/assets/${r.slug}-hero.jpg') center/cover no-repeat, ${GRAD[r.gradClass] ?? GRAD['grad-tokyo']}` }} />
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
        <ShareBar name={r.name} shareUrlEncoded={r.shareUrlEncoded} />

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
                      <img
                        src={`/food/assets/${rel.slug}-hero.jpg`}
                        alt={rel.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                      />
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
