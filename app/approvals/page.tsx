'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

const BLOCKED_IMAGE_DOMAINS = [
  'instagram.com', 'lookaside.instagram.com', 'lookaside.fbsbx.com',
  'lookaside.facebook.com', 'fbcdn.net', 'facebook.com',
  'twitter.com', 'twimg.com', 'pbs.twimg.com', 'ton.twimg.com',
  'tiktok.com', 'tiktokcdn.com', 'pinterest.com', 'pinimg.com',
  'reddit.com', 'redd.it', 'whatsapp.com',
]

function isBlockedImageUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (BLOCKED_IMAGE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return true
    if (hostname.startsWith('scontent.') || hostname.startsWith('scontent-')) return true
    return false
  } catch {
    return true
  }
}

type Slide = {
  num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string; imageOptions?: string[]
}

type ApprovalItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Slide[]
  videoBase64?: string
  platforms: string[]
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [actingLabel, setActingLabel] = useState('')
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null)
  const [genStep, setGenStep] = useState('')
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [regenStep, setRegenStep] = useState('')
  const [imagePicker, setImagePicker] = useState<{
    itemId: string
    slideIndex: number
    options: string[]
    currentIdx: number
    saving: boolean
  } | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/approvals')
      const data = await res.json()
      setItems(data)
    } catch {
      showToast('Failed to load approvals', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const autoGenerateAll = async () => {
    setAutoGenerating(true)
    showToast('Auto-generating carousels for all channels — this takes a few minutes...')
    try {
      const res = await fetch('/api/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const succeeded = data.results?.filter((r: { status: string }) => r.status === 'success').length || 0
      showToast(`Done! ${succeeded} carousels generated and queued for approval`)
      fetchItems()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Auto-generate failed', 'error')
    } finally {
      setAutoGenerating(false)
    }
  }

  const generateVideoForItem = async (item: ApprovalItem) => {
    setGeneratingVideo(item.id)
    try {
      // Step 1: Composite slides server-side with Sharp
      setGenStep('Compositing slides...')
      const compRes = await fetch('/api/composite-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: item.slides, channel: item.channel }),
      })
      const compData = await compRes.json()
      if (!compRes.ok) throw new Error(compData.error || 'Compositing failed')

      // Build slides with composited frames
      const compositedSlides = item.slides.map((s, i) => ({
        ...s,
        image: compData.frames[i] || s.image,
      }))

      // Step 2: Generate video from composited frames
      setGenStep('Encoding video...')
      const vidRes = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: compositedSlides, slideDuration: 3 }),
      })
      const vidData = await vidRes.json()
      if (!vidRes.ok) throw new Error(vidData.error || 'Video export failed')

      // Step 3: Save video to the approval item
      setGenStep('Saving...')
      const updateRes = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, videoBase64: vidData.video }),
      })
      if (!updateRes.ok) throw new Error('Failed to save video')

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, videoBase64: vidData.video } : i))
      showToast('Video ready — tap Preview to watch')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Video generation failed', 'error')
    } finally {
      setGeneratingVideo(null)
      setGenStep('')
    }
  }

  const regenerateItem = async (item: ApprovalItem) => {
    setRegeneratingId(item.id)
    try {
      // Step 1: Fetch fresh news for this channel
      setRegenStep('Fetching news...')
      const newsRes = await fetch('/api/news-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: item.channel, timestamp: Date.now(), exclude_topics: [item.topic || item.headline].filter(Boolean) }),
      })
      const newsData = await newsRes.json()
      if (!newsRes.ok) throw new Error(newsData.error || 'News fetch failed')

      const newSlides: Slide[] = newsData.slides
      const newTopic: string = newsData.topic || newsData.story || ''
      const newHeadline = newSlides[0]?.headline || newTopic

      // Step 2: Fetch images for each slide
      setRegenStep('Fetching images...')
      await Promise.all(newSlides.map(async (slide) => {
        try {
          const searchQuery = `${slide.headline} ${item.channel}`
          const imgRes = await fetch('/api/search-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery, count: 5 }),
          })
          if (!imgRes.ok) return
          const imgData = await imgRes.json()
          const imageUrls: string[] = (imgData.images || [])
            .map((img: { url: string }) => img.url)
            .filter((u: string) => !isBlockedImageUrl(u))
          if (imageUrls.length === 0) return

          slide.imageOptions = imageUrls

          // Try each URL until one downloads successfully
          for (const url of imageUrls) {
            try {
              const proxyRes = await fetch('/api/fetch-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
              })
              if (!proxyRes.ok) continue
              const proxyData = await proxyRes.json()
              if (proxyData.base64) {
                slide.image = proxyData.base64
                break
              }
            } catch {
              continue
            }
          }
        } catch {
          // Image search failed for this slide — will use solid colour
        }
      }))

      // Step 3: Composite slides
      setRegenStep('Compositing slides...')
      const compRes = await fetch('/api/composite-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: newSlides, channel: item.channel }),
      })
      const compData = await compRes.json()
      if (!compRes.ok) throw new Error(compData.error || 'Compositing failed')

      const compositedSlides = newSlides.map((s, i) => ({
        ...s,
        image: compData.frames[i] || s.image,
      }))

      // Step 3: Generate video
      setRegenStep('Encoding video...')
      const vidRes = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: compositedSlides, slideDuration: 3 }),
      })
      const vidData = await vidRes.json()
      if (!vidRes.ok) throw new Error(vidData.error || 'Video export failed')

      // Step 4: Build YouTube metadata
      const ytTitle = newHeadline
      const ytDescription = compositedSlides.map(s => s.headline + '\n' + s.body).join('\n\n')
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with', 'how', 'why', 'what'])
      const ytTags = [item.channel, ...newSlides.flatMap(s =>
        s.headline.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()) && /^[A-Z]/.test(w))
      )].filter((t, i, a) => a.indexOf(t) === i).slice(0, 15)

      // Step 5: Update item in queue
      setRegenStep('Saving...')
      const updateRes = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          slides: compositedSlides,
          headline: newHeadline,
          topic: newTopic,
          videoBase64: vidData.video,
          ytTitle,
          ytDescription,
          ytTags,
        }),
      })
      if (!updateRes.ok) throw new Error('Failed to save regenerated content')

      // Update local state
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        slides: compositedSlides,
        headline: newHeadline,
        topic: newTopic,
        videoBase64: vidData.video,
      } : i))
      showToast(`Regenerated: "${newHeadline}"`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Regeneration failed', 'error')
    } finally {
      setRegeneratingId(null)
      setRegenStep('')
    }
  }

  const openImagePicker = async (itemId: string, slideIndex: number) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const slide = item.slides[slideIndex]

    let options = (slide.imageOptions || []).filter(u => !isBlockedImageUrl(u))

    // If no valid options, fetch from search
    if (options.length === 0) {
      try {
        const searchRes = await fetch('/api/search-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `${slide.headline} ${item.channel}`, count: 10 }),
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          options = (searchData.images || [])
            .map((img: { url: string }) => img.url)
            .filter((u: string) => !isBlockedImageUrl(u))
        }
      } catch { /* ignore */ }
    }

    if (options.length === 0) {
      showToast('No images found for this slide', 'error')
      return
    }

    setImageLoadError(false)
    setImagePicker({ itemId, slideIndex, options, currentIdx: 0, saving: false })
  }

  const skipImage = async () => {
    if (!imagePicker) return
    let nextIdx = imagePicker.currentIdx + 1

    // If exhausted, fetch more with timeout
    if (nextIdx >= imagePicker.options.length) {
      const item = items.find(i => i.id === imagePicker.itemId)
      const slide = item?.slides[imagePicker.slideIndex]
      if (slide) {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 8000)
          const searchRes = await fetch('/api/search-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${slide.headline} ${item?.channel} photo`, count: 10 }),
            signal: controller.signal,
          })
          clearTimeout(timeout)
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            const freshUrls: string[] = (searchData.images || [])
              .map((img: { url: string }) => img.url)
              .filter((url: string) => !isBlockedImageUrl(url) && !imagePicker.options.includes(url))
            if (freshUrls.length > 0) {
              setImageLoadError(false)
              setImagePicker({
                ...imagePicker,
                options: [...imagePicker.options, ...freshUrls],
                currentIdx: nextIdx,
              })
              return
            }
          }
        } catch { /* timeout or fetch failed — wrap around silently */ }
      }
      // Wrap around if no new results
      nextIdx = 0
    }

    setImageLoadError(false)
    setImagePicker({ ...imagePicker, currentIdx: nextIdx })
  }

  const useSelectedImage = async () => {
    if (!imagePicker) return
    const { itemId, slideIndex, options, currentIdx } = imagePicker
    const selectedUrl = options[currentIdx]

    setImagePicker({ ...imagePicker, saving: true })

    try {
      // Try server-side download for compositing (with 10s timeout)
      let base64: string | null = null
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const proxyRes = await fetch('/api/fetch-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: selectedUrl }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (proxyRes.ok) {
          const proxyData = await proxyRes.json()
          base64 = proxyData.base64 || null
        }
      } catch { /* timeout or server fetch failed — fall through to URL */ }

      // Use base64 if available, otherwise use the URL directly
      const imageValue = base64 || selectedUrl
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const updatedSlides = item.slides.map((s, i) =>
        i === slideIndex ? { ...s, image: imageValue, imageOptions: options } : s
      )

      // Save to server
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, slides: updatedSlides }),
      })

      // Update local state, clear video
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, slides: updatedSlides, videoBase64: undefined } : i))
      setImagePicker(null)
      showToast(
        base64
          ? `Slide ${slideIndex + 1} image updated — regenerate video when ready`
          : `Slide ${slideIndex + 1} image set (URL) — server download failed, will retry at compositing`
      )
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save image', 'error')
    } finally {
      setImagePicker(prev => prev ? { ...prev, saving: false } : null)
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    setActingLabel(action === 'approve' ? 'Publishing...' : 'Rejecting...')
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setItems(prev => prev.map(i => i.id === id ? { ...i, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date().toISOString() } : i))
      setPreviewId(null)

      if (action === 'reject') {
        showToast('Rejected')
      } else if (data.publishError) {
        showToast(`Approved but some platforms failed: ${data.publishError}`, 'error')
      } else {
        const platforms = (data.results || []).filter((r: { success: boolean }) => r.success).map((r: { platform: string }) => r.platform)
        showToast(`Published to ${platforms.join(', ')}!`)
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error')
    } finally {
      setActing(null)
      setActingLabel('')
    }
  }

  const pending = items.filter(i => i.status === 'pending')
  const reviewed = items.filter(i => i.status !== 'pending')
  const previewItem = previewId ? items.find(i => i.id === previewId) : null

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <div className="flex items-center">
            <span className="text-[14px] font-medium text-stone-900">Approvals</span>
            {pending.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-medium rounded-full">{pending.length} pending</span>
            )}
          </div>
          <button
            onClick={autoGenerateAll}
            disabled={autoGenerating}
            className="px-3 py-2 min-h-[44px] text-[13px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {autoGenerating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Generating...
              </>
            ) : (
              <><span className="text-[11px]">✦</span> Auto-generate all</>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {loading ? (
              <p className="text-[13px] text-stone-400 text-center py-12">Loading...</p>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-stone-600">No pending approvals</p>
                <p className="text-[12px] text-stone-400 mt-1">Content sent for approval will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Pending review</p>
                {pending.map(item => {
                  const hasVideo = !!item.videoBase64
                  const isGenerating = generatingVideo === item.id
                  const isActing = acting === item.id
                  const isRegenerating = regeneratingId === item.id
                  return (
                    <div key={item.id} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                      <div className="p-4 flex gap-3">
                        {item.slides[0]?.image && (
                          <div
                            className="w-16 h-20 rounded-lg bg-stone-100 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.slides[0].image})` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-stone-900 truncate">{item.headline}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">{item.channel}</p>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {item.platforms.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{p}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] text-stone-400">{item.slides.length} slides · {formatDate(item.createdAt)}</p>
                            {hasVideo ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Video ready</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">No video</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slide preview toggle */}
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="w-full px-4 py-1.5 text-[11px] text-stone-400 hover:text-stone-600 border-t border-stone-50 transition-colors"
                      >
                        {expandedId === item.id ? 'Hide slides' : `Preview ${item.slides.length} slides`}
                      </button>

                      {expandedId === item.id && (
                        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                          {item.slides.map((s, i) => (
                            <div key={i} className="shrink-0 flex flex-col items-center gap-1.5">
                              <div className="w-[100px] h-[125px] rounded-lg bg-stone-800 relative overflow-hidden" style={{ background: s.image ? `url(${s.image}) center/cover` : '#1a1a1a' }}>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <p className="text-white text-[8px] font-medium leading-tight line-clamp-2">{s.headline}</p>
                                </div>
                                <span className="absolute top-1 right-1 text-white/50 text-[7px]">{i + 1}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); openImagePicker(item.id, i) }}
                                className="px-2.5 py-1 min-h-[28px] text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 font-medium transition-colors"
                              >
                                ↺ New image
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
                        {!hasVideo && (
                          <button
                            onClick={() => generateVideoForItem(item)}
                            disabled={isGenerating}
                            className="w-full px-4 py-2.5 min-h-[44px] bg-stone-900 text-white text-[13px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isGenerating ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                </svg>
                                {genStep || 'Generating...'}
                              </>
                            ) : (
                              <><span className="text-[11px]">▶</span> Generate video first</>
                            )}
                          </button>
                        )}
                        <div className="flex gap-2">
                          {hasVideo && (
                            <button
                              onClick={() => setPreviewId(item.id)}
                              className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-700 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                            >
                              <span className="text-[11px]">▶</span> Preview
                            </button>
                          )}
                          <button
                            onClick={() => regenerateItem(item)}
                            disabled={isRegenerating || isActing}
                            className="px-4 py-2.5 min-h-[44px] bg-amber-500 text-white text-[13px] font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isRegenerating ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                </svg>
                                {regenStep || 'Regenerating...'}
                              </>
                            ) : '↺ Regenerate'}
                          </button>
                          <button
                            onClick={() => handleAction(item.id, 'approve')}
                            disabled={isActing || !hasVideo}
                            className={`flex-1 px-4 py-2.5 min-h-[44px] text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                              hasVideo ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            {isActing ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                </svg>
                                {actingLabel}
                              </>
                            ) : hasVideo ? 'Approve & Post' : 'Need video'}
                          </button>
                          <button
                            onClick={() => handleAction(item.id, 'reject')}
                            disabled={isActing}
                            className="px-4 py-2.5 min-h-[44px] border border-red-200 text-red-600 text-[13px] font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Recently reviewed</p>
                {reviewed.slice(0, 20).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl">
                    {item.slides[0]?.image && (
                      <div
                        className="w-10 h-12 rounded-md bg-stone-100 shrink-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.slides[0].image})` }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-stone-800 truncate">{item.headline}</p>
                      <p className="text-[10px] text-stone-400">{item.channel} · {formatDate(item.reviewedAt || item.createdAt)}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image picker modal */}
      {imagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !imagePicker.saving && setImagePicker(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-stone-100">
              <p className="text-[14px] font-medium text-stone-900">Choose image for slide {imagePicker.slideIndex + 1}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Image {imagePicker.currentIdx + 1} of {imagePicker.options.length} · Loaded in browser
              </p>
            </div>

            {/* Browser-rendered image preview */}
            <div className="bg-stone-100 flex items-center justify-center" style={{ minHeight: '280px', maxHeight: '400px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePicker.options[imagePicker.currentIdx]}
                alt="Image option"
                className="max-w-full max-h-[400px] object-contain"
                onError={() => setImageLoadError(true)}
                onLoad={() => setImageLoadError(false)}
              />
              {imageLoadError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[12px] text-stone-400 bg-white/80 px-3 py-1.5 rounded-lg">Image failed to load — try Skip</p>
                </div>
              )}
            </div>

            {/* Source URL */}
            <div className="px-4 py-2 border-t border-stone-50">
              <p className="text-[10px] text-stone-400 truncate">{imagePicker.options[imagePicker.currentIdx]}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 pt-2">
              <button
                onClick={useSelectedImage}
                disabled={imagePicker.saving || imageLoadError}
                className="flex-1 px-4 py-2.5 min-h-[44px] bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {imagePicker.saving ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Saving...
                  </>
                ) : '✓ Use this image'}
              </button>
              <button
                onClick={skipImage}
                disabled={imagePicker.saving}
                className="px-4 py-2.5 min-h-[44px] bg-amber-500 text-white text-[13px] font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Skip →
              </button>
              <button
                onClick={() => setImagePicker(null)}
                disabled={imagePicker.saving}
                className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-500 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video preview modal */}
      {previewItem?.videoBase64 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Video player */}
            <div className="bg-black">
              <video
                src={previewItem.videoBase64}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Info + actions */}
            <div className="p-4 flex flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium text-stone-900">{previewItem.headline}</p>
                <p className="text-[12px] text-stone-500 mt-0.5">{previewItem.channel} · {previewItem.slides.length} slides</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {previewItem.platforms.map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{p}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(previewItem.id, 'approve')}
                  disabled={acting === previewItem.id}
                  className="flex-1 px-4 py-2.5 min-h-[44px] bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {acting === previewItem.id ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Publishing...
                    </>
                  ) : 'Approve & Post'}
                </button>
                <button
                  onClick={() => handleAction(previewItem.id, 'reject')}
                  disabled={acting === previewItem.id}
                  className="px-4 py-2.5 min-h-[44px] border border-red-200 text-red-600 text-[13px] font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => setPreviewId(null)}
                  className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-500 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
