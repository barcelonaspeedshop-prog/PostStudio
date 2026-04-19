'use client'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

type StoryScore = 'High' | 'Medium' | 'Low'

type CurationStory = {
  id: string
  topic: string
  headline: string
  articleUrl: string
  score: StoryScore
  reason: string
  isFixture?: boolean
  fixtureDate?: string
}

type CurationFixture = {
  event: string
  date: string
  detail?: string
  type: 'preview' | 'recap'
  priorityBoost: boolean
}

type ChannelStatus = 'pending' | 'building' | 'built' | 'skipped' | 'low-news'

type ChannelQueue = {
  status: ChannelStatus
  populated_at: string
  suggested_id: string | null
  stories: CurationStory[]
  fixtures?: CurationFixture[]
  lowNewsDay?: boolean
  error?: string
}

type Queue = {
  date: string
  populated_at: string | null
  channels: Record<string, ChannelQueue>
}

type ChannelSettings = {
  autoSkip: boolean
}

const ALL_CHANNELS = [
  'Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football',
  'Omnira Cricket', 'Omnira Golf', 'Omnira NFL', 'Omnira Food', 'Omnira Travel',
]

const CHANNEL_COLORS: Record<string, { primary: string; bg: string }> = {
  'Gentlemen of Fuel': { primary: '#e8a020', bg: '#1a1208' },
  'Omnira F1': { primary: '#378add', bg: '#0a1628' },
  'Road & Trax': { primary: '#5dcaa5', bg: '#081410' },
  'Omnira Football': { primary: '#d85a30', bg: '#1a0c08' },
  'Omnira Cricket': { primary: '#16a34a', bg: '#0a1a0e' },
  'Omnira Golf': { primary: '#15803d', bg: '#081408' },
  'Omnira NFL': { primary: '#dc2626', bg: '#1a0808' },
  'Omnira Food': { primary: '#ea580c', bg: '#1a0c08' },
  'Omnira Travel': { primary: '#0891b2', bg: '#08141a' },
}

const SPORTS_CHANNELS = new Set([
  'Omnira F1', 'Omnira Football', 'Road & Trax',
  'Omnira Cricket', 'Omnira Golf', 'Omnira NFL',
])

// Check if it's past 11am in Barcelona (Europe/Madrid, UTC+1/+2)
function isPast11amBarcelona(): boolean {
  const now = new Date()
  const barcelonaTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    hour12: false,
  }).format(now)
  return parseInt(barcelonaTime, 10) >= 11
}

function getBarcelonaHour(): number {
  const now = new Date()
  const barcelonaTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    hour12: false,
  }).format(now)
  return parseInt(barcelonaTime, 10)
}

function ScoreBadge({ score }: { score: StoryScore }) {
  const styles: Record<StoryScore, string> = {
    High: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
    Low: 'bg-red-100 text-red-700 border border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${styles[score]}`}>
      {score}
    </span>
  )
}

