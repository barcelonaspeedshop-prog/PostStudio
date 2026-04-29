'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import PublishPanel, { type PanelItem } from '@/components/PublishPanel'
import { CHANNELS } from '@/lib/channels'
import { getSeriesByChannel } from '@/lib/series'

const CHANNEL_SLUG_MAP: Record<string, string> = {
  'Omnira Food': 'food',
  'Omnira F1': 'f1',
  'Omnira Football': 'football',
  'Gentlemen of Fuel': 'fuel',
}

const BLOCKED_IMAGE_DOMAINS = [
  'instagram.com', 'lookaside.instagram.com', 'lookaside.fbsbx.com',
  'lookaside.facebook.com', 'fbcdn.net', 'facebook.com',
  'twitter.com', 'twimg.com', 'pbs.twimg.com', 'ton.twimg.com',
  'tiktok.com', 'tiktokcdn.com', 'pinterest.com', 'pinimg.com',
  'reddit.com', 'redd.it', 'whatsapp.com',
]

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'])

function isImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    // Always allow our R2 CDN
    if (parsed.hostname.includes('r2.dev')) return true
    const ext = parsed.pathname.split('.').pop()?.toLowerCase() ?? ''
    return IMAGE_EXTENSIONS.has(ext)
  } catch {
    return false
  }
}

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
  num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string; imageOptions?: string[]; imageUrl?: string
}

type ApprovalItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Slide[]
  videoBase64?: string
  platforms: string[]
  ytTitle?: string
  ytDescription?: string
  ytTags?: string[]
  tiktokCaption?: string
  xCaption?: string
  manualUploaded?: { youtube?: string; tiktok?: string; x?: string }
  articleBody?: string
  articleExcerpt?: string
  articleSlug?: string
  websitePublished?: boolean
  cta?: string
  includeCta?: boolean
  hashtags?: string[]
  format?: 'reel' | 'carousel'
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  reviewedAt?: string
  series?: string
  coverImageDirect?: string
  youtubeId?: string
  youtubeCredit?: string
  furtherReading?: Array<{ title: string; url: string; source?: string }>
  publishToWebsite?: boolean
}

type PublishedArticleMeta = {
  id: string
  channel: string  // slug: 'f1' | 'football' | 'food' | 'fuel'
  slug: string
  title: string
  publishedAt: string
  coverImage: string | null
}

