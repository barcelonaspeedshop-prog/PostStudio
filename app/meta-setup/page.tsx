'use client'
import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

type SetupResult = {
  channel: string
  matched: boolean
  pageName: string
  pageId: string
  tokenType: string
  instagramId: string | null
  instagramUsername: string | null
  error?: string
}

type SetupSummary = {
  pagesFound: number
  matched: number
  unmatched: number
  unmatchedPages: Array<{ id: string; name: string; instagramId: string | null }>
}

export default function MetaSetupPage() {
  const [token, setToken]       = useState('')
  const [running, setRunning]   = useState(false)
  const [results, setResults]   = useState<SetupResult[] | null>(null)
  const [summary, setSummary]   = useState<SetupSummary | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const runSetup = async () => {
    if (!token.trim()) return
    setRunning(true)
    setError(null)
    setResults(null)
    setSummary(null)

    try {
      const res  = await fetch('/api/meta-auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken: token.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      setResults(data.results || [])
      setSummary(data.summary || null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <Link href="/accounts" className="text-[12px] text-stone-400 hover:text-stone-600 transition-colors">
                ← Accounts
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-stone-900">Meta Token Setup</h1>
            <p className="text-[13px] text-stone-400 mt-1">
              Connect all Facebook Pages and Instagram accounts in one step.
            </p>
          </div>

          {/* OAuth button — preferred flow */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h2 className="text-[14px] font-semibold text-blue-900 mb-1">Automatic setup (recommended)</h2>
            <p className="text-[12px] text-blue-700 mb-4">
              Click below to sign in with Facebook. PostStudio will automatically request the required
              permissions and save permanent tokens for all connected Pages.
            </p>
            <a
              href="/api/auth/meta"
              className="inline-block px-5 py-2.5 bg-blue-600 text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect with Facebook →
            </a>
          </div>

          {/* Manual token paste — fallback */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h2 className="text-[14px] font-semibold text-stone-900 mb-1">Manual token setup</h2>
            <p className="text-[12px] text-stone-500 mb-4">
              If the automatic flow doesn&apos;t work, paste a{' '}
              <strong>User Access Token</strong> from{' '}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                Graph API Explorer
              </a>{' '}
              with these permissions:{' '}
              <code className="bg-stone-100 px-1 rounded text-[11px]">pages_show_list</code>{' '}
              <code className="bg-stone-100 px-1 rounded text-[11px]">pages_manage_posts</code>{' '}
              <code className="bg-stone-100 px-1 rounded text-[11px]">instagram_content_publish</code>
            </p>

            <textarea
              rows={4}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="EAABwzLixnjYBO..."
              className="w-full px-3 py-2.5 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono resize-none mb-3"
            />

            <button
              onClick={runSetup}
              disabled={running || !token.trim()}
              className="w-full py-3 bg-stone-900 text-white text-[13px] font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Connecting channels…
                </>
              ) : 'Connect All Channels'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-[13px] font-medium text-red-800 mb-1">Setup failed</p>
              <p className="text-[12px] text-red-600">{error}</p>
            </div>
          )}

          {/* Results */}
          {results && summary && (
            <div className="mt-5 space-y-4">
              {/* Summary banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-[14px] font-semibold text-emerald-800">
                  ✓ Setup complete
                </p>
                <p className="text-[12px] text-emerald-700 mt-1">
                  {summary.pagesFound} Facebook page{summary.pagesFound !== 1 ? 's' : ''} found ·{' '}
                  {summary.matched} channel{summary.matched !== 1 ? 's' : ''} updated with permanent tokens
                  {summary.unmatched > 0 && ` · ${summary.unmatched} unmatched`}
                </p>
              </div>

              {/* Per-channel results */}
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-[12px] font-medium text-stone-700">Channel results</p>
                </div>
                <div className="divide-y divide-stone-50">
                  {results.map(r => (
                    <div key={r.channel} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-stone-800">{r.channel}</p>
                        {r.matched ? (
                          <div className="text-[11px] text-stone-400 mt-0.5 space-y-0.5">
                            <p>Page: {r.pageName} <span className="text-stone-300">({r.pageId})</span></p>
                            {r.instagramId && (
                              <p>Instagram: @{r.instagramUsername || r.instagramId} <span className="text-stone-300">({r.instagramId})</span></p>
                            )}
                            {!r.instagramId && (
                              <p className="text-amber-500">No Instagram Business Account linked to this page</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-red-500 mt-0.5">
                            {r.error || 'Page ID not found in your Facebook account — check facebookPageId'}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {r.matched ? (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">PERMANENT</span>
                        ) : (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600">NOT MATCHED</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unmatched pages */}
              {summary.unmatchedPages.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-[12px] font-semibold text-amber-800 mb-2">
                    Pages in your account not matched to any PostStudio channel
                  </p>
                  <div className="space-y-1.5">
                    {summary.unmatchedPages.map(p => (
                      <div key={p.id} className="text-[11px] text-amber-700">
                        <span className="font-medium">{p.name}</span>{' '}
                        <span className="text-amber-500">ID: {p.id}</span>
                        {p.instagramId && <span className="text-amber-500"> · IG: {p.instagramId}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-600 mt-2">
                    To link these, add a <code className="bg-amber-100 px-1 rounded">facebookPageId</code> for each channel via the Connect form on the Accounts page.
                  </p>
                </div>
              )}

              <div className="text-center pt-2">
                <Link
                  href="/accounts"
                  className="inline-block px-5 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-lg hover:bg-stone-700 transition-colors"
                >
                  Back to Accounts →
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
