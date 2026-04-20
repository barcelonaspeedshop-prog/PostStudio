'use client'
import { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

type HookPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube'
type GeneratedHooks = Record<HookPlatform, string[]>

const ALL_CHANNELS = Object.keys(CHANNELS)
const ALL_PLATFORMS: { id: HookPlatform; label: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
  { id: 'tiktok', label: 'TikTok', icon: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.05a8.16 8.16 0 004.77 1.52V7.12a4.85 4.85 0 01-1-.43z' },
  { id: 'facebook', label: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { id: 'youtube', label: 'YouTube', icon: 'M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z' },
]

const PLATFORM_COLORS: Record<HookPlatform, string> = {
  instagram: '#e1306c',
  tiktok: '#010101',
  facebook: '#1877f2',
  youtube: '#ff0000',
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`shrink-0 p-1.5 rounded-md transition-colors ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export default function HooksPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState('Gentlemen of Fuel')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<HookPlatform>>(new Set(['instagram', 'tiktok', 'facebook', 'youtube']))
  const [hooks, setHooks] = useState<GeneratedHooks | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(p: HookPlatform) {
    setSelectedPlatforms(prev => {
      const s = new Set(prev)
      if (s.has(p)) { if (s.size > 1) s.delete(p) } else s.add(p)
      return s
    })
  }

  async function handleGenerate() {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setHooks(null)
    try {
      const res = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          channel,
          platforms: Array.from(selectedPlatforms),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setHooks(data.hooks)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const activePlatforms = ALL_PLATFORMS.filter(p => selectedPlatforms.has(p.id))
  const channelConfig = CHANNELS[channel]

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar />
      <main className="flex-1 px-6 py-8 max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-stone-900 tracking-tight">Hook Optimizer</h1>
          <p className="text-[13px] text-stone-400 mt-0.5">Generate 5 platform-tuned opening hooks for any topic and channel</p>
        </div>

        {/* Input panel */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-5">

            {/* Topic */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">Topic</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. 1931 Duesenberg Model J wins Best of Show at Amelia Concours d'Elegance"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-[14px] text-stone-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
              />
            </div>

            {/* Channel + platforms row */}
            <div className="flex flex-wrap items-end gap-6">
              {/* Channel */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">Channel</label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-stone-200 text-[13px] text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-300 pr-8"
                  >
                    {ALL_CHANNELS.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2">Platforms</label>
                <div className="flex items-center gap-2">
                  {ALL_PLATFORMS.map(p => {
                    const active = selectedPlatforms.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        title={p.label}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                          active ? 'border-transparent' : 'border-stone-200 bg-white opacity-40'
                        }`}
                        style={active ? { background: PLATFORM_COLORS[p.id] } : {}}
                      >
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d={p.icon} />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
              >
                {loading ? <><Spinner className="w-3.5 h-3.5" /> Generating…</> : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate hooks
                  </>
                )}
              </button>
            </div>

            {/* Channel voice preview */}
            {channelConfig?.hookStyle && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-100">
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest shrink-0 mt-0.5">Voice</span>
                <span className="text-[12px] text-stone-500 italic">{channelConfig.hookStyle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {hooks && (
          <div className={`grid gap-4 ${activePlatforms.length >= 3 ? 'grid-cols-2' : activePlatforms.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {activePlatforms.map(platform => {
              const platformHooks = hooks[platform.id] || []
              return (
                <div key={platform.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  {/* Platform header */}
                  <div className="px-5 py-3.5 flex items-center gap-3 border-b border-stone-100" style={{ background: `${PLATFORM_COLORS[platform.id]}10` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: PLATFORM_COLORS[platform.id] }}>
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d={platform.icon} />
                      </svg>
                    </div>
                    <span className="text-[13px] font-semibold text-stone-900">{platform.label}</span>
                    <span className="ml-auto text-[11px] text-stone-400">{platformHooks.length} hooks</span>
                  </div>

                  {/* Hook cards */}
                  <div className="p-4 flex flex-col gap-2.5">
                    {platformHooks.length === 0 ? (
                      <p className="text-[13px] text-stone-400 py-4 text-center">No hooks generated</p>
                    ) : (
                      platformHooks.map((hook, i) => (
                        <div
                          key={i}
                          className="group flex items-start gap-3 px-3.5 py-3 rounded-xl border border-stone-100 bg-stone-50/60 hover:border-stone-200 hover:bg-stone-50 transition-all"
                        >
                          <span className="text-[10px] font-bold text-stone-300 mt-0.5 shrink-0 w-4">{i + 1}</span>
                          <p className="flex-1 text-[13px] text-stone-800 leading-relaxed">{hook}</p>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton text={hook} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!hooks && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-medium text-stone-700">Enter a topic to get started</p>
              <p className="text-[13px] text-stone-400 mt-1">Pick a channel, select platforms, and generate 5 hooks per platform</p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
