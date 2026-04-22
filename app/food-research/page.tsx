'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { ResearchResult } from '@/app/api/food-research/route'

export default function FoodResearchPage() {
  const router = useRouter()
  const [city, setCity]               = useState('')
  const [searchType, setSearchType]   = useState<'no-frills' | 'top5'>('no-frills')
  const [searching, setSearching]     = useState(false)
  const [results, setResults]         = useState<ResearchResult[] | null>(null)
  const [error, setError]             = useState('')
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())
  const [savingId, setSavingId]       = useState<string | null>(null)
  const [toast, setToast]             = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSearch = async () => {
    if (!city.trim()) return
    setSearching(true)
    setResults(null)
    setError('')
    try {
      const res = await fetch('/api/food-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim(), searchType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.results)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async (r: ResearchResult) => {
    const id = `${r.name}-${r.city}`
    setSavingId(id)
    try {
      const res = await fetch('/api/food-research/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSavedIds(prev => new Set([...prev, id]))
      showToast(data.duplicate ? `${r.name} already saved` : `${r.name} saved to ${r.series === 'no-frills' ? 'No Frills But Kills' : 'Top 5 Eats'}`)
    } catch {
      showToast('Failed to save — please try again')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreatePost = (r: ResearchResult) => {
    const postType = r.series === 'no-frills' ? 'no-frills' : 'restaurant-feature'
    const params = new URLSearchParams({
      postType,
      restaurantName: r.name,
      restaurantCity: r.city,
    })
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-600 mb-1">Omnira Food</p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Find Hidden Gems</h1>
          <p className="text-sm text-stone-500 mt-1">
            Use AI + web search to discover restaurants worth featuring — hidden locals&apos; favourites or must-visit icons.
          </p>
        </div>

        {/* Search form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col gap-4">

            {/* Search type toggle */}
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">Search Type</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('no-frills')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all ${
                    searchType === 'no-frills'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  🔥 No Frills But Kills
                  <span className="block text-[10px] opacity-60 font-normal mt-0.5">Hidden gems locals love</span>
                </button>
                <button
                  onClick={() => setSearchType('top5')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[13px] font-medium border transition-all ${
                    searchType === 'top5'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  🍽️ Top 5 Eats
                  <span className="block text-[10px] opacity-60 font-normal mt-0.5">Iconic must-visit spots</span>
                </button>
              </div>
            </div>

            {/* City input + search */}
            <div>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">City</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !searching && handleSearch()}
                  placeholder="e.g. Tokyo, London, Barcelona..."
                  className="flex-1 px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 text-stone-900 placeholder:text-stone-400"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !city.trim()}
                  className="px-5 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl disabled:opacity-40 hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  {searching ? 'Searching…' : 'Find Restaurants'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {searching && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
              <div>
                <p className="text-[13px] font-medium text-stone-700">Searching the web for hidden gems…</p>
                <p className="text-[12px] text-stone-400 mt-1">
                  {searchType === 'no-frills' ? 'Checking Reddit, food blogs, and local guides' : 'Finding iconic and celebrated restaurants'} in {city}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {results && !searching && (
          <div>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} · {city}
            </p>
            <div className="flex flex-col gap-4">
              {results.map((r, i) => {
                const id = `${r.name}-${r.city}`
                const saved = savedIds.has(id)
                const saving = savingId === id
                return (
                  <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h2 className="text-[15px] font-semibold text-stone-900">{r.name}</h2>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                            {r.series === 'no-frills' ? '🔥 No Frills' : '🍽️ Top 5'}
                          </span>
                        </div>
                        <p className="text-[12px] text-stone-500">{r.city}, {r.country} · {r.cuisine} · {r.priceRange}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] text-stone-400 mb-0.5">Credibility</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${r.credibilityScore * 10}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-stone-700">{r.credibilityScore}/10</span>
                        </div>
                        {r.series === 'no-frills' && (
                          <>
                            <p className="text-[10px] text-stone-400 mt-1 mb-0.5">Hidden gem</p>
                            <div className="flex items-center gap-1.5">
                              <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${r.hiddenGemScore * 10}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-stone-700">{r.hiddenGemScore}/10</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Why it kills */}
                    <p className="text-[13px] text-stone-700 leading-relaxed mb-3">{r.whyItKills}</p>

                    {/* Must try + local buzz */}
                    <div className="flex flex-col gap-1.5 mb-4">
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-stone-400 shrink-0">Must try:</span>
                        <span className="text-stone-700 font-medium">{r.mustTry}</span>
                      </div>
                      <div className="flex gap-2 text-[12px]">
                        <span className="text-stone-400 shrink-0">Local buzz:</span>
                        <span className="text-stone-600 italic">&ldquo;{r.localBuzz}&rdquo;</span>
                      </div>
                    </div>

                    {/* Sources */}
                    {r.sources && r.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {r.sources.slice(0, 3).map((src, j) => {
                          let hostname = src
                          try { hostname = new URL(src).hostname.replace('www.', '') } catch {}
                          return (
                            <a
                              key={j}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 bg-stone-50 border border-stone-200 rounded text-stone-500 hover:text-stone-800 transition-colors"
                            >
                              {hostname}
                            </a>
                          )
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-stone-100">
                      <a
                        href={`https://maps.google.com?q=${encodeURIComponent(r.mapsQuery || `${r.name} ${r.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-stone-500 hover:text-stone-800 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Maps
                      </a>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleSave(r)}
                        disabled={saved || saving}
                        className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${
                          saved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900'
                        }`}
                      >
                        {saved ? '✓ Saved' : saving ? 'Saving…' : `Add to ${r.series === 'no-frills' ? 'No Frills' : 'Top 5'}`}
                      </button>
                      <button
                        onClick={() => handleCreatePost(r)}
                        className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                      >
                        Create Post →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
