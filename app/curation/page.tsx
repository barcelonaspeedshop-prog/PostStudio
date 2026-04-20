'use client'
import { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'

type StoryScore = 'High' | 'Medium' | 'Low'

type Story = {
  id: string
  topic: string
  headline: string
  articleUrl: string
  score: StoryScore
  reason: string
}

const CHANNEL_COLORS: Record<string, { primary: string; bg: string }> = {
  'Omnira F1':       { primary: '#378add', bg: '#0a1628' },
  'Omnira Football': { primary: '#d85a30', bg: '#1a0c08' },
}

const SCORED_CHANNELS = ['Omnira F1', 'Omnira Football']

// Hardcoded sample stories — scored by the real /api/curation/score endpoint
const SAMPLE_STORIES: Record<string, Omit<Story, 'id' | 'score' | 'reason'>[]> = {
  'Omnira F1': [
    {
      topic: 'Max Verstappen sets an all-time qualifying lap record at Monaco Grand Prix, claiming pole position ahead of Leclerc and Hamilton',
      headline: 'Verstappen smashes Monaco qualifying record',
      articleUrl: 'https://example.com/f1-monaco-pole',
    },
    {
      topic: 'Charles Leclerc crashes out heavily during Q3 at Monaco, will start Sunday\'s race from the pit lane after car damage',
      headline: 'Leclerc crashes in Q3, starts from pit lane',
      articleUrl: 'https://example.com/f1-leclerc-crash',
    },
    {
      topic: 'Red Bull Racing and Aston Martin locked in legal dispute over suspected aerodynamic data sharing between engineering staff',
      headline: 'Red Bull and Aston Martin in aero spy row',
      articleUrl: 'https://example.com/f1-redbull-aston',
    },
    {
      topic: 'Mercedes brings the most significant floor upgrade of the 2026 season to Monaco, targeting improved downforce in medium-speed corners',
      headline: 'Mercedes reveals major Monaco floor upgrade',
      articleUrl: 'https://example.com/f1-merc-upgrade',
    },
    {
      topic: 'Fernando Alonso celebrates his 300th Formula 1 race start this weekend at Monaco, reflecting on a career spanning three decades',
      headline: 'Alonso reaches 300 F1 race milestone at Monaco',
      articleUrl: 'https://example.com/f1-alonso-300',
    },
    {
      topic: 'Red Bull Racing unveils a special-edition glossy gold livery for the Monaco Grand Prix weekend in partnership with title sponsor Oracle',
      headline: 'Red Bull reveals glitzy Monaco gold livery',
      articleUrl: 'https://example.com/f1-rb-livery',
    },
    {
      topic: 'Liam Lawson shares his childhood memories of watching the Monaco Grand Prix and what it means to compete on the famous street circuit',
      headline: 'Lawson opens up on Monaco childhood dream',
      articleUrl: 'https://example.com/f1-lawson-feature',
    },
  ],
  'Omnira Football': [
    {
      topic: 'Arsenal beat Chelsea 3-1 in the north London derby to move three points clear at the top of the Premier League with four games remaining',
      headline: 'Arsenal beat Chelsea to go top of the PL',
      articleUrl: 'https://example.com/football-arsenal-chelsea',
    },
    {
      topic: 'Liverpool confirm the signing of Florian Wirtz from Bayer Leverkusen for a British transfer record fee of £116 million on a five-year deal',
      headline: 'Liverpool sign Wirtz for British record £116m',
      articleUrl: 'https://example.com/football-wirtz-liverpool',
    },
    {
      topic: 'Erling Haaland scores a first-half hat-trick as Manchester City thrash Wolverhampton Wanderers 5-0 at the Etihad Stadium',
      headline: 'Haaland hat-trick as City hammer Wolves 5-0',
      articleUrl: 'https://example.com/football-haaland-hattrick',
    },
    {
      topic: 'Tottenham Hotspur announce the appointment of Mauricio Pochettino as head coach on a three-year contract following sacking of Ange Postecoglou',
      headline: 'Spurs appoint Pochettino as new manager',
      articleUrl: 'https://example.com/football-spurs-poch',
    },
    {
      topic: 'Newcastle United midfielder Bruno Guimarães faces a potential four-week injury layoff after sustaining a hamstring strain in training',
      headline: 'Newcastle\'s Guimarães out for four weeks',
      articleUrl: 'https://example.com/football-newcastle-injury',
    },
    {
      topic: 'The Premier League confirms new financial fair play rules and profit-and-sustainability regulations will come into effect from next season',
      headline: 'Premier League announces updated FFP rules',
      articleUrl: 'https://example.com/football-ffp-rules',
    },
    {
      topic: 'Sheffield United win the Championship play-off final at Wembley 2-1 against Leeds United to secure a Premier League return after one season away',
      headline: 'Sheffield United win playoff final, promoted',
      articleUrl: 'https://example.com/football-sheffield-promoted',
    },
  ],
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

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

export default function CurationPage() {
  const [channelStories, setChannelStories] = useState<Record<string, Story[]>>({})
  const [primaryId, setPrimaryId] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [multiSelected, setMultiSelected] = useState<Record<string, Set<string>>>({})
  const [scoring, setScoring] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  async function loadSampleStories() {
    setScoring(true)
    try {
      const results = await Promise.all(
        SCORED_CHANNELS.map(async channel => {
          const samples = SAMPLE_STORIES[channel]
          const res = await fetch('/api/curation/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, stories: samples }),
          })
          if (!res.ok) throw new Error(`Failed to score ${channel}`)
          const data = await res.json()
          const sorted = (data.scored as Story[]).sort((a, b) => {
            const order: Record<StoryScore, number> = { High: 0, Medium: 1, Low: 2 }
            return order[a.score] - order[b.score]
          })
          return { channel, stories: sorted }
        })
      )

      const next: Record<string, Story[]> = {}
      const nextPrimary: Record<string, string> = {}
      for (const { channel, stories } of results) {
        next[channel] = stories
        if (stories[0]) nextPrimary[channel] = stories[0].id
      }
      setChannelStories(next)
      setPrimaryId(nextPrimary)
      setMultiSelected({})
      setExpanded({})
      showToast('Stories scored — review and approve below', 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to score stories', 'error')
    } finally {
      setScoring(false)
    }
  }

  function selectPrimary(channel: string, id: string) {
    setPrimaryId(prev => ({ ...prev, [channel]: id }))
    // deselect from multi if it becomes primary
    setMultiSelected(prev => {
      const s = new Set(prev[channel] || [])
      s.delete(id)
      return { ...prev, [channel]: s }
    })
  }

  function toggleMultiSelect(channel: string, id: string) {
    setMultiSelected(prev => {
      const s = new Set(prev[channel] || [])
      if (s.has(id)) s.delete(id); else s.add(id)
      return { ...prev, [channel]: s }
    })
  }

  function handleApproveBuild(channel: string) {
    const stories = channelStories[channel] || []
    const pid = primaryId[channel]
    const primary = stories.find(s => s.id === pid) || stories[0]
    const extras = Array.from(multiSelected[channel] || [])
      .map(id => stories.find(s => s.id === id))
      .filter(Boolean) as Story[]
    const all = primary ? [primary, ...extras] : extras
    console.log('[Curation] Approve & Build →', { channel, stories: all })
    showToast(
      all.length > 1
        ? `Build 3 will fire ${all.length} posts for ${channel}`
        : `Build 3 will generate: "${primary?.headline}"`,
      'success',
    )
  }

  function handleSkip(channel: string) {
    console.log('[Curation] Skip today →', { channel })
    showToast(`${channel} skipped for today`, 'success')
  }

  function handleBuildSelected(channel: string) {
    const stories = channelStories[channel] || []
    const selected = Array.from(multiSelected[channel] || [])
      .map(id => stories.find(s => s.id === id))
      .filter(Boolean) as Story[]
    console.log('[Curation] Build from selected →', { channel, stories: selected })
    showToast(`Build 3 will fire ${selected.length} post${selected.length !== 1 ? 's' : ''} for ${channel}`, 'success')
  }

  const hasAnyStories = SCORED_CHANNELS.some(ch => (channelStories[ch] || []).length > 0)

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />
      <main className="flex-1 px-6 py-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-stone-900 tracking-tight">Daily Curation</h1>
            <p className="text-[13px] text-stone-400 mt-0.5">
              Review AI-scored stories and approve what gets built today
            </p>
          </div>
          <button
            onClick={loadSampleStories}
            disabled={scoring}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {scoring ? (
              <>
                <Spinner />
                Scoring stories…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Load sample stories
              </>
            )}
          </button>
        </div>

        {/* Empty state */}
        {!hasAnyStories && !scoring && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-medium text-stone-700">No stories loaded yet</p>
              <p className="text-[13px] text-stone-400 mt-1">
                Click &ldquo;Load sample stories&rdquo; to score and review today&apos;s candidates
              </p>
            </div>
          </div>
        )}

        {/* Channel cards */}
        {hasAnyStories && (
          <div className="flex flex-col gap-6">
            {SCORED_CHANNELS.map(channel => {
              const stories = channelStories[channel] || []
              if (!stories.length) return null
              const pid = primaryId[channel] || stories[0]?.id
              const primary = stories.find(s => s.id === pid) || stories[0]
              const others = stories.filter(s => s.id !== primary?.id)
              const colors = CHANNEL_COLORS[channel]
              const sel = multiSelected[channel] || new Set<string>()
              const isOpen = !!expanded[channel]
              const buildCount = 1 + sel.size

              return (
                <ChannelCard
                  key={channel}
                  channel={channel}
                  colors={colors}
                  primary={primary}
                  others={others}
                  multiSelected={sel}
                  expanded={isOpen}
                  buildCount={buildCount}
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
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
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
  channel, colors, primary, others, multiSelected, expanded, buildCount,
  onToggleExpand, onSelectPrimary, onToggleMultiSelect,
  onApproveBuild, onBuildSelected, onSkip,
}: {
  channel: string
  colors: { primary: string; bg: string }
  primary: Story
  others: Story[]
  multiSelected: Set<string>
  expanded: boolean
  buildCount: number
  onToggleExpand: () => void
  onSelectPrimary: (id: string) => void
  onToggleMultiSelect: (id: string) => void
  onApproveBuild: () => void
  onBuildSelected: () => void
  onSkip: () => void
}) {
  const hasExtras = multiSelected.size > 0

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

      {/* Dark channel header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: colors.primary, boxShadow: `0 0 8px ${colors.primary}88` }}
          />
          <span className="text-white text-[14px] font-semibold tracking-tight">{channel}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-medium">
            {others.length + 1} stories scored
          </span>
        </div>
        <button
          onClick={onSkip}
          className="px-2.5 py-1 rounded-lg text-[11px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          Skip today
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">

        {/* Primary / top story */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Top story</span>
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
              {primary.articleUrl && (
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: colors.primary }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {hasExtras ? `Approve & Build ${buildCount} posts` : 'Approve & Build'}
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
                        checked
                          ? 'border-blue-200 bg-blue-50/60'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => onToggleMultiSelect(story.id)}
                          title={checked ? 'Deselect' : 'Add to build queue'}
                          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-stone-300 hover:border-blue-400'
                          }`}
                        >
                          {checked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {/* Story info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ScoreBadge score={story.score} />
                          </div>
                          <p className="text-[13px] font-medium text-stone-900 leading-snug">{story.headline}</p>
                          <p className="text-[11px] text-stone-400 mt-1 italic">
                            <span className="not-italic font-medium text-stone-500">Why:</span> {story.reason}
                          </p>
                        </div>

                        {/* Use as primary */}
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

                {/* Build from selected footer */}
                {multiSelected.size > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                    <span className="text-[12px] text-stone-500">
                      {multiSelected.size} additional stor{multiSelected.size === 1 ? 'y' : 'ies'} selected
                    </span>
                    <button
                      onClick={onBuildSelected}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition-colors"
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
