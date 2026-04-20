'use client'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

// ── Local types (mirror server types without bundling server code) ─────────────

type StoryScore = 'High' | 'Medium' | 'Low'
type Story = {
  id: string; topic: string; headline: string; articleUrl: string
  score: StoryScore; reason: string; isFixture?: boolean; fixtureDate?: string
}
type Fixture = {
  event: string; date: string; detail?: string; type: 'preview' | 'recap'; priorityBoost: boolean
}
type ChannelStatus = 'pending' | 'building' | 'built' | 'skipped' | 'low-news'
type ChannelData = {
  status: ChannelStatus; populated_at: string; stories: Story[]
  fixtures?: Fixture[]; lowNewsDay?: boolean; error?: string
}
type Queue = { date: string; populated_at: string | null; channels: Record<string, ChannelData> }

// ── Constants ──────────────────────────────────────────────────────────────────

const SPORTS_CHANNELS = new Set([
  'Omnira F1', 'Omnira Football', 'Road & Trax', 'Omnira Cricket', 'Omnira Golf', 'Omnira NFL',
])
const ALL_CHANNELS = [
  'Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football',
  'Omnira Cricket', 'Omnira Golf', 'Omnira NFL', 'Omnira Food', 'Omnira Travel',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function setChannelStatus(queue: Queue | null, channel: string, status: ChannelStatus): Queue | null {
  if (!queue) return null
  return { ...queue, channels: { ...queue.channels, [channel]: { ...queue.channels[channel], status } } }
}

async function patchQueueStatus(channel: string, status: ChannelStatus) {
  await fetch('/api/curation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, status }),
  }).catch(() => {})
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: StoryScore }) {
  const styles: Record<StoryScore, string> = {
    High:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
    Low:    'bg-red-100 text-red-700 border border-red-200',
  }
  const dot: Record<StoryScore, string> = {
    High: 'bg-emerald-500', Medium: 'bg-amber-500', Low: 'bg-red-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[score]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[score]}`} />
      {score}
    </span>
  )
}

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function FixturePanel({ fixtures }: { fixtures: Fixture[] }) {
  if (!fixtures.length) return null
  const shown = fixtures.slice(0, 6)
  return (
    <div className="px-5 py-3 bg-stone-50/60 border-b border-stone-100">
      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">
        Upcoming fixtures
      </p>
      <div className="flex flex-col gap-1.5">
        {shown.map((f, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${f.priorityBoost ? 'bg-amber-500' : 'bg-stone-300'}`} />
            <span className={`text-[12px] font-medium flex-1 ${f.priorityBoost ? 'text-amber-800' : 'text-stone-600'}`}>
              {f.event}
              {f.detail ? <span className="font-normal text-stone-400"> · {f.detail}</span> : null}
            </span>
            <span className={`text-[11px] shrink-0 ${f.priorityBoost ? 'text-amber-600 font-semibold' : 'text-stone-400'}`}>
              {f.priorityBoost ? (f.type === 'preview' ? '⚡ Preview' : '⚡ Recap') : f.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CurationPage() {
  const [queue, setQueue] = useState<Queue | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [primaryId, setPrimaryId] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [multiSelected, setMultiSelected] = useState<Record<string, Set<string>>>({})
  const [buildingChannels, setBuildingChannels] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 6000)
  }, [])

  const initPrimaries = useCallback((channels: Record<string, ChannelData>) => {
    const init: Record<string, string> = {}
    for (const [ch, data] of Object.entries(channels)) {
      if (data.stories?.[0]) init[ch] = data.stories[0].id
    }
    setPrimaryId(prev => ({ ...prev, ...init }))
  }, [])

  useEffect(() => {
    fetch('/api/curation')
      .then(r => r.json())
      .then((data: Queue) => {
        setQueue(data)
        if (data.channels) initPrimaries(data.channels)
      })
      .catch(e => console.error('[curation] Failed to load queue:', e))
      .finally(() => setLoading(false))
  }, [initPrimaries])

  async function handleRefresh() {
    setRefreshing(true)
    showToast('Fetching today\'s stories — this takes about 60s…')
    try {
      const res = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate' }),
      })
      if (!res.ok) throw new Error('Populate failed')
      const data: Queue = await res.json()
      setQueue(data)
      if (data.channels) initPrimaries(data.channels)
      setMultiSelected({})
      setExpanded({})
      showToast('Stories refreshed — review and approve below')
    } catch {
      showToast('Failed to refresh stories — check docker logs', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  async function buildStories(channel: string, stories: Story[]) {
    if (!stories.length) return
    setBuildingChannels(prev => new Set([...prev, channel]))
    setQueue(prev => setChannelStatus(prev, channel, 'building'))
    await patchQueueStatus(channel, 'building')

    const label = stories.length === 1 ? `"${stories[0].headline}"` : `${stories.length} posts`
    showToast(`Generating ${label} for ${channel}… (3-5 min)`)

    try {
      let allOk = true
      for (const story of stories) {
        const res = await fetch('/api/auto-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channels: [channel],
            preSelected: {
              [channel]: { topic: story.topic, headline: story.headline, articleUrl: story.articleUrl },
            },
          }),
        })
        const data = await res.json()
        if (!res.ok || data.results?.[0]?.status !== 'success') allOk = false
      }

      setQueue(prev => setChannelStatus(prev, channel, 'built'))
      await patchQueueStatus(channel, 'built')
      showToast(
        allOk
          ? `Generated! Check Approvals to review and publish`
          : `Some posts failed — check Approvals for what succeeded`,
        allOk ? 'success' : 'error',
      )
    } catch {
      setQueue(prev => setChannelStatus(prev, channel, 'pending'))
      await patchQueueStatus(channel, 'pending')
      showToast('Generation failed — check docker logs', 'error')
    } finally {
      setBuildingChannels(prev => {
        const s = new Set(prev); s.delete(channel); return s
      })
    }
  }

  function handleApproveBuild(channel: string) {
    const stories = queue?.channels[channel]?.stories || []
    const pid = primaryId[channel]
    const primary = stories.find(s => s.id === pid) || stories[0]
    const extras = Array.from(multiSelected[channel] || [])
      .map(id => stories.find(s => s.id === id)).filter(Boolean) as Story[]
    buildStories(channel, primary ? [primary, ...extras] : extras)
  }

  function handleBuildSelected(channel: string) {
    const stories = queue?.channels[channel]?.stories || []
    const selected = Array.from(multiSelected[channel] || [])
      .map(id => stories.find(s => s.id === id)).filter(Boolean) as Story[]
    buildStories(channel, selected)
  }

  async function handleSkip(channel: string) {
    setQueue(prev => setChannelStatus(prev, channel, 'skipped'))
    await patchQueueStatus(channel, 'skipped')
    showToast(`${channel} skipped for today`)
  }

  function selectPrimary(channel: string, id: string) {
    setPrimaryId(prev => ({ ...prev, [channel]: id }))
    setMultiSelected(prev => {
      const s = new Set(prev[channel] || []); s.delete(id); return { ...prev, [channel]: s }
    })
  }

  function toggleMultiSelect(channel: string, id: string) {
    setMultiSelected(prev => {
      const s = new Set(prev[channel] || [])
      if (s.has(id)) s.delete(id); else s.add(id)
      return { ...prev, [channel]: s }
    })
  }

  const hasAnyStories = ALL_CHANNELS.some(ch => (queue?.channels[ch]?.stories?.length ?? 0) > 0)
  const lastRefreshed = queue?.populated_at
    ? new Date(queue.populated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />
      <main className="flex-1 px-6 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-stone-900 tracking-tight">Daily Curation</h1>
            <p className="text-[13px] text-stone-400 mt-0.5">
              {lastRefreshed
                ? `Last refreshed today at ${lastRefreshed} · ${Object.values(queue?.channels || {}).filter(c => c.stories?.length).length} channels loaded`
                : 'Review AI-scored stories and approve what gets built today'
              }
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {refreshing ? (
              <><Spinner /> Refreshing… (~60s)</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {lastRefreshed ? 'Refresh stories' : 'Load today\'s stories'}
              </>
            )}
          </button>
        </div>

        {/* Initial load spinner */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner className="w-6 h-6 text-stone-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasAnyStories && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-medium text-stone-700">No stories loaded yet</p>
              <p className="text-[13px] text-stone-400 mt-1">
                Click &ldquo;Load today&apos;s stories&rdquo; to fetch and score today&apos;s candidates
              </p>
            </div>
          </div>
        )}

        {/* Channel cards */}
        {!loading && hasAnyStories && (
          <div className="flex flex-col gap-6">
            {ALL_CHANNELS.map(channel => {
              const chData = queue?.channels[channel]
              if (!chData?.stories?.length) return null

              const cfg = CHANNELS[channel] || { primary: '#666666', bg: '#111111' }
              const colors = { primary: cfg.primary, bg: cfg.bg }
              const pid = primaryId[channel] || chData.stories[0]?.id
              const primary = chData.stories.find(s => s.id === pid) || chData.stories[0]
              const others = chData.stories.filter(s => s.id !== primary?.id)
              const sel = multiSelected[channel] || new Set<string>()
              const isBuilding = buildingChannels.has(channel)
              const fixtures = SPORTS_CHANNELS.has(channel) ? (chData.fixtures || []) : []

              return (
                <ChannelCard
                  key={channel}
                  channel={channel}
                  colors={colors}
                  status={chData.status}
                  primary={primary}
                  others={others}
                  fixtures={fixtures}
                  multiSelected={sel}
                  expanded={!!expanded[channel]}
                  buildCount={1 + sel.size}
                  isBuilding={isBuilding}
                  lowNewsDay={!!chData.lowNewsDay}
                  onToggleExpand={() => setExpanded(p => ({ ...p, [channel]: !p[channel] }))}
                  onSelectPrimary={id => selectPrimary(channel, id)}
                  onToggleMultiSelect={id => toggleMultiSelect(channel, id)}
                  onApproveBuild={() => handleApproveBuild(channel)}
                  onBuildSelected={() => handleBuildSelected(channel)}
                  onSkip={() => handleSkip(channel)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium z-50 flex items-center gap-2 max-w-sm animate-in fade-in slide-in-from-bottom-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.type === 'error' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Channel card ───────────────────────────────────────────────────────────────

function ChannelCard({
  channel, colors, status, primary, others, fixtures,
  multiSelected, expanded, buildCount, isBuilding, lowNewsDay,
  onToggleExpand, onSelectPrimary, onToggleMultiSelect,
  onApproveBuild, onBuildSelected, onSkip,
}: {
  channel: string
  colors: { primary: string; bg: string }
  status: ChannelStatus
  primary: Story
  others: Story[]
  fixtures: Fixture[]
  multiSelected: Set<string>
  expanded: boolean
  buildCount: number
  isBuilding: boolean
  lowNewsDay: boolean
  onToggleExpand: () => void
  onSelectPrimary: (id: string) => void
  onToggleMultiSelect: (id: string) => void
  onApproveBuild: () => void
  onBuildSelected: () => void
  onSkip: () => void
}) {
  const hasExtras = multiSelected.size > 0
  const isSkipped = status === 'skipped'
  const isBuilt = status === 'built'

  const statusBadge = isBuilding ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-medium">
      <Spinner className="w-2.5 h-2.5" /> Generating…
    </span>
  ) : isBuilt ? (
    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium">
      Built today ✓
    </span>
  ) : isSkipped ? (
    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-[10px] font-medium">
      Skipped today
    </span>
  ) : lowNewsDay ? (
    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-medium">
      Low news day
    </span>
  ) : null

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

      {/* Dark channel header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: colors.primary, boxShadow: `0 0 8px ${colors.primary}88` }}
          />
          <span className="text-white text-[14px] font-semibold tracking-tight truncate">{channel}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-medium shrink-0">
            {others.length + 1} stories
          </span>
          {statusBadge}
        </div>
        {!isBuilding && (
          <button
            onClick={onSkip}
            className="px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors shrink-0 ml-2"
          >
            {isSkipped ? 'Un-skip' : 'Skip today'}
          </button>
        )}
      </div>

      {/* Fixture panel for sports channels */}
      {fixtures.length > 0 && <FixturePanel fixtures={fixtures} />}

      <div className="p-5 flex flex-col gap-4">

        {/* Primary / top story */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Top story</span>
            {primary.isFixture && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-semibold">
                FIXTURE
              </span>
            )}
          </div>
          <div className="rounded-xl border-2 border-stone-200 bg-stone-50 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <ScoreBadge score={primary.score} />
                </div>
                <p className="text-[15px] font-semibold text-stone-900 leading-snug">{primary.headline}</p>
                <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">{primary.topic}</p>
                <p className="text-[11px] text-stone-400 mt-1.5 italic">
                  <span className="not-italic font-medium text-stone-500">Why:</span> {primary.reason}
                </p>
              </div>
              {primary.articleUrl && !primary.articleUrl.startsWith('https://example') && (
                <a
                  href={primary.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-stone-300 hover:text-stone-500 transition-colors mt-0.5"
                  title="Open source article"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-200">
              <button
                onClick={onApproveBuild}
                disabled={isBuilding}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: isBuilding ? '#94a3b8' : colors.primary }}
              >
                {isBuilding ? (
                  <><Spinner /> Generating…</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {hasExtras
                      ? `Approve & Build ${buildCount} posts`
                      : isBuilt ? 'Re-generate' : 'Approve & Build'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Other stories */}
        {others.length > 0 && (
          <div>
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 text-[12px] text-stone-400 hover:text-stone-600 transition-colors mb-2"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expanded
                ? `Hide other stories${multiSelected.size > 0 ? ` · ${multiSelected.size} selected` : ''}`
                : `${others.length} other stor${others.length === 1 ? 'y' : 'ies'}${multiSelected.size > 0 ? ` · ${multiSelected.size} selected` : ''}`
              }
            </button>

            {expanded && (
              <div className="flex flex-col gap-2">
                {others.map(story => {
                  const checked = multiSelected.has(story.id)
                  return (
                    <div
                      key={story.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        checked ? 'border-blue-200 bg-blue-50/60' : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleMultiSelect(story.id)}
                          title={checked ? 'Deselect' : 'Add to build queue'}
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked ? 'bg-blue-500 border-blue-500' : 'border-stone-300 hover:border-blue-400'
                          }`}
                        >
                          {checked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ScoreBadge score={story.score} />
                            {story.isFixture && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-semibold">
                                FIXTURE
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-medium text-stone-900 leading-snug">{story.headline}</p>
                          <p className="text-[11px] text-stone-400 mt-1 italic">
                            <span className="not-italic font-medium text-stone-500">Why:</span> {story.reason}
                          </p>
                        </div>
                        <button
                          onClick={() => onSelectPrimary(story.id)}
                          className="shrink-0 text-[11px] text-stone-400 hover:text-stone-700 font-medium transition-colors whitespace-nowrap mt-0.5"
                          title="Use as top story"
                        >
                          Use this instead →
                        </button>
                      </div>
                    </div>
                  )
                })}

                {multiSelected.size > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                    <span className="text-[12px] text-stone-500">
                      {multiSelected.size} additional stor{multiSelected.size === 1 ? 'y' : 'ies'} selected
                    </span>
                    <button
                      onClick={onBuildSelected}
                      disabled={isBuilding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-[12px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Build {multiSelected.size} selected separately
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
