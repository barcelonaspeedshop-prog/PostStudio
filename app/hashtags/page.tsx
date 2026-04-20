'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

const CHANNEL_NAMES = Object.keys(CHANNELS)

export default function HashtagsPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState(CHANNEL_NAMES[0])
  const [loading, setLoading] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const channelCfg = CHANNELS[channel]

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setHashtags([])
    setRemoved(new Set())
    setCopied(false)
    try {
      const res = await fetch('/api/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setHashtags(data.hashtags || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const activeTags = hashtags.filter(t => !removed.has(t))

  const copyAll = async () => {
    await navigator.clipboard.writeText(activeTags.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleTag = (tag: string) => {
    setRemoved(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Hashtag Generator</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-xl mx-auto flex flex-col gap-5">

            {/* Inputs */}
            <div className="bg-white border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest block mb-1.5">Topic</label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }}
                  placeholder="e.g. Max Verstappen wins Monaco Grand Prix"
                  rows={2}
                  className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest block mb-1.5">Channel</label>
                <select
                  value={channel}
                  onChange={e => { setChannel(e.target.value); setHashtags([]); setRemoved(new Set()) }}
                  className="w-full px-3 py-2.5 text-[13px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                >
                  {CHANNEL_NAMES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Channel voice strip */}
              {channelCfg && (
                <div className="px-3 py-2 rounded-lg text-[11px] text-stone-500 leading-relaxed" style={{ background: channelCfg.bg + '18', borderLeft: `2px solid ${channelCfg.primary}` }}>
                  <span className="font-semibold" style={{ color: channelCfg.primary }}>Core: </span>
                  {channelCfg.hashtagSets.core.join(' ')}
                </div>
              )}

              <button
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="w-full py-2.5 text-[13px] font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Generating…
                  </>
                ) : (
                  <><span className="text-[11px]">#</span> Generate hashtags</>
                )}
              </button>

              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>

            {/* Results */}
            {hashtags.length > 0 && (
              <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-stone-700">{activeTags.length} hashtags</span>
                    <span className="text-[11px] text-stone-400">· tap to remove</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generate}
                      className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1"
                    >
                      <span>↺</span> Regenerate
                    </button>
                    <button
                      onClick={copyAll}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                        copied ? 'bg-green-600 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                    >
                      {copied ? (
                        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg> Copied!</>
                      ) : (
                        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy all</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-wrap gap-1.5">
                  {hashtags.map(tag => {
                    const isRemoved = removed.has(tag)
                    const isCore = channelCfg.hashtagSets.core.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 text-[12px] rounded-full border transition-all ${
                          isRemoved
                            ? 'border-stone-100 text-stone-300 bg-stone-50 line-through'
                            : isCore
                            ? 'border-transparent text-white font-medium'
                            : 'border-stone-200 text-stone-700 hover:border-stone-400 bg-white hover:bg-stone-50'
                        }`}
                        style={!isRemoved && isCore ? { backgroundColor: channelCfg.primary } : {}}
                        title={isCore ? 'Core tag (always included)' : isRemoved ? 'Click to restore' : 'Click to remove'}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>

                {/* Plain-text preview for copy */}
                <div className="px-4 pb-4">
                  <div className="px-3 py-2.5 bg-stone-50 rounded-lg text-[11px] text-stone-500 leading-relaxed break-all select-all">
                    {activeTags.join(' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && hashtags.length === 0 && (
              <div className="text-center py-10">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-[18px] text-stone-400 font-bold">#</span>
                </div>
                <p className="text-[13px] font-medium text-stone-500">Enter a topic to generate hashtags</p>
                <p className="text-[12px] text-stone-400 mt-1">Haiku picks the most relevant tags from each channel&apos;s pool</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
