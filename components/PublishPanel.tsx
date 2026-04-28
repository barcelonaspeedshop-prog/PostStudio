'use client'

import { useState } from 'react'
import { getSeriesByChannel } from '@/lib/series'

export type ManualUploaded = { youtube?: string; tiktok?: string; x?: string }

export type FurtherReadingRow = { title: string; url: string; source: string }

export type PanelItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Array<{ headline: string; body: string; image?: string }>
  videoBase64?: string
  ytTitle?: string
  ytDescription?: string
  ytTags?: string[]
  tiktokCaption?: string
  xCaption?: string
  manualUploaded?: ManualUploaded
  articleBody?: string
  series?: string
  coverImageDirect?: string
  youtubeId?: string
  youtubeCredit?: string
  furtherReading?: Array<{ title: string; url: string; source?: string }>
}

type Props = {
  item: PanelItem
  youtubeChannelId?: string
  onUpdate: (updates: Partial<PanelItem> & { status?: string }) => void
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const Spinner = () => (
  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

function CopyButton({ label, text }: { label: string; text: string }) {
  const [state, setState] = useState<'idle' | 'copied'>('idle')
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setState('copied')
    setTimeout(() => setState('idle'), 1500)
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 px-2 py-1 text-[10px] font-medium rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
    >
      {state === 'copied' ? '✓ Copied' : label}
    </button>
  )
}

export default function PublishPanel({ item, youtubeChannelId, onUpdate }: Props) {
  const [regenLoading, setRegenLoading] = useState<Record<string, boolean>>({})
  const [articleSaving, setArticleSaving] = useState(false)
  const [articleSaved, setArticleSaved] = useState(false)

  // Article metadata local state
  const [series, setSeries] = useState(item.series && item.series !== 'news' ? item.series : '')
  const [coverImageDirect, setCoverImageDirect] = useState(item.coverImageDirect || '')
  const [youtubeId, setYoutubeId] = useState(item.youtubeId || '')
  const [youtubeCredit, setYoutubeCredit] = useState(item.youtubeCredit || '')
  const [furtherReading, setFurtherReading] = useState<FurtherReadingRow[]>(
    item.furtherReading?.map(r => ({ title: r.title, url: r.url, source: r.source || '' })) ?? []
  )

  const seriesOptions = getSeriesByChannel(item.channel)

  const addFurtherReadingRow = () => {
    if (furtherReading.length >= 5) return
    setFurtherReading(prev => [...prev, { title: '', url: '', source: '' }])
  }

  const removeFurtherReadingRow = (i: number) => {
    setFurtherReading(prev => prev.filter((_, j) => j !== i))
  }

  const updateFurtherReadingRow = (i: number, field: keyof FurtherReadingRow, value: string) => {
    setFurtherReading(prev => prev.map((r, j) => j === i ? { ...r, [field]: value } : r))
  }

  const saveArticleMeta = async () => {
    setArticleSaving(true)
    try {
      const payload = {
        id: item.id,
        series: series || null,
        coverImageDirect: coverImageDirect.trim() || undefined,
        youtubeId: youtubeId.trim() || undefined,
        youtubeCredit: youtubeCredit.trim() || undefined,
        furtherReading: furtherReading.filter(r => r.title.trim() && r.url.trim()).map(r => ({
          title: r.title.trim(),
          url: r.url.trim(),
          ...(r.source.trim() ? { source: r.source.trim() } : {}),
        })),
      }
      const res = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onUpdate({
          series: series || undefined,
          coverImageDirect: coverImageDirect.trim() || undefined,
          youtubeId: youtubeId.trim() || undefined,
          youtubeCredit: youtubeCredit.trim() || undefined,
          furtherReading: payload.furtherReading,
        })
        setArticleSaved(true)
        setTimeout(() => setArticleSaved(false), 2000)
      }
    } catch { /* non-fatal */ }
    setArticleSaving(false)
  }

  const uploaded = item.manualUploaded || {}
  const allDone = !!(uploaded.youtube && uploaded.tiktok && uploaded.x)

  const ytUploadUrl = youtubeChannelId
    ? `https://studio.youtube.com/channel/${youtubeChannelId}/videos/upload`
    : 'https://studio.youtube.com'

  const downloadVideo = () => {
    if (!item.videoBase64) return
    const src = item.videoBase64.startsWith('data:')
      ? item.videoBase64
      : `data:video/mp4;base64,${item.videoBase64}`
    const filename = item.headline.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') + '.mp4'
    const a = document.createElement('a')
    a.href = src
    a.download = filename
    a.click()
  }

  const downloadCoverImage = () => {
    const img = item.slides[0]?.image
    if (!img) return
    const a = document.createElement('a')
    a.href = img
    a.download = item.headline.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') + '_cover.jpg'
    a.click()
  }

  const tickUpload = async (platform: 'youtube' | 'tiktok' | 'x') => {
    const current = uploaded
    let updated: ManualUploaded
    if (current[platform]) {
      updated = { ...current }
      delete updated[platform]
    } else {
      updated = { ...current, [platform]: new Date().toISOString() }
    }
    const res = await fetch('/api/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, manualUploaded: updated }),
    })
    if (res.ok) {
      const data = await res.json() as { status?: string }
      onUpdate({ manualUploaded: updated, ...(data.status === 'published' ? { status: 'published' } : {}) })
    }
  }

  const regenYtTags = async () => {
    setRegenLoading(p => ({ ...p, ytTags: true }))
    try {
      const chapters = item.slides.slice(0, 8).map(s => ({ title: s.headline, narration: s.body }))
      const res = await fetch('/api/story-video/yt-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.ytTitle || item.headline, summary: item.topic, chapters, channel: item.channel }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json() as { tags?: string[] }
      if (data.tags) {
        await fetch('/api/approvals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, ytTags: data.tags }),
        })
        onUpdate({ ytTags: data.tags })
      }
    } catch { /* non-fatal */ }
    setRegenLoading(p => ({ ...p, ytTags: false }))
  }

  const regenTiktok = async () => {
    setRegenLoading(p => ({ ...p, tiktok: true }))
    try {
      const res = await fetch('/api/generate-tiktok-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, topic: item.topic, channel: item.channel, slides: item.slides.map(s => ({ headline: s.headline, body: s.body })) }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json() as { caption?: string }
      if (data.caption) onUpdate({ tiktokCaption: data.caption })
    } catch { /* non-fatal */ }
    setRegenLoading(p => ({ ...p, tiktok: false }))
  }

  const regenX = async () => {
    setRegenLoading(p => ({ ...p, x: true }))
    try {
      const res = await fetch('/api/generate-x-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, topic: item.topic, channel: item.channel, slides: item.slides.map(s => ({ headline: s.headline, body: s.body })) }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json() as { caption?: string }
      if (data.caption) onUpdate({ xCaption: data.caption })
    } catch { /* non-fatal */ }
    setRegenLoading(p => ({ ...p, x: false }))
  }

  if (allDone) {
    const latestTs = [uploaded.youtube, uploaded.tiktok, uploaded.x].filter((v): v is string => !!v).sort().pop()!
    return (
      <div className="px-4 py-3 bg-green-50 border-t border-green-100 rounded-b-xl flex items-center gap-2">
        <span className="text-green-600 text-[14px]">✅</span>
        <span className="text-[12px] text-green-700 font-medium">Published to all manual platforms {timeAgo(latestTs)}</span>
      </div>
    )
  }

  const ytTagsString = (item.ytTags || []).join(', ')

  const articleValid = !item.articleBody || !!coverImageDirect.trim()

  return (
    <div className="border-t border-stone-100 divide-y divide-stone-50">

      {/* ── Article metadata (shown when item has article content) ── */}
      {item.articleBody && (
        <div className="px-4 pt-3 pb-4 bg-stone-50/50">
          <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest mb-3">Website Article</p>

          {/* Series */}
          <div className="mb-3">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
              Series <span className="text-red-500 text-[11px]">*</span>
            </label>
            <select
              value={series}
              onChange={e => setSeries(e.target.value)}
              className="w-full text-[13px] border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-stone-400"
            >
              <option value="">— None —</option>
              {seriesOptions.map(s => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-stone-400 mt-0.5">Which series does this article belong to?</p>
          </div>

          {/* Cover image */}
          <div className="mb-4">
            <label className="flex items-center gap-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
              Cover image <span className="text-red-500 text-[11px]">*</span>
            </label>
            <input
              type="url"
              value={coverImageDirect}
              onChange={e => setCoverImageDirect(e.target.value)}
              placeholder="https://..."
              className={`w-full text-[12px] border rounded-lg px-2.5 py-2 bg-white focus:outline-none placeholder:text-stone-400 ${
                !coverImageDirect.trim() ? 'border-red-200 focus:border-red-400' : 'border-stone-200 focus:border-stone-400'
              }`}
            />
            {!coverImageDirect.trim() && (
              <p className="text-[10px] text-red-500 mt-0.5">Cover image required for website article</p>
            )}
          </div>

          {/* Watch section */}
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Watch section (optional)</p>
          <p className="text-[10px] text-stone-400 mb-2 -mt-1">Adds a Watch section below the article body — different from the inline video above.</p>
          <div className="mb-2">
            <label className="text-[10px] font-medium text-stone-500 mb-1 block">YouTube video ID</label>
            <input
              type="text"
              value={youtubeId}
              onChange={e => setYoutubeId(e.target.value)}
              placeholder="e.g. CQgJ1lWgI3g"
              className="w-full text-[12px] border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            />
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-medium text-stone-500 mb-1 block">Credit</label>
            <input
              type="text"
              value={youtubeCredit}
              onChange={e => setYoutubeCredit(e.target.value)}
              placeholder="e.g. via Vagabrothers"
              className="w-full text-[12px] border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            />
          </div>

          {/* Further reading */}
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Further reading (optional)</p>
          <p className="text-[10px] text-stone-400 mb-2">External articles or sources worth reading.</p>
          <div className="flex flex-col gap-2 mb-2">
            {furtherReading.map((row, i) => (
              <div key={i} className="flex flex-col gap-1 p-2 bg-white border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">Link {i + 1}</span>
                  <button
                    onClick={() => removeFurtherReadingRow(i)}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={row.title}
                  onChange={e => updateFurtherReadingRow(i, 'title', e.target.value)}
                  placeholder="Title"
                  className="w-full text-[12px] border border-stone-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
                />
                <input
                  type="url"
                  value={row.url}
                  onChange={e => updateFurtherReadingRow(i, 'url', e.target.value)}
                  placeholder="URL"
                  className="w-full text-[12px] border border-stone-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
                />
                <input
                  type="text"
                  value={row.source}
                  onChange={e => updateFurtherReadingRow(i, 'source', e.target.value)}
                  placeholder="Source (optional, e.g. The Guardian)"
                  className="w-full text-[12px] border border-stone-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
                />
              </div>
            ))}
          </div>
          {furtherReading.length < 5 && (
            <button
              onClick={addFurtherReadingRow}
              className="w-full py-1.5 text-[11px] font-medium border border-dashed border-stone-300 text-stone-500 rounded-lg hover:border-stone-400 hover:text-stone-700 transition-colors mb-3"
            >
              + Add link
            </button>
          )}

          {/* Save button */}
          <button
            onClick={saveArticleMeta}
            disabled={articleSaving}
            className="w-full py-2 text-[12px] font-medium rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {articleSaving ? <><Spinner /> Saving…</> : articleSaved ? '✓ Saved' : 'Save article details'}
          </button>

          {!articleValid && (
            <p className="text-[10px] text-red-500 mt-2 text-center">Cover image required for website article</p>
          )}
        </div>
      )}

      {/* ── YouTube ── */}
      {uploaded.youtube ? (
        <div
          className="px-4 py-2.5 bg-green-50 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => tickUpload('youtube')}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-[13px]">✓</span>
            <span className="text-[11px] text-green-700 font-medium">YouTube uploaded {timeAgo(uploaded.youtube)}</span>
          </div>
          <span className="text-[10px] text-green-500">undo</span>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">▶</span>
              <span className="text-[12px] font-semibold text-stone-700">YouTube</span>
            </div>
            <button
              onClick={() => tickUpload('youtube')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              <span className="w-3.5 h-3.5 border border-stone-300 rounded-sm inline-block" />
              Mark uploaded
            </button>
          </div>

          {/* Download MP4 */}
          <button
            onClick={downloadVideo}
            disabled={!item.videoBase64}
            className="w-full mb-3 px-4 py-2.5 bg-stone-900 text-white text-[12px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span className="text-[10px]">↓</span> Download MP4
          </button>

          {/* Title */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Title</span>
              <CopyButton label="📋 Copy" text={item.ytTitle || item.headline || ''} />
            </div>
            <p className="text-[12px] text-stone-700 leading-snug bg-stone-50 rounded-lg px-2.5 py-2 border border-stone-100">
              {item.ytTitle || item.headline || <span className="italic text-stone-400">No title</span>}
            </p>
          </div>

          {/* Description */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Description</span>
              <CopyButton label="📋 Copy" text={item.ytDescription || ''} />
            </div>
            <textarea
              readOnly
              value={item.ytDescription || ''}
              rows={3}
              className="w-full text-[11px] text-stone-700 leading-relaxed bg-stone-50 rounded-lg px-2.5 py-2 border border-stone-100 resize-none focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Tags (paste into YT Studio)</span>
              <div className="flex gap-1.5">
                <CopyButton label="📋 Copy" text={ytTagsString} />
                <button
                  onClick={regenYtTags}
                  disabled={regenLoading.ytTags}
                  className="px-2 py-1 text-[10px] font-medium rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {regenLoading.ytTags ? <Spinner /> : '↺'} Regen tags
                </button>
              </div>
            </div>
            <p className="text-[11px] text-stone-600 bg-stone-50 rounded-lg px-2.5 py-2 border border-stone-100 leading-relaxed break-words">
              {ytTagsString || <span className="italic text-stone-400">No tags</span>}
            </p>
          </div>

          {/* Open YT Studio */}
          <a
            href={ytUploadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 text-[12px] font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
          >
            Open YouTube Studio Upload ↗
          </a>
        </div>
      )}

      {/* ── TikTok ── */}
      {uploaded.tiktok ? (
        <div
          className="px-4 py-2.5 bg-green-50 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => tickUpload('tiktok')}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-[13px]">✓</span>
            <span className="text-[11px] text-green-700 font-medium">TikTok uploaded {timeAgo(uploaded.tiktok)}</span>
          </div>
          <span className="text-[10px] text-green-500">undo</span>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">♪</span>
              <span className="text-[12px] font-semibold text-stone-700">TikTok</span>
            </div>
            <button
              onClick={() => tickUpload('tiktok')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              <span className="w-3.5 h-3.5 border border-stone-300 rounded-sm inline-block" />
              Mark uploaded
            </button>
          </div>

          {/* Download MP4 */}
          <button
            onClick={downloadVideo}
            disabled={!item.videoBase64}
            className="w-full mb-3 px-4 py-2.5 bg-stone-900 text-white text-[12px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span className="text-[10px]">↓</span> Download MP4
          </button>

          {/* Caption */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Caption</span>
              <div className="flex gap-1.5">
                <CopyButton label="📋 Copy" text={item.tiktokCaption || ''} />
                <button
                  onClick={regenTiktok}
                  disabled={regenLoading.tiktok}
                  className="px-2 py-1 text-[10px] font-medium rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {regenLoading.tiktok ? <Spinner /> : '↺'} Regen
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={item.tiktokCaption || ''}
              rows={4}
              placeholder="No caption — click Regen to generate"
              className="w-full text-[11px] text-stone-700 leading-relaxed bg-stone-50 rounded-lg px-2.5 py-2 border border-stone-100 resize-none focus:outline-none placeholder:text-stone-400 placeholder:italic"
            />
            {item.tiktokCaption && (
              <p className="text-[10px] text-stone-400 mt-0.5">{item.tiktokCaption.length} chars</p>
            )}
          </div>

          {/* Open TikTok */}
          <a
            href="https://www.tiktok.com/upload"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 text-[12px] font-medium rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
          >
            Open TikTok Upload ↗
          </a>
        </div>
      )}

      {/* ── X ── */}
      {uploaded.x ? (
        <div
          className="px-4 py-2.5 bg-green-50 flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors rounded-b-xl"
          onClick={() => tickUpload('x')}
        >
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-[13px]">✓</span>
            <span className="text-[11px] text-green-700 font-medium">X posted {timeAgo(uploaded.x)}</span>
          </div>
          <span className="text-[10px] text-green-500">undo</span>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 bg-white rounded-b-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold">𝕏</span>
              <span className="text-[12px] font-semibold text-stone-700">X (Twitter)</span>
            </div>
            <button
              onClick={() => tickUpload('x')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              <span className="w-3.5 h-3.5 border border-stone-300 rounded-sm inline-block" />
              Mark posted
            </button>
          </div>

          {/* Download cover image */}
          <button
            onClick={downloadCoverImage}
            disabled={!item.slides[0]?.image}
            className="w-full mb-3 px-4 py-2.5 bg-stone-900 text-white text-[12px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <span className="text-[10px]">↓</span> Download Cover Image
          </button>

          {/* Caption */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Tweet</span>
              <div className="flex gap-1.5">
                <CopyButton label="📋 Copy" text={item.xCaption || ''} />
                <button
                  onClick={regenX}
                  disabled={regenLoading.x}
                  className="px-2 py-1 text-[10px] font-medium rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  {regenLoading.x ? <Spinner /> : '↺'} Regen
                </button>
              </div>
            </div>
            <p className="text-[12px] text-stone-700 bg-stone-50 rounded-lg px-2.5 py-2 border border-stone-100 leading-snug whitespace-pre-wrap">
              {item.xCaption || <span className="italic text-stone-400">No caption — click Regen to generate</span>}
            </p>
            {item.xCaption && (
              <p className={`text-[10px] mt-0.5 ${item.xCaption.length > 280 ? 'text-red-500' : 'text-stone-400'}`}>
                {item.xCaption.length}/280 chars
              </p>
            )}
          </div>

          {/* Open X Compose */}
          <a
            href="https://x.com/compose/post"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 text-[12px] font-medium rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
          >
            Open X Compose ↗
          </a>
        </div>
      )}
    </div>
  )
}