function StatusPill({ status }: { status: ChannelStatus }) {
  const map: Record<ChannelStatus, { label: string; cls: string }> = {
    pending: { label: 'Ready to review', cls: 'bg-stone-100 text-stone-500' },
    building: { label: 'Building…', cls: 'bg-blue-100 text-blue-700' },
    built: { label: 'Built', cls: 'bg-emerald-100 text-emerald-700' },
    skipped: { label: 'Skipped', cls: 'bg-stone-100 text-stone-400' },
    'low-news': { label: 'Low news day', cls: 'bg-amber-100 text-amber-700' },
  }
  const { label, cls } = map[status] || map.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function CurationPage() {
  const [queue, setQueue] = useState<Queue | null>(null)
  const [settings, setSettings] = useState<Record<string, ChannelSettings>>({})
  const [loading, setLoading] = useState(true)
  const [populatingChannels, setPopulatingChannels] = useState<Set<string>>(new Set())
  const [buildingChannels, setBuildingChannels] = useState<Set<string>>(new Set())
  const [buildStep, setBuildStep] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  // multi-select: channel → set of selected story IDs (beyond the primary)
  const [multiSelected, setMultiSelected] = useState<Record<string, Set<string>>>({})
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [barcelonaHour, setBarcelonaHour] = useState(getBarcelonaHour())

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Update Barcelona hour every minute
  useEffect(() => {
    const interval = setInterval(() => setBarcelonaHour(getBarcelonaHour()), 60000)
    return () => clearInterval(interval)
  }, [])

  const showToast = useCallback((msg: string, type: 'error' | 'success' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/curation')
      if (res.ok) setQueue(await res.json())
    } catch {
      showToast('Failed to load curation queue', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/curation/settings')
      if (res.ok) setSettings(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    loadQueue()
    loadSettings()
  }, [loadQueue, loadSettings])

  async function populateChannel(channel: string) {
    setPopulatingChannels(prev => new Set(prev).add(channel))
    try {
      const res = await fetch('/api/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate', channels: [channel] }),
      })
      const data = await res.json()
      if (res.ok) setQueue(data)
      else showToast(`Failed to populate ${channel}`, 'error')
    } catch {
      showToast(`Error populating ${channel}`, 'error')
    } finally {
      setPopulatingChannels(prev => { const s = new Set(prev); s.delete(channel); return s })
    }
  }

  async function populateAll() {
    const channelsToRun = ALL_CHANNELS.filter(ch => !queue?.channels[ch]?.stories?.length)
    if (channelsToRun.length === 0) {
      showToast('All channels already have today\'s stories', 'success')
      return
    }
    for (const channel of channelsToRun) {
      await populateChannel(channel)
    }
  }

  async function buildSingleStory(channel: string, story: CurationStory): Promise<boolean> {
    const res = await fetch('/api/auto-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channels: [channel],
        preSelected: {
          [channel]: {
            topic: story.topic,
            headline: story.headline,
            articleUrl: story.articleUrl,
          },
        },
      }),
    })
    const data = await res.json()
    return data.results?.some(
      (r: { channel: string; status: string }) => r.channel === channel && r.status === 'success'
    ) ?? false
  }

  async function handleBuild(channel: string) {
    const channelQueue = queue?.channels[channel]
    if (!channelQueue) return

    const primaryId = overrides[channel] || channelQueue.suggested_id
    const primaryStory = channelQueue.stories.find(s => s.id === primaryId)
    if (!primaryStory) { showToast('No story selected', 'error'); return }

    const extraIds = Array.from(multiSelected[channel] || []).filter(id => id !== primaryId)
    const extraStories = extraIds.map(id => channelQueue.stories.find(s => s.id === id)).filter(Boolean) as CurationStory[]
    const allStories = [primaryStory, ...extraStories]
    const total = allStories.length

    setBuildingChannels(prev => new Set(prev).add(channel))
    setBuildStep(prev => ({ ...prev, [channel]: total > 1 ? `Building 1 of ${total}…` : 'Generating slides…' }))

    try {
      await fetch('/api/curation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, status: 'building' }),
      })

      let anySucceeded = false
      for (let i = 0; i < allStories.length; i++) {
        const story = allStories[i]
        if (total > 1) setBuildStep(prev => ({ ...prev, [channel]: `Building ${i + 1} of ${total}…` }))
        else setBuildStep(prev => ({ ...prev, [channel]: 'Fetching images…' }))

        const ok = await buildSingleStory(channel, story)
        if (ok) anySucceeded = true
      }

      await fetch('/api/curation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, status: anySucceeded ? 'built' : 'pending' }),
      })

      if (anySucceeded) {
        const label = total > 1 ? `${total} posts built for ${channel}` : `${channel} built — check Approvals`
        showToast(label, 'success')
        setMultiSelected(prev => { const n = { ...prev }; delete n[channel]; return n })
        await loadQueue()
      } else {
        showToast('Build failed', 'error')
        await loadQueue()
      }
    } catch {
      showToast('Build failed', 'error')
    } finally {
      setBuildingChannels(prev => { const s = new Set(prev); s.delete(channel); return s })
      setBuildStep(prev => { const n = { ...prev }; delete n[channel]; return n })
    }
  }

  async function handleSkip(channel: string) {
    await fetch('/api/curation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, status: 'skipped' }),
    })
    await loadQueue()
  }

  async function handleReset(channel: string) {
    await fetch('/api/curation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, status: 'pending' }),
    })
    await loadQueue()
  }

  async function handleToggleAutoSkip(channel: string) {
    const current = settings[channel]?.autoSkip ?? false
    const next = !current
    setSettings(prev => ({ ...prev, [channel]: { ...prev[channel], autoSkip: next } }))
    try {
      await fetch('/api/curation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, autoSkip: next }),
      })
    } catch {
      setSettings(prev => ({ ...prev, [channel]: { ...prev[channel], autoSkip: current } }))
    }
  }

  function toggleMultiSelect(channel: string, storyId: string) {
    setMultiSelected(prev => {
      const current = new Set(prev[channel] || [])
      if (current.has(storyId)) current.delete(storyId)
      else current.add(storyId)
      return { ...prev, [channel]: current }
    })
  }

  const populated = ALL_CHANNELS.filter(ch => queue?.channels[ch]?.stories?.length)
  const unpopulated = ALL_CHANNELS.filter(ch => !queue?.channels[ch]?.stories?.length)
  const pendingReview = ALL_CHANNELS.filter(ch => {
    const ch_q = queue?.channels[ch]
    return ch_q && ch_q.stories.length > 0 && ch_q.status === 'pending'
  })

  const showNudge = barcelonaHour >= 11 && pendingReview.length > 0

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />
      <main className="flex-1 px-6 py-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold text-stone-900 tracking-tight">Daily Curation</h1>
            <p className="text-[13px] text-stone-400 mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            {unpopulated.length > 0 && (
              <button
                onClick={populateAll}
                disabled={populatingChannels.size > 0}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white text-[13px] font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {populatingChannels.size > 0 ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Fetching stories…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Fetch all stories
                  </>
                )}
              </button>
            )}
            {populated.length > 0 && unpopulated.length === 0 && (
              <button
                onClick={populateAll}
                disabled={populatingChannels.size > 0}
                className="flex items-center gap-2 px-3 py-1.5 border border-stone-200 text-stone-600 text-[12px] rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh all
              </button>
            )}
          </div>
        </div>

        {/* 11am nudge banner */}
        {showNudge && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] text-amber-800 font-medium">
              {pendingReview.length} channel{pendingReview.length !== 1 ? 's' : ''} still awaiting review —{' '}
              <span className="font-normal">approve or skip before posts go unbuilt today.</span>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48 text-stone-400 text-[13px]">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {ALL_CHANNELS.map(channel => (
              <ChannelCard
                key={channel}
                channel={channel}
                channelQueue={queue?.channels[channel] ?? null}
                autoSkip={settings[channel]?.autoSkip ?? false}
                isPopulating={populatingChannels.has(channel)}
                isBuilding={buildingChannels.has(channel)}
                buildStep={buildStep[channel] || ''}
                expanded={!!expanded[channel]}
                selectedStoryId={overrides[channel] || queue?.channels[channel]?.suggested_id || null}
                multiSelected={multiSelected[channel] || new Set()}
                onPopulate={() => populateChannel(channel)}
                onBuild={() => handleBuild(channel)}
                onSkip={() => handleSkip(channel)}
                onReset={() => handleReset(channel)}
                onToggleExpand={() => setExpanded(p => ({ ...p, [channel]: !p[channel] }))}
                onSelectStory={(storyId) => setOverrides(p => ({ ...p, [channel]: storyId }))}
                onToggleMultiSelect={(storyId) => toggleMultiSelect(channel, storyId)}
                onToggleAutoSkip={() => handleToggleAutoSkip(channel)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium z-50 flex items-center gap-2 transition-all ${
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

function ChannelCard({
  channel,
  channelQueue,
  autoSkip,
  isPopulating,
  isBuilding,
  buildStep,
  expanded,
  selectedStoryId,
  multiSelected,
  onPopulate,
  onBuild,
  onSkip,
  onReset,
  onToggleExpand,
  onSelectStory,
  onToggleMultiSelect,
  onToggleAutoSkip,
}: {
  channel: string
  channelQueue: ChannelQueue | null
  autoSkip: boolean
  isPopulating: boolean
  isBuilding: boolean
  buildStep: string
  expanded: boolean
  selectedStoryId: string | null
  multiSelected: Set<string>
  onPopulate: () => void
  onBuild: () => void
  onSkip: () => void
  onReset: () => void
  onToggleExpand: () => void
  onSelectStory: (id: string) => void
  onToggleMultiSelect: (id: string) => void
  onToggleAutoSkip: () => void
}) {
  const colors = CHANNEL_COLORS[channel] || { primary: '#888', bg: '#111' }
  const isSports = SPORTS_CHANNELS.has(channel)
  const stories = channelQueue?.stories || []
  const fixtures = channelQueue?.fixtures || []
  const status = channelQueue?.status || 'pending'
  const suggestedId = channelQueue?.suggested_id
  const selectedStory = stories.find(s => s.id === selectedStoryId) || stories[0] || null
  const otherStories = stories.filter(s => s.id !== selectedStory?.id)
  const isBuilt = status === 'built'
  const isSkipped = status === 'skipped'
  const isLowNews = channelQueue?.lowNewsDay

  const extraBuildCount = multiSelected.size

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm flex flex-col ${
      isBuilt ? 'border-emerald-200' : isSkipped ? 'border-stone-100 opacity-60' : 'border-stone-200'
    }`}>
      {/* Channel header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}cc 100%)` }}
      >
        <div>
          <span className="text-white text-[13px] font-semibold">{channel}</span>
          {channelQueue && (
            <div className="mt-0.5">
              <StatusPill status={status} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-skip toggle */}
          {channelQueue && !isBuilt && (
            <button
              onClick={onToggleAutoSkip}
              title={autoSkip ? 'Auto-skip on low news days (click to disable)' : 'Auto-skip disabled (click to enable)'}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium transition-colors ${
                autoSkip ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/10 text-white/40 border border-white/10 hover:bg-white/15'
              }`}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto-skip
            </button>
          )}
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: colors.primary, boxShadow: `0 0 6px ${colors.primary}` }}
          />
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Empty state — not yet populated */}
        {!channelQueue && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <svg className="w-8 h-8 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-[12px] text-stone-400">No stories fetched yet</p>
            <button
              onClick={onPopulate}
              disabled={isPopulating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-[12px] font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              {isPopulating ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Fetching…
                </>
              ) : 'Fetch stories'}
            </button>
          </div>
        )}

        {/* Populated state — no stories found */}
        {channelQueue && stories.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-[12px] text-stone-400">{channelQueue.error ? `Error: ${channelQueue.error}` : 'No stories found for today.'}</p>
            <button onClick={onPopulate} disabled={isPopulating} className="mt-2 text-[11px] text-stone-500 underline">
              Retry
            </button>
          </div>
        )}

        {/* Low news day warning */}
        {isLowNews && stories.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[11px] text-amber-700 font-medium">Low news day — top story scores Low</p>
          </div>
        )}

        {/* Suggested / selected story */}
        {selectedStory && (
          <div className={`rounded-xl border-2 p-3 flex flex-col gap-2 ${
            isBuilt ? 'border-emerald-300 bg-emerald-50' : 'border-stone-300 bg-stone-50'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <ScoreBadge score={selectedStory.score} />
                  {selectedStory.isFixture && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      Fixture
                    </span>
                  )}
                  {selectedStory.id === suggestedId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-stone-400">
                      Suggested
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-stone-900 leading-tight">{selectedStory.headline}</p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-snug line-clamp-2">{selectedStory.topic}</p>
                <p className="text-[10px] text-stone-400 mt-1 italic leading-snug">{selectedStory.reason}</p>
              </div>
              {selectedStory.articleUrl && (
                <a
                  href={selectedStory.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
                  title="Open source article"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Build actions */}
            {!isBuilt && !isSkipped && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={onBuild}
                  disabled={isBuilding}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: isBuilding ? '#888' : colors.primary }}
                >
                  {isBuilding ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {buildStep || 'Building…'}
                    </>
                  ) : extraBuildCount > 0 ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Build {extraBuildCount + 1} separate posts
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approve &amp; Build
                    </>
                  )}
                </button>
                {isLowNews && (
                  <button
                    onClick={onSkip}
                    className="px-3 py-2 rounded-lg text-[12px] text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
                  >
                    Skip today
                  </button>
                )}
              </div>
            )}

            {isBuilt && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-emerald-700 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  In Approvals
                </span>
                <button onClick={onReset} className="text-[11px] text-stone-400 hover:text-stone-600 underline">
                  Reset
                </button>
              </div>
            )}

            {isSkipped && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-stone-400">Skipped for today</span>
                <button onClick={onReset} className="text-[11px] text-stone-500 hover:text-stone-700 underline">
                  Undo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Other stories toggle + multi-select list */}
        {otherStories.length > 0 && !isBuilt && !isSkipped && (
          <div>
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {expanded
                ? `Hide${multiSelected.size > 0 ? ` (${multiSelected.size} selected)` : ''}`
                : `${otherStories.length} more stor${otherStories.length === 1 ? 'y' : 'ies'}${multiSelected.size > 0 ? ` · ${multiSelected.size} selected` : ''}`
              }
            </button>

            {expanded && (
              <div className="mt-2 flex flex-col gap-1.5">
                {otherStories.map(story => {
                  const isChecked = multiSelected.has(story.id)
                  return (
                    <div
                      key={story.id}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        isChecked ? 'border-blue-300 bg-blue-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Checkbox for multi-select */}
                        <button
                          onClick={() => onToggleMultiSelect(story.id)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-blue-500 border-blue-500' : 'border-stone-300 hover:border-blue-400'
                          }`}
                          title={isChecked ? 'Deselect' : 'Also build this story'}
                        >
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <ScoreBadge score={story.score} />
                            {story.isFixture && (
                              <span className="text-[9px] text-blue-600 font-medium">Fixture</span>
                            )}
                          </div>
                          <p className="text-[12px] font-medium text-stone-800 leading-tight">{story.headline}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5 leading-snug line-clamp-1">{story.reason}</p>
                        </div>
                        {/* Use as primary */}
                        <button
                          onClick={() => onSelectStory(story.id)}
                          className="shrink-0 text-[10px] text-stone-400 hover:text-stone-600 pt-0.5 transition-colors"
                          title="Use as primary story"
                        >
                          Use →
                        </button>
                      </div>
                    </div>
                  )
                })}
                {multiSelected.size > 0 && (
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    {multiSelected.size} additional stor{multiSelected.size === 1 ? 'y' : 'ies'} selected — click &quot;Build {multiSelected.size + 1} separate posts&quot; above
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fixtures panel — sports channels only */}
        {isSports && fixtures.length > 0 && (
          <div className="border-t border-stone-100 pt-3">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Upcoming fixtures</p>
            <div className="flex flex-col gap-1.5">
              {fixtures.slice(0, 4).map((f, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${f.priorityBoost ? 'bg-blue-50 border border-blue-100' : 'bg-stone-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-stone-800 leading-tight">{f.event}</p>
                    {f.detail && <p className="text-[10px] text-stone-400">{f.detail}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-stone-500">{f.date}</p>
                    {f.priorityBoost && (
                      <span className={`text-[9px] font-semibold ${f.type === 'recap' ? 'text-amber-600' : 'text-blue-600'}`}>
                        {f.type === 'recap' ? '● Recap' : '● Preview'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh button when already populated */}
        {channelQueue && stories.length > 0 && !isBuilt && (
          <button
            onClick={onPopulate}
            disabled={isPopulating}
            className="mt-auto text-[11px] text-stone-400 hover:text-stone-600 underline self-start transition-colors"
          >
            {isPopulating ? 'Refreshing…' : 'Refresh stories'}
          </button>
        )}
      </div>
    </div>
  )
}
