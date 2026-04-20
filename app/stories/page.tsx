'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

type StoryCategory = 'Rivalry' | 'Legend' | 'Moment' | 'Controversy' | 'Era' | 'Dynasty'
type StoryIdea = { title: string; hook: string; category: StoryCategory }
type ChannelStatus = 'idle' | 'loading' | 'loaded' | 'error'
type ChannelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; stories: StoryIdea[] }
  | { status: 'error'; message: string }

type UsedEntry = { title: string; usedAt: string }

const CATEGORY_STYLES: Record<StoryCategory, { pill: string; dot: string }> = {
  Rivalry:     { pill: 'bg-rose-50 text-rose-600 border-rose-100',     dot: 'bg-rose-400' },
  Legend:      { pill: 'bg-amber-50 text-amber-600 border-amber-100',   dot: 'bg-amber-400' },
  Moment:      { pill: 'bg-blue-50 text-blue-600 border-blue-100',      dot: 'bg-blue-400' },
  Controversy: { pill: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-400' },
  Era:         { pill: 'bg-purple-50 text-purple-600 border-purple-100', dot: 'bg-purple-400' },
  Dynasty:     { pill: 'bg-teal-50 text-teal-600 border-teal-100',      dot: 'bg-teal-400' },
}

const CHANNEL_NAMES = Object.keys(CHANNELS)

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function lastUsedDate(entries: UsedEntry[]): UsedEntry | null {
  if (!entries || entries.length === 0) return null
  return entries.reduce((a, b) => (a.usedAt > b.usedAt ? a : b))
}

export default function StoriesPage() {
  const router = useRouter()

  const [states, setStates] = useState<Record<string, ChannelState>>(
    () => Object.fromEntries(CHANNEL_NAMES.map(c => [c, { status: 'idle' } as ChannelState]))
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Record<string, Set<string>>>({})
  const [usedData, setUsedData] = useState<Record<string, UsedEntry[]>>({})
  const [using, setUsing] = useState<string | null>(null)

  // Load pacing data on mount
  useEffect(() => {
    fetch('/api/generate-stories')
      .then(r => r.json())
      .then(d => { if (d.usedStories) setUsedData(d.usedStories) })
      .catch(() => {})
  }, [])

  const generateStories = async (channel: string) => {
    setStates(prev => ({ ...prev, [channel]: { status: 'loading' } }))
    setExpanded(prev => new Set([...prev, channel]))
    try {
      const res = await fetch('/api/generate-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setStates(prev => ({ ...prev, [channel]: { status: 'loaded', stories: data.stories } }))
    } catch (e: unknown) {
      setStates(prev => ({
        ...prev,
        [channel]: { status: 'error', message: e instanceof Error ? e.message : 'Failed' },
      }))
    }
  }

  const hideStory = (channel: string, title: string) => {
    setHidden(prev => {
      const next = { ...prev }
      next[channel] = new Set([...(next[channel] || []), title])
      return next
    })
  }

  const useStory = async (channel: string, title: string) => {
    setUsing(title)
    try {
      await fetch('/api/mark-story-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, title }),
      })
      setUsedData(prev => ({
        ...prev,
        [channel]: [...(prev[channel] || []), { title, usedAt: new Date().toISOString() }],
      }))
    } catch {
      // Non-fatal — redirect regardless
    }
    router.push(`/longform?topic=${encodeURIComponent(title)}&channel=${encodeURIComponent(channel)}`)
  }

  const toggleExpand = (channel: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center gap-2 px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Story Bank</span>
          <span className="text-[12px] text-stone-400 hidden sm:inline">· Evergreen long-form ideas</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">

            {/* Category legend */}
            <div className="flex flex-wrap gap-2 pb-1">
              {(Object.keys(CATEGORY_STYLES) as StoryCategory[]).map(cat => {
                const s = CATEGORY_STYLES[cat]
                return (
                  <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.pill}`}>
                    {cat}
                  </span>
                )
              })}
              <span className="text-[10px] text-stone-400 self-center ml-1">Click any story card to see options</span>
            </div>

            {CHANNEL_NAMES.map(channel => {
              const cfg = CHANNELS[channel]
              const state = states[channel]
              const isExpanded = expanded.has(channel)
              const hiddenSet = hidden[channel] || new Set()
              const usedEntries = usedData[channel]
              const lastEntry = lastUsedDate(usedEntries || [])
              const days = lastEntry ? daysSince(lastEntry.usedAt) : null
              const isLoaded = state.status === 'loaded'
              const visibleStories = isLoaded
                ? (state as { status: 'loaded'; stories: StoryIdea[] }).stories.filter(s => !hiddenSet.has(s.title))
                : []

              return (
                <div key={channel} className="bg-white border border-stone-100 rounded-xl overflow-hidden">

                  {/* Channel header row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.primary }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-stone-900">{channel}</span>
                        {days !== null ? (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            days >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {days === 0 ? 'Used today' : days === 1 ? 'Used yesterday' : `Last used ${days}d ago`}
                          </span>
                        ) : usedEntries !== undefined ? (
                          <span className="text-[10px] text-stone-400">No stories used yet</span>
                        ) : null}
                        {days !== null && days >= 7 && (
                          <span className="text-[10px] text-amber-600 font-medium">· Due for content</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">{cfg.tagline}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Regenerate when loaded */}
                      {isLoaded && (
                        <button
                          onClick={() => generateStories(channel)}
                          className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors px-2 py-1 rounded hover:bg-stone-50"
                        >
                          ↺ Refresh
                        </button>
                      )}
                      {/* Generate button when idle or errored */}
                      {(state.status === 'idle' || state.status === 'error') && (
                        <button
                          onClick={() => generateStories(channel)}
                          className="px-3 py-1.5 text-[12px] font-medium rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                          style={{ background: cfg.primary }}
                        >
                          Generate ideas
                        </button>
                      )}
                      {/* Spinner while loading */}
                      {state.status === 'loading' && (
                        <svg className="w-4 h-4 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      )}
                      {/* Expand/collapse when loaded */}
                      {isLoaded && (
                        <button
                          onClick={() => toggleExpand(channel)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error state */}
                  {state.status === 'error' && (
                    <div className="px-4 pb-3 border-t border-stone-50">
                      <p className="text-[12px] text-red-500 pt-2">{(state as { status: 'error'; message: string }).message}</p>
                    </div>
                  )}

                  {/* Loading state */}
                  {state.status === 'loading' && (
                    <div className="px-4 pb-4 pt-2 border-t border-stone-50">
                      <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-20 bg-stone-50 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
                        ))}
                        <p className="text-[11px] text-stone-400 text-center pt-1">Sonnet is brainstorming story ideas…</p>
                      </div>
                    </div>
                  )}

                  {/* Story grid */}
                  {isLoaded && isExpanded && (
                    <div className="border-t border-stone-50 p-4">
                      {visibleStories.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-[12px] text-stone-400">All ideas dismissed — click Refresh for a fresh set</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {visibleStories.map(story => {
                            const catStyle = CATEGORY_STYLES[story.category] || CATEGORY_STYLES.Moment
                            const isUsing = using === story.title
                            return (
                              <div
                                key={story.title}
                                className="relative border border-stone-100 rounded-xl p-3.5 flex flex-col gap-2 hover:border-stone-200 hover:shadow-sm transition-all group"
                              >
                                {/* Hide button — appears on hover */}
                                <button
                                  onClick={() => hideStory(channel, story.title)}
                                  className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100 text-[14px] leading-none"
                                  title="Dismiss idea"
                                  aria-label="Dismiss"
                                >
                                  ×
                                </button>

                                {/* Category badge */}
                                <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catStyle.pill}`}>
                                  {story.category}
                                </span>

                                {/* Title */}
                                <p className="text-[13px] font-semibold text-stone-900 leading-snug pr-5">
                                  {story.title}
                                </p>

                                {/* Hook */}
                                <p className="text-[12px] text-stone-500 leading-relaxed flex-1">
                                  {story.hook}
                                </p>

                                {/* Use button */}
                                <button
                                  onClick={() => useStory(channel, story.title)}
                                  disabled={isUsing || !!using}
                                  className="mt-1 flex items-center gap-1 text-[12px] font-semibold transition-colors disabled:opacity-40 self-start"
                                  style={{ color: isUsing ? '#9ca3af' : cfg.primary }}
                                >
                                  {isUsing ? (
                                    <>
                                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                      </svg>
                                      Opening Long Form…
                                    </>
                                  ) : (
                                    <>Use this story →</>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Footer: count + total used */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50">
                        <p className="text-[10px] text-stone-400">
                          {visibleStories.length} idea{visibleStories.length !== 1 ? 's' : ''} available
                          {hiddenSet.size > 0 ? ` · ${hiddenSet.size} hidden` : ''}
                        </p>
                        {usedEntries && usedEntries.length > 0 && (
                          <p className="text-[10px] text-stone-400">
                            {usedEntries.length} stor{usedEntries.length !== 1 ? 'ies' : 'y'} used all-time
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          </div>
        </div>
      </div>
    </div>
  )
}