const CHANNEL_DISPLAY_MAP: Record<string, string> = {
  'f1': 'Omnira F1',
  'football': 'Omnira Football',
  'food': 'Omnira Food',
  'fuel': 'Gentlemen of Fuel',
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [longFormArticles, setLongFormArticles] = useState<PublishedArticleMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [actingLabel, setActingLabel] = useState('')
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null)
  const [genStep, setGenStep] = useState('')
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const stripRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollStrip = (itemId: string, dir: 'left' | 'right') => {
    const el = stripRefs.current.get(itemId)
    if (el) el.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' })
  }
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [regenStep, setRegenStep] = useState('')
  const [regeneratingCtaId, setRegeneratingCtaId] = useState<string | null>(null)
  const [regeneratingHashtagsId, setRegeneratingHashtagsId] = useState<string | null>(null)
  const [editingHashtagsId, setEditingHashtagsId] = useState<string | null>(null)
  const [hashtagDraft, setHashtagDraft] = useState('')
  const [publishPanelId, setPublishPanelId] = useState<string | null>(null)
  const [articleExpandedId, setArticleExpandedId] = useState<string | null>(null)
  const [regeneratingArticleId, setRegeneratingArticleId] = useState<string | null>(null)
  const [coverImageErrors, setCoverImageErrors] = useState<Record<string, string>>({})

  type PendingArticle = {
    id: string; channel: string; slug: string; title: string
    excerpt: string; body: string; coverImage: string | null
    publishedAt: string; goLiveAt: string; previewUrl: string
    ytVideoId?: string | null
  }
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([])
  const [killLoading, setKillLoading] = useState<string | null>(null)
  const [ytUrlDraft, setYtUrlDraft] = useState<Record<string, string>>({})
  const [ytUrlSaving, setYtUrlSaving] = useState<Record<string, boolean>>({})
  const [ytUrlError, setYtUrlError] = useState<Record<string, string>>({})
  const [ytUrlEditing, setYtUrlEditing] = useState<Record<string, boolean>>({})
  const [imagePicker, setImagePicker] = useState<{
    itemId: string
    slideIndex: number
    options: string[]
    currentIdx: number
    saving: boolean
    searchMode: boolean
    searchQuery: string
    searching: boolean
    // Drive tab
    activeTab: 'search' | 'drive' | 'ai'
    driveFiles: Array<{ id: string; name: string; thumbnailLink?: string }>
    driveLoading: boolean
    driveQuery: string
    driveChannel: string
    // AI tab
    topic: string
    aiGenerating: boolean
    aiImage: string | null
    aiError: string | null
  } | null>(null)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<{ itemId: string; slideIndex: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const [coverUploadTarget, setCoverUploadTarget] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState<Record<string, boolean>>({})
  const [slideUploading, setSlideUploading] = useState<Record<string, boolean>>({})
  const [coverDragOver, setCoverDragOver] = useState<Record<string, boolean>>({})

  type MediaEdit = {
    itemId: string
    channelSlug: string
    articleSlug: string
    currentCover: string | null
    currentYtVideoId: string | null
    newCover: string | null | undefined  // undefined = unchanged, null = cleared, string = new URL
    newYtUrl: string
    fetching: boolean
    coverUploading: boolean
    coverDragOver: boolean
    ytEditing: boolean
    saving: boolean
    error: string | null
  }
  const [mediaEdit, setMediaEdit] = useState<MediaEdit | null>(null)
  const editCoverFileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/approvals')
      const rawData: ApprovalItem[] = await res.json()
      setItems(rawData)
    } catch {
      showToast('Failed to load approvals', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingArticles = async () => {
    try {
      const res = await fetch('/api/pending-articles')
      if (res.ok) setPendingArticles(await res.json())
    } catch { /* non-fatal */ }
  }

  const fetchLongFormArticles = async () => {
    try {
      const res = await fetch('/api/articles')
      if (res.ok) setLongFormArticles(await res.json())
    } catch { /* non-fatal */ }
  }

  useEffect(() => { fetchItems(); fetchPendingArticles(); fetchLongFormArticles() }, [])

  const killArticle = async (channel: string, slug: string) => {
    const key = `${channel}/${slug}`
    setKillLoading(key)
    try {
      const res = await fetch(`/api/pending-articles?channel=${channel}&slug=${encodeURIComponent(slug)}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        showToast(d.error || 'Kill failed', 'error')
      } else {
        showToast('Article killed — removed before going live', 'success')
        fetchPendingArticles()
      }
    } catch {
      showToast('Kill failed', 'error')
    } finally {
      setKillLoading(null)
    }
  }

  const saveYtUrl = async (article: PendingArticle) => {
    const key = `${article.channel}/${article.slug}`
    const url = ytUrlDraft[key] ?? ''
    if (!url.includes('youtu')) {
      setYtUrlError(p => ({ ...p, [key]: 'Enter a valid YouTube URL' }))
      return
    }
    setYtUrlSaving(p => ({ ...p, [key]: true }))
    setYtUrlError(p => { const n = { ...p }; delete n[key]; return n })
    try {
      const res = await fetch('/api/articles/set-youtube-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug: article.slug, channel: article.channel, youtubeUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      showToast(`YouTube ID saved: ${data.ytVideoId}`, 'success')
      setYtUrlEditing(p => ({ ...p, [key]: false }))
      fetchPendingArticles()
    } catch (e: unknown) {
      setYtUrlError(p => ({ ...p, [key]: e instanceof Error ? e.message : 'Save failed' }))
    } finally {
      setYtUrlSaving(p => ({ ...p, [key]: false }))
    }
  }

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
        body: JSON.stringify({ slides: item.slides, channel: item.channel, reelMode: item.format === 'reel' }),
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
        body: JSON.stringify({ slides: compositedSlides, slideDuration: 3, reelMode: item.format === 'reel' }),
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
      // Step 1: Fetch slides via news-brief
      setRegenStep('Fetching news...')
      let newSlides: Slide[]
      let newTopic: string

      const newsRes = await fetch('/api/news-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: item.channel, timestamp: Date.now(), exclude_topics: [item.topic || item.headline].filter(Boolean) }),
      })
      const newsData = await newsRes.json()
      if (!newsRes.ok) throw new Error(newsData.error || 'News fetch failed')
      newSlides = newsData.slides
      newTopic = newsData.topic || newsData.story || ''

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

    const searchMode = options.length === 0
    setImageLoadError(false)
    setImagePicker({
      itemId,
      slideIndex,
      options,
      currentIdx: 0,
      saving: false,
      searchMode,
      searchQuery: searchMode ? `${slide.headline} ${item.channel}` : '',
      searching: false,
      activeTab: 'search',
      driveFiles: [],
      driveLoading: false,
      driveQuery: '',
      driveChannel: item.channel,
      topic: item.topic || slide.headline,
      aiGenerating: false,
      aiImage: null,
      aiError: null,
    })
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
          const result = await Promise.race([
            fetch('/api/search-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: `${slide.headline} ${item?.channel} photo`, count: 10 }),
            }),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
          ])
          const searchRes = result instanceof Response ? result : null
          if (searchRes?.ok) {
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

  const searchInPicker = async () => {
    if (!imagePicker || !imagePicker.searchQuery.trim()) return
    setImagePicker(p => p ? { ...p, searching: true } : null)
    try {
      const res = await fetch('/api/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: imagePicker.searchQuery.trim(), count: 10 }),
      })
      if (res.ok) {
        const data = await res.json()
        const urls: string[] = (data.images || [])
          .map((img: { url: string }) => img.url)
          .filter((u: string) => !isBlockedImageUrl(u))
        if (urls.length > 0) {
          setImageLoadError(false)
          setImagePicker(p => p ? { ...p, options: urls, currentIdx: 0, searchMode: false, searching: false } : null)
          return
        }
      }
      showToast('No images found for that search — try different keywords', 'error')
    } catch {
      showToast('Search failed — check connection', 'error')
    }
    setImagePicker(p => p ? { ...p, searching: false } : null)
  }

  const loadDriveImages = async (channel: string, query = '') => {
    if (!imagePicker) return
    setImagePicker(p => p ? { ...p, driveLoading: true } : null)
    try {
      const qs = new URLSearchParams({ channel, category: 'Generated', query })
      const res = await fetch(`/api/drive-images?${qs}`)
      if (res.ok) {
        const data = await res.json()
        setImagePicker(p => p ? { ...p, driveFiles: data.files || [], driveLoading: false } : null)
      } else {
        setImagePicker(p => p ? { ...p, driveLoading: false } : null)
      }
    } catch {
      setImagePicker(p => p ? { ...p, driveLoading: false } : null)
    }
  }

  const useDriveImage = async (fileId: string, slideIndex: number, itemId: string) => {
    setImagePicker(p => p ? { ...p, saving: true } : null)
    try {
      const res = await fetch('/api/drive-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) throw new Error('Failed to download Drive image')
      const data = await res.json()
      const base64: string = data.base64

      const item = items.find(i => i.id === itemId)
      if (!item) return
      const updatedSlides = item.slides.map((s, i) =>
        i === slideIndex ? { ...s, image: base64 } : s
      )
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, slides: updatedSlides }),
      })
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, slides: updatedSlides, videoBase64: undefined } : it))
      setImagePicker(null)
      showToast(`Slide ${slideIndex + 1} updated from Drive — regenerate video when ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to use Drive image', 'error')
      setImagePicker(p => p ? { ...p, saving: false } : null)
    }
  }

  const generateAiImage = async () => {
    if (!imagePicker) return
    setImagePicker(p => p ? { ...p, aiGenerating: true, aiImage: null, aiError: null } : null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: imagePicker.driveChannel, topic: imagePicker.topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setImagePicker(p => p ? { ...p, aiGenerating: false, aiImage: data.base64 } : null)
    } catch (e: unknown) {
      setImagePicker(p => p ? { ...p, aiGenerating: false, aiError: e instanceof Error ? e.message : 'Generation failed' } : null)
    }
  }

  const useAiImage = async () => {
    if (!imagePicker?.aiImage) return
    const { itemId, slideIndex, aiImage, driveChannel, topic } = imagePicker
    setImagePicker(p => p ? { ...p, saving: true } : null)
    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return
      const updatedSlides = item.slides.map((s, i) =>
        i === slideIndex ? { ...s, image: aiImage } : s
      )
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, slides: updatedSlides }),
      })
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, slides: updatedSlides, videoBase64: undefined } : it))
      // Save to Drive AI Generated folder (fire-and-forget)
      const aiDate = new Date().toISOString().split('T')[0]
      const aiSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
      fetch('/api/drive-images/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: driveChannel, category: 'AI Generated', image: aiImage, filename: `ai-${driveChannel.replace(/[^a-z0-9]+/gi, '-')}-${aiSlug}-${aiDate}.jpg` }),
      }).catch(() => { /* non-blocking */ })
      setImagePicker(null)
      showToast(`Slide ${slideIndex + 1} updated with AI image — regenerate video when ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to save AI image', 'error')
      setImagePicker(p => p ? { ...p, saving: false } : null)
    }
  }

  const uploadImageForSlide = useCallback(async (itemId: string, slideIndex: number, file: File) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const key = `${itemId}-${slideIndex}`
    setSlideUploading(prev => ({ ...prev, [key]: true }))
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const uploadRes = await fetch('/api/cover-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type }),
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')
      const r2Url: string = uploadData.url
      const updatedSlides = item.slides.map((s, i) =>
        i === slideIndex ? { ...s, image: r2Url } : s
      )
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, slides: updatedSlides }),
      })
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, slides: updatedSlides, videoBase64: undefined } : it))
      showToast(`Slide ${slideIndex + 1} image uploaded — regenerate video when ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setSlideUploading(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }, [items])

  const handleUploadClick = (itemId: string, slideIndex: number) => {
    setUploadTarget({ itemId, slideIndex })
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadTarget) {
      uploadImageForSlide(uploadTarget.itemId, uploadTarget.slideIndex, file)
    }
    // Reset so the same file can be re-selected
    e.target.value = ''
    setUploadTarget(null)
  }

  const saveCoverImage = useCallback(async (itemId: string, url: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, coverImageDirect: url } : i))
    setCoverImageErrors(prev => { const n = { ...prev }; delete n[itemId]; return n })
    await fetch('/api/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, coverImageDirect: url }),
    }).catch(() => {})
  }, [])

  const clearCoverImage = useCallback(async (itemId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, coverImageDirect: undefined } : i))
    await fetch('/api/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, coverImageDirect: null }),
    }).catch(() => {})
  }, [])

  const uploadCoverImage = useCallback(async (itemId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }
    setCoverUploading(prev => ({ ...prev, [itemId]: true }))
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/cover-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      await saveCoverImage(itemId, data.url)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Cover image upload failed', 'error')
    } finally {
      setCoverUploading(prev => { const n = { ...prev }; delete n[itemId]; return n })
    }
  }, [saveCoverImage])

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && coverUploadTarget) uploadCoverImage(coverUploadTarget, file)
    e.target.value = ''
    setCoverUploadTarget(null)
  }

  const openEditMedia = useCallback(async (item: ApprovalItem) => {
    const channelSlug = CHANNEL_SLUG_MAP[item.channel]
    const articleSlug = item.articleSlug!
    setMediaEdit({
      itemId: item.id, channelSlug, articleSlug,
      currentCover: null, currentYtVideoId: null,
      newCover: undefined, newYtUrl: '',
      fetching: true, coverUploading: false, coverDragOver: false,
      ytEditing: false, saving: false, error: null,
    })
    try {
      const res = await fetch(`/api/articles/update-media?slug=${encodeURIComponent(articleSlug)}&channel=${encodeURIComponent(channelSlug)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch article media')
      setMediaEdit(prev => prev ? {
        ...prev,
        currentCover: data.coverImage,
        currentYtVideoId: data.ytVideoId,
        fetching: false,
      } : null)
    } catch (e: unknown) {
      setMediaEdit(prev => prev ? { ...prev, fetching: false, error: e instanceof Error ? e.message : 'Failed to load' } : null)
    }
  }, [])

  const uploadEditCover = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return }
    setMediaEdit(prev => prev ? { ...prev, coverUploading: true, error: null } : null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/cover-image-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setMediaEdit(prev => prev ? { ...prev, newCover: data.url, coverUploading: false } : null)
    } catch (e: unknown) {
      setMediaEdit(prev => prev ? { ...prev, coverUploading: false, error: e instanceof Error ? e.message : 'Upload failed' } : null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadEditCover(file)
    e.target.value = ''
  }

  const openEditMediaBySlug = useCallback(async (article: PublishedArticleMeta) => {
    setMediaEdit({
      itemId: article.id,
      channelSlug: article.channel,
      articleSlug: article.slug,
      currentCover: article.coverImage,
      currentYtVideoId: null,
      newCover: undefined,
      newYtUrl: '',
      fetching: true,
      coverUploading: false,
      coverDragOver: false,
      ytEditing: false,
      saving: false,
      error: null,
    })
    try {
      const res = await fetch(`/api/articles/update-media?slug=${article.slug}&channel=${article.channel}`)
      const data = await res.json()
      setMediaEdit(prev => prev?.itemId === article.id ? {
        ...prev,
        currentCover: data.coverImage,
        currentYtVideoId: data.ytVideoId,
        newYtUrl: data.ytVideoId ? `https://www.youtube.com/watch?v=${data.ytVideoId}` : '',
        fetching: false,
      } : prev)
    } catch {
      setMediaEdit(prev => prev?.itemId === article.id ? { ...prev, fetching: false } : prev)
    }
  }, [])

  const saveEditMedia = useCallback(async () => {
    if (!mediaEdit) return
    setMediaEdit(prev => prev ? { ...prev, saving: true, error: null } : null)
    try {
      const payload: Record<string, unknown> = {
        articleSlug: mediaEdit.articleSlug,
        channel: mediaEdit.channelSlug,
      }
      if (mediaEdit.newCover !== undefined) payload.coverImage = mediaEdit.newCover
      const ytShouldUpdate = mediaEdit.ytEditing || (!mediaEdit.currentYtVideoId && mediaEdit.newYtUrl !== '')
      if (ytShouldUpdate) payload.youtubeUrl = mediaEdit.newYtUrl || null
      if (payload.coverImage === undefined && payload.youtubeUrl === undefined) {
        showToast('No changes to save')
        setMediaEdit(null)
        return
      }
      const res = await fetch('/api/articles/update-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      if (data.updated.coverImage !== undefined) {
        setItems(prev => prev.map(i => i.id === mediaEdit.itemId ? { ...i, coverImageDirect: data.updated.coverImage } : i))
        setLongFormArticles(prev => prev.map(a => a.id === mediaEdit.itemId ? { ...a, coverImage: data.updated.coverImage } : a))
      }
      showToast('Media updated!')
      setMediaEdit(null)
    } catch (e: unknown) {
      setMediaEdit(prev => prev ? { ...prev, saving: false, error: e instanceof Error ? e.message : 'Save failed' } : null)
    }
  }, [mediaEdit]) // eslint-disable-line react-hooks/exhaustive-deps

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

      // Schedule secondary format jobs after successful approve (Instagram only)
      if (action === 'approve') {
        const item = items.find(i => i.id === id)
        if (item) {
          const now = new Date()
          const scheduleJobs: Array<{ format: string; platform: string; delayHours: number }> = []
          if (item.platforms.includes('instagram')) scheduleJobs.push({ format: 'instagram_still', platform: 'instagram', delayHours: 8 })

          for (const job of scheduleJobs) {
            try {
              await fetch('/api/scheduled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: item.channel,
                  headline: item.headline,
                  format: job.format,
                  platform: job.platform,
                  scheduledTime: new Date(now.getTime() + job.delayHours * 60 * 60 * 1000).toISOString(),
                  approvalId: item.id,
                }),
              })
            } catch {
              // Non-critical — don't fail the approval if scheduling fails
            }
          }
        }
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error')
    } finally {
      setActing(null)
      setActingLabel('')
    }
  }

  const regenerateCta = async (item: ApprovalItem) => {
    setRegeneratingCtaId(item.id)
    try {
      const rawCaption = item.slides.map(s => `${s.headline} — ${s.body}`).join('\n\n')
      const caption = rawCaption.length > 2200 ? rawCaption.slice(0, 2197) + '...' : rawCaption
      const res = await fetch('/api/generate-cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, caption, topic: item.topic, channel: item.channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, cta: data.cta } : i))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'CTA generation failed', 'error')
    } finally {
      setRegeneratingCtaId(null)
    }
  }

  const regenerateHashtags = async (item: ApprovalItem) => {
    setRegeneratingHashtagsId(item.id)
    try {
      const res = await fetch('/api/generate-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, topic: item.topic || item.headline, channel: item.channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, hashtags: data.hashtags } : i))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Hashtag generation failed', 'error')
    } finally {
      setRegeneratingHashtagsId(null)
    }
  }

  const regenerateArticle = async (item: ApprovalItem) => {
    setRegeneratingArticleId(item.id)
    try {
      const slidePayload = item.slides.map(s => ({ headline: s.headline, body: s.body }))
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, channel: item.channel, ytTitle: item.ytTitle, slides: slidePayload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        articleBody: data.articleBody,
        articleExcerpt: data.articleExcerpt,
        articleSlug: data.articleSlug,
      } : i))
      setArticleExpandedId(item.id)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Article generation failed', 'error')
    } finally {
      setRegeneratingArticleId(null)
    }
  }

  const removeHashtag = async (item: ApprovalItem, tag: string) => {
    const updated = (item.hashtags || []).filter(t => t !== tag)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, hashtags: updated } : i))
    try {
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, hashtags: updated }),
      })
    } catch {}
  }

  const saveHashtagEdit = async (item: ApprovalItem) => {
    const parsed = hashtagDraft
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => t.startsWith('#') ? t : `#${t}`)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, hashtags: parsed } : i))
    setEditingHashtagsId(null)
    try {
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, hashtags: parsed }),
      })
    } catch {}
  }

  const toggleIncludeCta = async (item: ApprovalItem) => {
    const next = item.includeCta === false ? true : false
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, includeCta: next } : i))
    try {
      await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, includeCta: next }),
      })
    } catch {}
  }

  const downloadVideo = (item: ApprovalItem) => {
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

  const pending = items.filter(i => i.status === 'pending')
  const reviewed = items.filter(i => i.status !== 'pending')
  const previewItem = previewId ? items.find(i => i.id === previewId) : null

  const approvalSlugs = new Set(items.map(i => i.articleSlug).filter((s): s is string => Boolean(s)))
  const orphanedArticles = longFormArticles.filter(a => !approvalSlugs.has(a.slug))

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
                    <div key={item.id} className="bg-white border border-stone-100 rounded-xl">
                      <div className="p-4 flex gap-3">
                        {item.slides[0]?.image && (
                          <div
                            className="w-16 h-20 rounded-lg bg-stone-100 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.slides[0].image})` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-stone-900 truncate">{item.headline}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-stone-500">{item.channel}</p>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {(item.platforms || []).filter(p => p === 'instagram' || p === 'facebook').map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{p}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[10px] text-stone-400">{item.slides.length} slides · {formatDate(item.createdAt)}</p>
                            {item.format === 'reel' ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">Reel script</span>
                            ) : hasVideo ? (
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
                        <div className="relative px-4 pb-3">
                          {/* Left scroll button — only when > 4 slides */}
                          {item.slides.length > 4 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); scrollStrip(item.id, 'left') }}
                              className="absolute left-0 top-[55px] z-10 w-7 h-7 flex items-center justify-center bg-white border border-stone-200 rounded-full shadow-sm text-stone-500 hover:text-stone-900 hover:border-stone-400 transition-colors"
                              aria-label="Scroll left"
                            >
                              ‹
                            </button>
                          )}

                          {/* Scrollable thumbnail strip */}
                          <div
                            ref={(el) => {
                              if (el) stripRefs.current.set(item.id, el)
                              else stripRefs.current.delete(item.id)
                            }}
                            className="flex gap-2 pb-2"
                            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
                          >
                            {item.slides.map((s, i) => (
                              <div key={i} className="flex flex-col items-center gap-1.5" style={{ flexShrink: 0, width: '110px' }}>
                                <div
                                  className="rounded-lg bg-stone-800 relative overflow-hidden"
                                  style={{
                                    width: '110px',
                                    height: '138px',
                                    background: s.image ? `url(${s.image}) center/cover` : '#1a1a1a',
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                  <div className="absolute bottom-0 left-0 right-0 p-2">
                                    <p className="text-white text-[8px] font-medium leading-tight line-clamp-2">{s.headline}</p>
                                  </div>
                                  <span className="absolute top-1 right-1 text-white/50 text-[7px]">{i + 1}</span>
                                </div>
                                <div className="flex gap-1 w-full">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openImagePicker(item.id, i) }}
                                    className="flex-1 py-1 min-h-[28px] text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 font-medium transition-colors text-center"
                                  >
                                    ↺ New
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUploadClick(item.id, i) }}
                                    className="flex-1 py-1 min-h-[28px] text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 font-medium transition-colors text-center"
                                  >
                                    ↑ Upload
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Right scroll button — only when > 4 slides */}
                          {item.slides.length > 4 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); scrollStrip(item.id, 'right') }}
                              className="absolute right-0 top-[55px] z-10 w-7 h-7 flex items-center justify-center bg-white border border-stone-200 rounded-full shadow-sm text-stone-500 hover:text-stone-900 hover:border-stone-400 transition-colors"
                              aria-label="Scroll right"
                            >
                              ›
                            </button>
                          )}
                        </div>
                      )}

                      {/* CTA section */}
                      <div className="px-4 py-3 border-t border-stone-50 bg-stone-50/50">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Engagement CTA</span>
                              {item.cta && (
                                <button
                                  onClick={() => toggleIncludeCta(item)}
                                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${item.includeCta !== false ? 'bg-green-500' : 'bg-stone-200'}`}
                                  aria-label="Toggle CTA"
                                >
                                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${item.includeCta !== false ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                </button>
                              )}
                            </div>
                            {item.cta ? (
                              <p className={`text-[12px] leading-relaxed ${item.includeCta !== false ? 'text-stone-700' : 'text-stone-400 line-through'}`}>
                                &ldquo;{item.cta}&rdquo;
                              </p>
                            ) : (
                              <p className="text-[12px] text-stone-400 italic">No CTA — click Regen to add one</p>
                            )}
                          </div>
                          <button
                            onClick={() => regenerateCta(item)}
                            disabled={regeneratingCtaId === item.id}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors disabled:opacity-40"
                          >
                            {regeneratingCtaId === item.id ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            ) : '↺'} Regen CTA
                          </button>
                        </div>
                      </div>

                      {/* Hashtags section */}
                      <div className="px-4 py-3 border-t border-stone-50 bg-stone-50/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
                            Hashtags {item.hashtags && item.hashtags.length > 0 ? `(${item.hashtags.length})` : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            {item.hashtags && item.hashtags.length > 0 && editingHashtagsId !== item.id && (
                              <button
                                onClick={() => { setEditingHashtagsId(item.id); setHashtagDraft(item.hashtags!.join(' ')) }}
                                className="text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => regenerateHashtags(item)}
                              disabled={regeneratingHashtagsId === item.id}
                              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors disabled:opacity-40"
                            >
                              {regeneratingHashtagsId === item.id ? (
                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                </svg>
                              ) : '↺'} Regen
                            </button>
                          </div>
                        </div>

                        {editingHashtagsId === item.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={hashtagDraft}
                              onChange={e => setHashtagDraft(e.target.value)}
                              rows={3}
                              className="w-full px-2.5 py-2 text-[11px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none leading-relaxed"
                              placeholder="Paste or type hashtags separated by spaces…"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveHashtagEdit(item)}
                                className="flex-1 py-1.5 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingHashtagsId(null)}
                                className="px-3 py-1.5 text-[12px] text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : item.hashtags && item.hashtags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.hashtags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => removeHashtag(item, tag)}
                                title="Click to remove"
                                className="px-2 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors group flex items-center gap-0.5"
                              >
                                {tag}
                                <span className="opacity-0 group-hover:opacity-100 text-[8px] ml-0.5">×</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[12px] text-stone-400 italic">No hashtags — click Regen to generate</p>
                        )}
                      </div>

                      {/* Article preview */}
                      <div className="px-4 py-3 border-t border-stone-50 bg-stone-50/20">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => setArticleExpandedId(articleExpandedId === item.id ? null : item.id)}
                            className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest hover:text-stone-600 transition-colors flex items-center gap-1"
                          >
                            Article preview
                            {item.articleBody && <span className="text-stone-300">{articleExpandedId === item.id ? '▲' : '▼'}</span>}
                          </button>
                          <button
                            onClick={() => regenerateArticle(item)}
                            disabled={regeneratingArticleId === item.id}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors disabled:opacity-40"
                          >
                            {regeneratingArticleId === item.id ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            ) : '↺'} {item.articleBody ? 'Regen article' : 'Generate article'}
                          </button>
                        </div>

                        {item.articleBody ? (
                          <>
                            {item.articleExcerpt && (
                              <p className="text-[11px] text-stone-500 italic mb-2 leading-relaxed">
                                {item.articleExcerpt}
                              </p>
                            )}
                            {item.articleSlug && (
                              <p className="text-[10px] text-stone-400 font-mono mb-2">/{item.articleSlug}</p>
                            )}
                            {articleExpandedId === item.id && (
                              <div className="text-[12px] text-stone-700 leading-relaxed space-y-2 mt-2 border-t border-stone-100 pt-2">
                                {item.articleBody.split(/\n\n+/).map((para, i) => {
                                  if (para.startsWith('## ')) {
                                    return <p key={i} className="font-semibold text-stone-900 text-[13px]">{para.replace(/^## /, '')}</p>
                                  }
                                  return <p key={i}>{para}</p>
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-[12px] text-stone-400 italic">No article yet — click Generate article</p>
                        )}
                      </div>

                      {/* Publish Panel */}
                      {publishPanelId === item.id && (
                        <PublishPanel
                          item={item as PanelItem}
                          youtubeChannelId={CHANNELS[item.channel]?.youtubeChannelId}
                          onUpdate={(updates) => {
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } as ApprovalItem : i))
                            if (updates.status === 'published') setPublishPanelId(null)
                          }}
                        />
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
                              <><span className="text-[11px]">▶</span> Generate video (optional)</>
                            )}
                          </button>
                        )}

                        {/* Inline article fields — shown for items with articleBody */}
                        {item.articleBody && (
                          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">Website article</p>
                              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <span className="text-[10px] text-stone-400">Skip website</span>
                                <input
                                  type="checkbox"
                                  checked={item.publishToWebsite === false}
                                  onChange={e => {
                                    const skip = e.target.checked
                                    setItems(prev => prev.map(i => i.id === item.id ? { ...i, publishToWebsite: skip ? false : true } : i))
                                    fetch('/api/approvals', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: item.id, publishToWebsite: skip ? false : true }),
                                    }).catch(() => {})
                                  }}
                                  className="w-3.5 h-3.5 rounded cursor-pointer"
                                />
                              </label>
                            </div>
                            {item.publishToWebsite !== false && (
                              <div className="flex gap-2 items-start">
                                <div className="w-28 shrink-0">
                                  <label className="text-[10px] text-stone-500 mb-1 block">Series <span className="text-red-400">*</span></label>
                                  <select
                                    value={item.series || ''}
                                    onChange={e => {
                                      const val = e.target.value
                                      setItems(prev => prev.map(i => i.id === item.id ? { ...i, series: val } : i))
                                      fetch('/api/approvals', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: item.id, series: val }),
                                      }).catch(() => {})
                                    }}
                                    className="w-full text-[11px] border border-stone-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:border-stone-400"
                                  >
                                    {getSeriesByChannel(item.channel).map(s => (
                                      <option key={s.slug} value={s.slug}>{s.name}</option>
                                    ))}
                                    {getSeriesByChannel(item.channel).length === 0 && (
                                      <option value="news">News</option>
                                    )}
                                  </select>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <label className="text-[10px] text-stone-500 mb-1 block">Cover image <span className="text-red-400">*</span></label>
                                  {item.coverImageDirect && isImageUrl(item.coverImageDirect) ? (
                                    <div className="flex items-center gap-2 p-1.5 bg-white border border-stone-200 rounded-lg">
                                      <img
                                        src={item.coverImageDirect}
                                        alt=""
                                        className="w-12 h-8 object-cover rounded shrink-0"
                                        onError={e => { e.currentTarget.style.display = 'none' }}
                                      />
                                      <p className="flex-1 text-[10px] text-stone-500 truncate">{item.coverImageDirect.split('/').pop()}</p>
                                      <button
                                        onClick={() => clearCoverImage(item.id)}
                                        className="shrink-0 w-5 h-5 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors rounded text-[16px] leading-none"
                                        title="Remove cover image"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setCoverDragOver(p => ({ ...p, [item.id]: true })) }}
                                      onDragLeave={e => { e.stopPropagation(); setCoverDragOver(p => ({ ...p, [item.id]: false })) }}
                                      onDrop={e => {
                                        e.preventDefault(); e.stopPropagation()
                                        setCoverDragOver(p => ({ ...p, [item.id]: false }))
                                        const file = e.dataTransfer.files[0]
                                        if (file) uploadCoverImage(item.id, file)
                                      }}
                                      onClick={() => { setCoverUploadTarget(item.id); coverFileInputRef.current?.click() }}
                                      className={`flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-[11px] select-none ${
                                        coverDragOver[item.id] ? 'border-stone-400 bg-stone-50 text-stone-600' : 'border-red-200 hover:border-stone-300 text-stone-400 hover:text-stone-600'
                                      }`}
                                    >
                                      {coverUploading[item.id] ? (
                                        <>
                                          <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                          </svg>
                                          Uploading…
                                        </>
                                      ) : (
                                        <>↑ Drop or click to upload</>
                                      )}
                                    </div>
                                  )}
                                  {/* Slide source image shortcuts */}
                                  {(() => {
                                    const slideUrls = item.slides
                                      .map((s, idx) => ({ idx, url: s.imageUrl }))
                                      .filter(({ url }) => url && isImageUrl(url) && !isBlockedImageUrl(url))
                                    return slideUrls.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {slideUrls.map(({ idx, url }) => (
                                          <button
                                            key={idx}
                                            onClick={() => saveCoverImage(item.id, url!)}
                                            className="px-1.5 py-0.5 text-[9px] bg-stone-100 text-stone-500 rounded hover:bg-stone-200 hover:text-stone-800 transition-colors"
                                          >
                                            Use slide {idx + 1}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null
                                  })()}
                                  {coverImageErrors[item.id] && (
                                    <p className="text-[10px] text-red-500 mt-0.5">{coverImageErrors[item.id]}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
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
                          {hasVideo && (
                            <button
                              onClick={() => downloadVideo(item)}
                              className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-700 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                            >
                              <span className="text-[11px]">↓</span> Download
                            </button>
                          )}
                          <button
                            onClick={() => setPublishPanelId(publishPanelId === item.id ? null : item.id)}
                            className={`px-4 py-2.5 min-h-[44px] text-[13px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${publishPanelId === item.id ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'border border-stone-200 text-stone-700 hover:bg-stone-50'}`}
                          >
                            <span className="text-[11px]">🚀</span> Publish
                          </button>
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
                            ) : '↺ Regen'}
                          </button>
                          {(() => {
                            const needsArticleFields = !!item.articleBody && item.publishToWebsite !== false
                            const missingCover = needsArticleFields && (!item.coverImageDirect || !isImageUrl(item.coverImageDirect))
                            const articleBlocked = missingCover
                            const blockReason = missingCover ? 'Cover image required for website article' : ''
                            return (
                              <div className="flex-1 flex flex-col gap-1">
                                <button
                                  onClick={() => handleAction(item.id, 'approve')}
                                  disabled={isActing || articleBlocked}
                                  title={blockReason}
                                  className="w-full px-4 py-2.5 min-h-[44px] text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700"
                                >
                                  {isActing ? (
                                    <>
                                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                      </svg>
                                      {actingLabel}
                                    </>
                                  ) : 'Approve & Post'}
                                </button>
                                {articleBlocked && (
                                  <p className="text-[10px] text-red-500 text-center">{blockReason}</p>
                                )}
                              </div>
                            )
                          })()}
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

            {/* Pending Articles (long-form auto-published, within 15-min hold window) */}
            {pendingArticles.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Pending articles — going live soon</p>
                {pendingArticles.map(article => {
                  const key = `${article.channel}/${article.slug}`
                  const isKilling = killLoading === key
                  const isSaving = !!ytUrlSaving[key]
                  const isEditing = !!ytUrlEditing[key]
                  const minsLeft = Math.ceil((new Date(article.goLiveAt).getTime() - Date.now()) / 60000)
                  return (
                    <div key={article.id} className="bg-white border border-amber-100 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex gap-3">
                        {article.coverImage && (
                          <div
                            className="w-14 h-14 rounded-lg bg-stone-100 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${article.coverImage})` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-stone-900 truncate">{article.title}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5 truncate">{article.excerpt.slice(0, 120)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium">
                              Live in ~{minsLeft} min
                            </span>
                            <span className="text-[10px] text-stone-400">{article.channel} · /{article.slug}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <a
                            href={article.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-[11px] font-medium bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-center"
                          >
                            Preview
                          </a>
                          <button
                            onClick={() => killArticle(article.channel, article.slug)}
                            disabled={isKilling}
                            className="px-3 py-1.5 text-[11px] font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isKilling ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            ) : 'Kill'}
                          </button>
                        </div>
                      </div>
                      {/* YouTube URL — set after manual upload to Studio */}
                      <div className="border-t border-stone-100 pt-3">
                        {article.ytVideoId && !isEditing ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <svg className="w-3 h-3 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              <span className="text-[11px] text-stone-600 font-mono truncate">{article.ytVideoId}</span>
                            </div>
                            <button
                              onClick={() => {
                                setYtUrlEditing(p => ({ ...p, [key]: true }))
                                setYtUrlDraft(p => ({ ...p, [key]: `https://youtube.com/watch?v=${article.ytVideoId}` }))
                              }}
                              className="text-[10px] text-stone-400 hover:text-stone-600 shrink-0"
                            >Edit</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              value={ytUrlDraft[key] ?? ''}
                              onChange={e => setYtUrlDraft(p => ({ ...p, [key]: e.target.value }))}
                              placeholder="https://youtube.com/watch?v=..."
                              className="flex-1 px-2.5 py-1.5 text-[11px] border border-red-100 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-200 bg-white min-w-0"
                            />
                            <button
                              onClick={() => saveYtUrl(article)}
                              disabled={isSaving || !ytUrlDraft[key]}
                              className="px-2.5 py-1.5 text-[11px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shrink-0"
                            >{isSaving ? '…' : 'Save'}</button>
                            {isEditing && (
                              <button
                                onClick={() => setYtUrlEditing(p => ({ ...p, [key]: false }))}
                                className="text-[10px] text-stone-400 hover:text-stone-600 shrink-0"
                              >Cancel</button>
                            )}
                          </div>
                        )}
                        {ytUrlError[key] && (
                          <p className="text-[10px] text-red-500 mt-1">{ytUrlError[key]}</p>
                        )}
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
                {reviewed.slice(0, 20).map(item => {
                  const isEditOpen = mediaEdit?.itemId === item.id
                  const channelSlug = CHANNEL_SLUG_MAP[item.channel]
                  const isWebsiteArticle = item.status === 'approved' && item.websitePublished === true && !!item.articleBody && !!item.articleSlug && !!channelSlug
                  const hasMissingCover = isWebsiteArticle && (!item.coverImageDirect || !isImageUrl(item.coverImageDirect))
                  const editState = isEditOpen ? mediaEdit! : null
                  const displayCover = editState
                    ? (editState.newCover !== undefined ? editState.newCover : editState.currentCover)
                    : null
                  return (
                    <div key={item.id} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                      {/* Card row */}
                      <div className="flex items-center gap-3 p-3">
                        {item.slides[0]?.image && (
                          <div
                            className="w-10 h-12 rounded-md bg-stone-100 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.slides[0].image})` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[12px] font-medium text-stone-800 truncate">{item.headline}</p>
                            {hasMissingCover && (
                              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⚠ cover</span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400">{item.channel} · {formatDate(item.reviewedAt || item.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWebsiteArticle && (
                            <button
                              onClick={() => isEditOpen ? setMediaEdit(null) : openEditMedia(item)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${isEditOpen ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800'}`}
                            >
                              {isEditOpen ? 'Close' : 'Edit media'}
                            </button>
                          )}
                          {item.status === 'approved' && item.websitePublished === true && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">✅ Website</span>
                          )}
                          {item.status === 'approved' && item.websitePublished === false && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">⚠ Website</span>
                          )}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Inline edit media panel */}
                      {isEditOpen && editState && (
                        <div className="border-t border-stone-100 p-3 bg-stone-50/60 flex flex-col gap-3">
                          {editState.fetching ? (
                            <div className="flex items-center gap-2 text-[11px] text-stone-400 py-2">
                              <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                              Loading current media…
                            </div>
                          ) : (
                            <>
                              {/* Cover image */}
                              <div>
                                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Cover image</p>
                                {displayCover ? (
                                  <div className="flex items-center gap-2 p-1.5 bg-white border border-stone-200 rounded-lg">
                                    <img
                                      src={displayCover}
                                      alt=""
                                      className="w-14 h-10 object-cover rounded shrink-0"
                                      onError={e => { e.currentTarget.style.display = 'none' }}
                                    />
                                    <p className="flex-1 text-[10px] text-stone-500 truncate">
                                      {editState.newCover !== undefined ? 'New upload' : 'Current'}
                                    </p>
                                    <button
                                      onClick={() => setMediaEdit(p => p ? { ...p, newCover: null } : null)}
                                      className="w-5 h-5 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors text-[16px] leading-none"
                                      title="Clear cover image"
                                    >×</button>
                                  </div>
                                ) : (
                                  <div
                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setMediaEdit(p => p ? { ...p, coverDragOver: true } : null) }}
                                    onDragLeave={e => { e.stopPropagation(); setMediaEdit(p => p ? { ...p, coverDragOver: false } : null) }}
                                    onDrop={e => {
                                      e.preventDefault(); e.stopPropagation()
                                      setMediaEdit(p => p ? { ...p, coverDragOver: false } : null)
                                      const file = e.dataTransfer.files[0]
                                      if (file) uploadEditCover(file)
                                    }}
                                    onClick={() => editCoverFileRef.current?.click()}
                                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-[11px] select-none ${
                                      editState.coverDragOver ? 'border-stone-400 bg-stone-50 text-stone-600' : 'border-stone-200 hover:border-stone-300 text-stone-400 hover:text-stone-600'
                                    }`}
                                  >
                                    {editState.coverUploading ? (
                                      <>
                                        <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                        </svg>
                                        Uploading…
                                      </>
                                    ) : <>↑ Drop or click to upload</>}
                                  </div>
                                )}
                                {displayCover && (
                                  <button
                                    onClick={() => editCoverFileRef.current?.click()}
                                    disabled={editState.coverUploading}
                                    className="mt-1.5 text-[10px] text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-50"
                                  >
                                    {editState.coverUploading ? 'Uploading…' : '↑ Upload different image'}
                                  </button>
                                )}
                                {/* Slide source shortcuts */}
                                {(() => {
                                  const slideUrls = item.slides
                                    .map((s, idx) => ({ idx, url: s.imageUrl }))
                                    .filter(({ url }) => url && isImageUrl(url) && !isBlockedImageUrl(url))
                                  return slideUrls.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {slideUrls.map(({ idx, url }) => (
                                        <button
                                          key={idx}
                                          onClick={() => setMediaEdit(p => p ? { ...p, newCover: url! } : null)}
                                          className="px-1.5 py-0.5 text-[9px] bg-stone-100 text-stone-500 rounded hover:bg-stone-200 hover:text-stone-800 transition-colors"
                                        >
                                          Use slide {idx + 1}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null
                                })()}
                              </div>

                              {/* YouTube URL */}
                              <div>
                                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">YouTube video</p>
                                {editState.currentYtVideoId && !editState.ytEditing ? (
                                  <div className="flex items-center justify-between gap-2 p-1.5 bg-white border border-stone-200 rounded-lg">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <svg className="w-3 h-3 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                      </svg>
                                      <span className="text-[11px] text-stone-600 font-mono truncate">{editState.currentYtVideoId}</span>
                                    </div>
                                    <button
                                      onClick={() => setMediaEdit(p => p ? { ...p, ytEditing: true, newYtUrl: `https://youtube.com/watch?v=${p.currentYtVideoId}` } : null)}
                                      className="text-[10px] text-stone-400 hover:text-stone-600 shrink-0 transition-colors"
                                    >Edit</button>
                                  </div>
                                ) : (
                                  <input
                                    type="url"
                                    value={editState.newYtUrl}
                                    onChange={e => setMediaEdit(p => p ? { ...p, newYtUrl: e.target.value } : null)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 bg-white"
                                  />
                                )}
                              </div>

                              {editState.error && (
                                <p className="text-[10px] text-red-500">{editState.error}</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEditMedia}
                                  disabled={editState.saving || editState.coverUploading}
                                  className="flex-1 py-1.5 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                                >
                                  {editState.saving ? (
                                    <>
                                      <svg className="w-3 h-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                      </svg>
                                      Saving…
                                    </>
                                  ) : 'Save media'}
                                </button>
                                <button
                                  onClick={() => setMediaEdit(null)}
                                  disabled={editState.saving}
                                  className="px-3 py-1.5 text-[12px] text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                                >Cancel</button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Published Long-Form */}
            {orphanedArticles.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Published long-form</p>
                {orphanedArticles.map(article => {
                  const isEditOpen = mediaEdit?.itemId === article.id
                  const hasMissingCover = !article.coverImage || !isImageUrl(article.coverImage)
                  const editState = isEditOpen ? mediaEdit! : null
                  const displayCover = editState
                    ? (editState.newCover !== undefined ? editState.newCover : editState.currentCover)
                    : null
                  return (
                    <div key={article.id} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                      {/* Card row */}
                      <div className="flex items-center gap-3 p-3">
                        {article.coverImage && isImageUrl(article.coverImage) && (
                          <div
                            className="w-10 h-12 rounded-md bg-stone-100 shrink-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${article.coverImage})` }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[12px] font-medium text-stone-800 truncate">{article.title}</p>
                            {hasMissingCover && (
                              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⚠ cover</span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400">{CHANNEL_DISPLAY_MAP[article.channel] ?? article.channel} · {formatDate(article.publishedAt)}</p>
                        </div>
                        <button
                          onClick={() => isEditOpen ? setMediaEdit(null) : openEditMediaBySlug(article)}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors shrink-0 ${isEditOpen ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800'}`}
                        >
                          {isEditOpen ? 'Close' : 'Edit media'}
                        </button>
                      </div>

                      {/* Edit panel */}
                      {editState && (
                        <div className="border-t border-stone-100 p-3 bg-stone-50 space-y-3">
                          {editState.fetching ? (
                            <p className="text-[11px] text-stone-400 text-center py-2">Loading…</p>
                          ) : (
                            <>
                              {/* Cover image section */}
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Cover image</p>
                                {displayCover ? (
                                  <div className="relative rounded-lg overflow-hidden border border-stone-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={displayCover} alt="Cover" className="w-full h-28 object-cover" />
                                    <button
                                      onClick={() => setMediaEdit(prev => prev ? { ...prev, newCover: null } : null)}
                                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-black/70"
                                    >✕</button>
                                  </div>
                                ) : (
                                  <div
                                    onDragOver={e => { e.preventDefault(); setMediaEdit(prev => prev ? { ...prev, coverDragOver: true } : null) }}
                                    onDragLeave={() => setMediaEdit(prev => prev ? { ...prev, coverDragOver: false } : null)}
                                    onDrop={e => {
                                      e.preventDefault()
                                      setMediaEdit(prev => prev ? { ...prev, coverDragOver: false } : null)
                                      const file = e.dataTransfer.files?.[0]
                                      if (file) uploadEditCover(file)
                                    }}
                                    onClick={() => editCoverFileRef.current?.click()}
                                    className={`w-full flex flex-col items-center justify-center gap-1.5 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${editState.coverDragOver ? 'border-stone-400 bg-stone-100' : 'border-stone-200 hover:border-stone-400 bg-white'}`}
                                  >
                                    {editState.coverUploading
                                      ? <span className="text-[11px] text-stone-500">Uploading…</span>
                                      : <span className="text-[11px] text-stone-400">Drop image or click to upload</span>
                                    }
                                  </div>
                                )}
                              </div>

                              {/* YouTube URL */}
                              <div className="space-y-1">
                                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">YouTube video</p>
                                {editState.currentYtVideoId && !editState.ytEditing ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <svg className="w-3 h-3 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                      </svg>
                                      <span className="text-[11px] text-stone-600 font-mono truncate">{editState.currentYtVideoId}</span>
                                    </div>
                                    <button
                                      onClick={() => setMediaEdit(prev => prev ? { ...prev, ytEditing: true, newYtUrl: `https://www.youtube.com/watch?v=${prev.currentYtVideoId}` } : null)}
                                      className="text-[10px] text-stone-400 hover:text-stone-600 shrink-0"
                                    >Edit</button>
                                  </div>
                                ) : (
                                  <input
                                    type="url"
                                    value={editState.newYtUrl}
                                    onChange={e => setMediaEdit(prev => prev ? { ...prev, newYtUrl: e.target.value } : null)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-2.5 py-1.5 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400"
                                  />
                                )}
                              </div>

                              {editState.error && <p className="text-[11px] text-red-500">{editState.error}</p>}
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEditMedia}
                                  disabled={editState.saving}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
                                >
                                  {editState.saving ? 'Saving…' : 'Save media'}
                                </button>
                                <button
                                  onClick={() => setMediaEdit(null)}
                                  disabled={editState.saving}
                                  className="px-3 py-1.5 text-[12px] text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                                >Cancel</button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image picker modal */}
      {imagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !imagePicker.saving && setImagePicker(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-stone-100">
              <p className="text-[14px] font-medium text-stone-900">Choose image for slide {imagePicker.slideIndex + 1}</p>
              {!imagePicker.searchMode && imagePicker.activeTab === 'search' && imagePicker.options.length > 0 && (
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Image {imagePicker.currentIdx + 1} of {imagePicker.options.length}
                </p>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-stone-100">
              <button
                onClick={() => setImagePicker(p => p ? { ...p, activeTab: 'search' } : null)}
                className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${imagePicker.activeTab === 'search' ? 'text-stone-900 border-b-2 border-stone-900 -mb-px' : 'text-stone-400 hover:text-stone-600'}`}
              >
                Web Search
              </button>
              <button
                onClick={() => {
                  setImagePicker(p => p ? { ...p, activeTab: 'drive' } : null)
                  if (imagePicker.driveFiles.length === 0) {
                    loadDriveImages(imagePicker.driveChannel || imagePicker.itemId)
                  }
                }}
                className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${imagePicker.activeTab === 'drive' ? 'text-stone-900 border-b-2 border-stone-900 -mb-px' : 'text-stone-400 hover:text-stone-600'}`}
              >
                Drive Library
              </button>
              <button
                onClick={() => setImagePicker(p => p ? { ...p, activeTab: 'ai' } : null)}
                className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${imagePicker.activeTab === 'ai' ? 'text-stone-900 border-b-2 border-stone-900 -mb-px' : 'text-stone-400 hover:text-stone-600'}`}
              >
                ✦ AI Generate
              </button>
            </div>

            {/* ── Search tab ── */}
            {imagePicker.activeTab === 'search' && (
              <>
                {/* Custom search bar */}
                <div className="px-4 pt-3 pb-2 flex gap-2">
                  <input
                    type="text"
                    value={imagePicker.searchQuery}
                    onChange={e => setImagePicker(p => p ? { ...p, searchQuery: e.target.value } : null)}
                    onKeyDown={e => e.key === 'Enter' && searchInPicker()}
                    placeholder="Search for a different image..."
                    className="flex-1 px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <button
                    onClick={searchInPicker}
                    disabled={imagePicker.searching || !imagePicker.searchQuery.trim()}
                    className="px-3 py-2 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {imagePicker.searching ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    ) : 'Search'}
                  </button>
                </div>

                {/* Image preview — hidden in search mode (no images yet) */}
                {!imagePicker.searchMode && imagePicker.options.length > 0 && (
                  <>
                    <div className="bg-stone-100 flex items-center justify-center relative" style={{ minHeight: '260px', maxHeight: '360px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePicker.options[imagePicker.currentIdx]}
                        alt="Image option"
                        className="max-w-full max-h-[360px] object-contain"
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
                  </>
                )}

                {/* Search mode placeholder */}
                {imagePicker.searchMode && (
                  <div className="flex items-center justify-center bg-stone-50 border-t border-stone-100" style={{ minHeight: '160px' }}>
                    <p className="text-[12px] text-stone-400 text-center px-6">
                      No images found automatically.<br/>Type a search term above and tap Search.
                    </p>
                  </div>
                )}

                {/* Search-tab actions */}
                <div className="flex gap-2 p-4 pt-2 border-t border-stone-100">
                  {!imagePicker.searchMode && imagePicker.options.length > 0 && (
                    <>
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
                    </>
                  )}
                  <button
                    onClick={() => setImagePicker(null)}
                    disabled={imagePicker.saving}
                    className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-500 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* ── Drive tab ── */}
            {imagePicker.activeTab === 'drive' && (
              <>
                {/* Drive search bar */}
                <div className="px-4 pt-3 pb-2 flex gap-2">
                  <input
                    type="text"
                    value={imagePicker.driveQuery}
                    onChange={e => setImagePicker(p => p ? { ...p, driveQuery: e.target.value } : null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') loadDriveImages(imagePicker.driveChannel, imagePicker.driveQuery)
                    }}
                    placeholder="Filter by filename..."
                    className="flex-1 px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <button
                    onClick={() => loadDriveImages(imagePicker.driveChannel, imagePicker.driveQuery)}
                    disabled={imagePicker.driveLoading}
                    className="px-3 py-2 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {imagePicker.driveLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    ) : 'Filter'}
                  </button>
                </div>

                {/* Drive file grid */}
                {imagePicker.driveLoading && imagePicker.driveFiles.length === 0 ? (
                  <div className="flex items-center justify-center bg-stone-50" style={{ minHeight: '200px' }}>
                    <svg className="w-5 h-5 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : imagePicker.driveFiles.length === 0 ? (
                  <div className="flex items-center justify-center bg-stone-50 border-t border-stone-100" style={{ minHeight: '200px' }}>
                    <p className="text-[12px] text-stone-400 text-center px-6">
                      No images in Drive for this channel yet.<br/>Generated carousels are saved automatically.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto border-t border-stone-100" style={{ maxHeight: '340px' }}>
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                      {imagePicker.driveFiles.map(file => (
                        <button
                          key={file.id}
                          onClick={() => useDriveImage(file.id, imagePicker.slideIndex, imagePicker.itemId)}
                          disabled={imagePicker.saving}
                          className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-green-500 transition-all focus:outline-none focus:border-green-500 disabled:opacity-50 group"
                        >
                          {file.thumbnailLink ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.thumbnailLink}
                              alt={file.name}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-stone-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[9px] text-white truncate">{file.name}</p>
                          </div>
                          {imagePicker.saving && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                              <svg className="w-4 h-4 animate-spin text-stone-600" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drive-tab actions */}
                <div className="flex gap-2 p-4 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => setImagePicker(null)}
                    disabled={imagePicker.saving}
                    className="flex-1 px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-500 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* ── AI Generate tab ── */}
            {imagePicker.activeTab === 'ai' && (
              <>
                {/* Context info */}
                <div className="px-4 pt-3 pb-2 space-y-1.5">
                  <p className="text-[11px] text-stone-400 uppercase tracking-wide font-medium">Channel</p>
                  <p className="text-[13px] text-stone-800 font-medium">{imagePicker.driveChannel}</p>
                  <p className="text-[11px] text-stone-400 uppercase tracking-wide font-medium mt-2">Topic</p>
                  <input
                    type="text"
                    value={imagePicker.topic}
                    onChange={e => setImagePicker(p => p ? { ...p, topic: e.target.value } : null)}
                    className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
                    placeholder="Describe what to generate..."
                  />
                </div>

                {/* Generated image preview / placeholder */}
                {imagePicker.aiGenerating ? (
                  <div className="flex flex-col items-center justify-center bg-stone-50 border-t border-stone-100 gap-3" style={{ minHeight: '260px' }}>
                    <svg className="w-7 h-7 animate-spin text-stone-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[12px] text-stone-400">Generating with DALL-E 3…</p>
                    <p className="text-[10px] text-stone-300">Usually takes 10–20 seconds</p>
                  </div>
                ) : imagePicker.aiImage ? (
                  <div className="bg-stone-100 border-t border-stone-100 flex items-center justify-center relative" style={{ minHeight: '260px', maxHeight: '380px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePicker.aiImage}
                      alt="AI generated"
                      className="max-w-full max-h-[380px] object-contain"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] font-medium px-2 py-0.5 rounded-full">
                      DALL-E 3
                    </div>
                  </div>
                ) : imagePicker.aiError ? (
                  <div className="flex flex-col items-center justify-center bg-red-50 border-t border-stone-100 gap-2 px-6" style={{ minHeight: '160px' }}>
                    <p className="text-[12px] text-red-600 text-center">{imagePicker.aiError}</p>
                    <p className="text-[11px] text-stone-400 text-center">Check that OPENAI_API_KEY is set in your environment.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-stone-50 border-t border-stone-100 gap-2 px-6" style={{ minHeight: '180px' }}>
                    <p className="text-[13px] text-stone-500 text-center font-medium">Generate a unique image with AI</p>
                    <p className="text-[11px] text-stone-400 text-center">Uses DALL-E 3 with a channel-specific style prompt. Portrait format, 1024 × 1792.</p>
                  </div>
                )}

                {/* AI-tab actions */}
                <div className="flex gap-2 p-4 pt-2 border-t border-stone-100">
                  {imagePicker.aiImage ? (
                    <>
                      <button
                        onClick={useAiImage}
                        disabled={imagePicker.saving}
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
                        onClick={generateAiImage}
                        disabled={imagePicker.aiGenerating || imagePicker.saving}
                        className="px-4 py-2.5 min-h-[44px] bg-stone-100 text-stone-700 text-[13px] font-medium rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
                      >
                        Retry
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={generateAiImage}
                      disabled={imagePicker.aiGenerating || !imagePicker.topic.trim()}
                      className="flex-1 px-4 py-2.5 min-h-[44px] bg-violet-600 text-white text-[13px] font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {imagePicker.aiGenerating ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                          Generating…
                        </>
                      ) : '✦ Generate with DALL-E 3'}
                    </button>
                  )}
                  <button
                    onClick={() => setImagePicker(null)}
                    disabled={imagePicker.saving}
                    className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-500 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for manual image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden file input for cover image upload */}
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleCoverFileChange}
      />

      {/* Hidden file input for edit-media cover upload */}
      <input
        ref={editCoverFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={handleEditCoverFileChange}
      />

      {/* Video preview modal */}
      {previewItem?.videoBase64 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={() => setPreviewId(null)}>
          <div
            className="bg-white rounded-2xl overflow-hidden w-full shadow-xl"
            style={{ maxWidth: 'min(512px, 100vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video player */}
            <div className="bg-black overflow-hidden">
              <video
                src={previewItem.videoBase64}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[60vh]"
                style={{ objectFit: 'contain', display: 'block' }}
              />
            </div>

            {/* Info + actions */}
            <div className="p-4 flex flex-col gap-3">
              <div>
                <p className="text-[14px] font-medium text-stone-900">{previewItem.headline}</p>
                <p className="text-[12px] text-stone-500 mt-0.5">{previewItem.channel} · {previewItem.slides.length} slides</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {(previewItem.platforms || []).filter(p => p === 'instagram' || p === 'facebook').map(p => (
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
                  onClick={() => downloadVideo(previewItem)}
                  className="px-4 py-2.5 min-h-[44px] border border-stone-200 text-stone-700 text-[13px] font-medium rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-[11px]">↓</span> Download
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
