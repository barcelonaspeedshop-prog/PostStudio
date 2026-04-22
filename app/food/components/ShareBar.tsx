'use client'
import { useState } from 'react'

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

const LinkIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)

type Props = { name: string; shareUrlEncoded: string }

export default function ShareBar({ name, shareUrlEncoded }: Props) {
  const [copied, setCopied] = useState(false)
  const url = decodeURIComponent(shareUrlEncoded)

  const igText = encodeURIComponent(`${name} — discovered on Omnira Food.\n\n${url}`)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: ignore
    }
  }

  return (
    <div className="share-bar">
      <span className="share-label">Share</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn--fb"
      >
        <FBIcon /> Facebook
      </a>
      <a
        href={`https://www.instagram.com/create/story?url=${shareUrlEncoded}&text=${igText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn share-btn--ig"
        title="Open Instagram and paste the link to share in your story"
      >
        <IGIcon /> Instagram
      </a>
      <button
        onClick={handleCopy}
        className="share-btn share-btn--copy"
        style={{
          background: 'var(--surface2)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: copied ? 'var(--gold)' : 'var(--muted)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: 'var(--radius)',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          transition: 'color 0.2s, border-color 0.2s',
        }}
      >
        <LinkIcon /> {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
