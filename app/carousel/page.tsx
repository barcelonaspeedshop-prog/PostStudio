'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

type Slide = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string // base64 data URL
  tileType?: 'story' | 'story-text' | 'hook' | 'brand' | 'cta' | 'food-image' | 'food-must-order' | 'food-info' | 'food-pro-tips' | 'food-magazine' | 'thumbnail' | 'find-us-map'
  foodDishes?: Array<{ name: string; description: string; price?: string }>
  foodMustOrder?: { name: string; description: string; priceRange?: string }
  foodInfoItems?: Array<{ icon: string; label: string; value: string }>
  foodRestaurantName?: string
  foodProTips?: string[]
}

const CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira F1',
  'Omnira Football',
  'Omnira Food',
]

const ACCENT_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  red:    { bg: '#1a0e08', text: '#c8390a', badge: 'rgba(200,57,10,0.55)' },
  amber:  { bg: '#0e0c08', text: '#c87030', badge: 'rgba(200,112,48,0.55)' },
  blue:   { bg: '#0c0e10', text: '#185fa5', badge: 'rgba(24,95,165,0.55)' },
  green:  { bg: '#0a1008', text: '#2a8040', badge: 'rgba(42,128,64,0.55)' },
  purple: { bg: '#0e0c14', text: '#7f77dd', badge: 'rgba(127,119,221,0.55)' },
  teal:   { bg: '#081010', text: '#1d9e75', badge: 'rgba(29,158,117,0.55)' },
}

function SlidePreview({ slide, index }: { slide: Slide; index: number }) {
  const colors = ACCENT_COLORS[slide.accent] || ACCENT_COLORS.red
  return (
    <div
      className="relative rounded-xl overflow-hidden flex-shrink-0 w-[160px] h-[200px] md:w-[200px] md:h-[250px]"
      style={{
        background: slide.image ? `url(${slide.image}) center/cover` : colors.bg,
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)' }}
      />
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 p-3">
        <p className="text-[8px] font-medium tracking-widest uppercase" style={{ color: colors.text }}>{slide.tag}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{slide.num}</p>
      </div>
      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-medium text-[11px] leading-tight mb-1.5">{slide.headline}</p>
        <p className="text-white/65 text-[9px] leading-relaxed mb-2 line-clamp-3">{slide.body}</p>
        <span
          className="text-[8px] font-medium tracking-wider uppercase px-2 py-0.5 rounded"
          style={{ background: colors.badge, color: colors.text }}
        >
          {slide.badge}
        </span>
      </div>
      {/* Slide number badge */}
      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center">
        <span className="text-white/60 text-[8px]">{index + 1}</span>
      </div>
    </div>
  )
}

export default function CarouselPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState('Gentlemen of Fuel')
  const [slideCount, setSlideCount] = useState(6)
  const [slides, setSlides] = useState<Slide[]>([])
  const [generating, setGenerating] = useState(false)

  // Food Guide Builder state
  const [foodMode, setFoodMode] = useState<'no-frills' | 'top5'>('no-frills')
  const [foodRestaurants, setFoodRestaurants] = useState([{ name: '', city: '' }, { name: '', city: '' }, { name: '', city: '' }, { name: '', city: '' }, { name: '', city: '' }])
  const [buildingFood, setBuildingFood] = useState(false)
  const [foodBuildStatus, setFoodBuildStatus] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [foodRestaurantMetas, setFoodRestaurantMetas] = useState<any[]>([])
  const [exportingSlides, setExportingSlides] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [slideDuration, setSlideDuration] = useState(3)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadingNews, setLoadingNews] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishPlatforms, setPublishPlatforms] = useState<string[]>([])
  const [mobilePanel, setMobilePanel] = useState<'controls' | 'slides' | 'detail'>('slides')
  const slideStripRef = useRef<HTMLDivElement>(null)
  const [showYouTube, setShowYouTube] = useState(false)
  const [ytPublishing, setYtPublishing] = useState(false)
  const [sendingApproval, setSendingApproval] = useState(false)
  const [ytTitle, setYtTitle] = useState('')
  const [ytDescription, setYtDescription] = useState('')
  const [ytTags, setYtTags] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [isRestored, setIsRestored] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const generateYtTags = () => {
    const tags: string[] = []
    // Channel name and its keywords
    tags.push(channel)
    const channelWords: Record<string, string[]> = {
      'Gentlemen of Fuel': ['Motorsport', 'Cars', 'Racing', 'Automotive'],
      'Omnira F1': ['Formula 1', 'F1', 'Grand Prix', 'Racing', 'Motorsport'],
      'Road & Trax': ['Cars', 'Automotive', 'Driving', 'Road Cars'],
      'Omnira Football': ['Football', 'Soccer', 'Premier League'],
      'Omnira NFL': ['NFL', 'American Football', 'Gridiron'],
      'Omnira Golf': ['Golf', 'PGA', 'Golf Tour'],
      'Omnira Cricket': ['Cricket', 'Test Cricket', 'T20'],
      'Omnira Food': ['Food', 'Cooking', 'Recipe', 'Foodie'],
      'Omnira Travel': ['Travel', 'Adventure', 'Destination'],
    }
    tags.push(...(channelWords[channel] || []))
    // Topic keywords (skip short/common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with', 'how', 'why', 'what'])
    if (topic) {
      const topicWords = topic.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
      tags.push(...topicWords.slice(0, 4))
    }
    // Key nouns from slide headlines
    for (const s of slides) {
      const words = s.headline.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()) && /^[A-Z]/.test(w))
      tags.push(...words)
    }
    // Hashtags from all slide content
    const allText = slides.map(s => `${s.headline} ${s.body} ${s.tag} ${s.badge}`).join(' ')
    const hashTags = (allText.match(/#[\w]+/g) || []).map(t => t.replace('#', ''))
    tags.push(...hashTags)
    // Dedupe (case-insensitive), limit to 15
    const seen = new Set<string>()
    const unique = tags.filter(t => {
      const key = t.toLowerCase().trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return unique.slice(0, 15).join(', ')
  }

  // Reset YouTube fields when slides or channel change
  useEffect(() => {
    if (slides.length > 0) {
      setYtTitle(slides[0]?.headline || '')
      setYtDescription(slides.map(s => s.headline + '\n' + s.body).join('\n\n'))
      setYtTags(generateYtTags())
    }
  }, [slides, channel])

  const DRAFT_KEY = 'draft_carousel'

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.topic) setTopic(d.topic)
        if (d.channel) setChannel(d.channel)
        if (typeof d.slideCount === 'number') setSlideCount(d.slideCount)
        if (Array.isArray(d.slides) && d.slides.length > 0) {
          setSlides(d.slides)
          setSelectedSlide(d.selectedSlide ?? 0)
        }
        if (typeof d.slideDuration === 'number') setSlideDuration(d.slideDuration)
        if (Array.isArray(d.publishPlatforms)) setPublishPlatforms(d.publishPlatforms)
      }
    } catch {}
    setIsRestored(true)
  }, [])

  // Save draft when state changes (only after restore)
  useEffect(() => {
    if (!isRestored) return
    if (!topic && slides.length === 0) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        topic, channel, slideCount, slides, selectedSlide, slideDuration, publishPlatforms,
      }))
      setDraftSaved(true)
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => setDraftSaved(false), 2000)
    } catch {
      // Quota exceeded (large images) — fail silently
    }
  }, [isRestored, topic, channel, slideCount, slides, selectedSlide, slideDuration, publishPlatforms])

  const PUBLISH_PLATFORMS = [
    { id: 'instagram', label: 'Instagram', icon: 'IG' },
    { id: 'tiktok', label: 'TikTok', icon: 'TT' },
    { id: 'twitter', label: 'X', icon: 'X' },
    { id: 'facebook', label: 'Facebook', icon: 'FB' },
    { id: 'youtube', label: 'YouTube', icon: 'YT' },
  ]

  const togglePlatform = (id: string) => {
    setPublishPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const publishNow = async () => {
    if (publishPlatforms.length === 0) {
      showToast('Select at least one platform', 'error')
      return
    }
    setPublishing(true)
    try {
      const caption = slides.map((s) => `${s.headline} — ${s.body}`).join('\n\n')
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption,
          mediaUrl: videoUrl,
          platforms: publishPlatforms,
          firstSlideHeadline: slides[0]?.headline || '',
          channel,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.details ? ` — ${JSON.stringify(data.details)}` : ''
        throw new Error((data.error || `Publish failed (${res.status})`) + detail)
      }
      showToast(`Published to ${publishPlatforms.length} platform${publishPlatforms.length > 1 ? 's' : ''}!`)
      // Auto-schedule secondary formats
      try {
        const now = new Date()
        const scheduleJobs = []
        if (publishPlatforms.includes('youtube')) scheduleJobs.push({ format: 'short', platform: 'youtube', hours: 4 })
        if (publishPlatforms.includes('tiktok')) scheduleJobs.push({ format: 'tiktok', platform: 'tiktok', hours: 2 })
        for (const job of scheduleJobs) {
          const scheduledTime = new Date(now.getTime() + job.hours * 60 * 60 * 1000).toISOString()
          await fetch('/api/scheduled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, headline: slides[0]?.headline || '', format: job.format, platform: job.platform, scheduledTime, status: 'pending' })
          })
        }
      } catch { /* non-critical */ }
      setShowPublish(false)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error publishing', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const NEWS_CHANNELS = [
    'Gentlemen of Fuel',
    'Omnira F1',
    'Road & Trax',
    'Omnira Football',
  ]
  const [newsChannel, setNewsChannel] = useState(NEWS_CHANNELS[0])

  const loadTodaysNews = async () => {
    setLoadingNews(true)
    try {
      const res = await fetch(`/api/news-brief?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: newsChannel, timestamp: Date.now() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Load slides as text-only — user uploads their own images
      const newSlides = data.slides as Slide[]
      setSlides(newSlides)
      setSlideCount(5)
      setTopic(data.topic)
      setChannel(newsChannel)
      setSelectedSlide(0)
      showToast(`Loaded: ${data.story}`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error loading news', 'error')
    } finally {
      setLoadingNews(false)
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const generateSlides = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return }
    runGeneration()
  }

  const runGeneration = async (hook?: string) => {
    const prevImages = slides.map(s => s.image)
    setGenerating(true)
    try {
      const res = await fetch('/api/carousel-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel, slideCount, ...(hook ? { hook } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newSlides: Slide[] = data.slides
      // Restore uploaded images when slide count hasn't changed significantly
      if (prevImages.length > 0 && Math.abs(newSlides.length - prevImages.length) <= 2) {
        for (let i = 0; i < Math.min(newSlides.length, prevImages.length); i++) {
          if (prevImages[i] && prevImages[i] !== 'loading') {
            newSlides[i] = { ...newSlides[i], image: prevImages[i] }
          }
        }
      }
      setSlides(newSlides)
      setSelectedSlide(0)
      showToast(`${newSlides.length} slides generated!`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating slides', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const renderSlideToCanvas = async (slide: Slide): Promise<string> => {
    const W = 1080, H = 1350
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    const colors = ACCENT_COLORS[slide.accent] || ACCENT_COLORS.red

    // Background
    ctx.fillStyle = colors.bg
    ctx.fillRect(0, 0, W, H)

    // Draw image if present
    if (slide.image && slide.image !== 'loading') {
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          try {
            const scale = Math.max(W / img.width, H / img.height)
            const sw = img.width * scale, sh = img.height * scale
            const sx = (W - sw) / 2, sy = (H - sh) / 2
            ctx.drawImage(img, sx, sy, sw, sh)
          } catch {}
          resolve()
        }
        img.onerror = () => resolve()
        // Small delay to ensure base64 is ready
        setTimeout(() => { img.src = slide.image! }, 10)
      })
    }

    // Gradient overlay bottom
    const grad = ctx.createLinearGradient(0, H * 0.2, 0, H)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.4, 'rgba(0,0,0,0.5)')
    grad.addColorStop(1, 'rgba(0,0,0,0.88)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Top vignette
    const topGrad = ctx.createLinearGradient(0, 0, 0, 180)
    topGrad.addColorStop(0, 'rgba(0,0,0,0.5)')
    topGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, 180)

    const pad = 80

    // Tag
    ctx.font = '500 32px sans-serif'
    ctx.fillStyle = colors.text
    ctx.globalAlpha = 0.85
    ctx.fillText(slide.tag, pad, 80)
    ctx.globalAlpha = 1

    // Slide number
    ctx.font = '400 36px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(slide.num, pad, 130)

    // Headline — large
    ctx.font = '500 96px sans-serif'
    ctx.fillStyle = '#ffffff'
    const hedWords = slide.headline.split(' ')
    let hedLines: string[] = []
    let currentLine = ''
    for (const word of hedWords) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(test).width <= W - pad * 2) {
        currentLine = test
      } else {
        if (currentLine) hedLines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) hedLines.push(currentLine)

    // Position text from bottom
    const badgeH = 70
    const bodyLines = wrapText(ctx, slide.body, W - pad * 2, '400 40px sans-serif')
    const bodyH = bodyLines.length * 52
    const hedH = hedLines.length * 108
    const totalTextH = hedH + 40 + bodyH + 40 + badgeH
    let textY = H - pad - totalTextH

    // Draw headline
    ctx.font = '500 96px sans-serif'
    ctx.fillStyle = '#ffffff'
    for (const line of hedLines) {
      ctx.fillText(line, pad, textY)
      textY += 108
    }

    // Divider
    textY += 20
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(pad, textY, 240, 2)
    textY += 32

    // Body
    ctx.font = '400 40px sans-serif'
    ctx.fillStyle = 'rgba(240,240,240,0.8)'
    for (const line of bodyLines) {
      ctx.fillText(line, pad, textY)
      textY += 52
    }

    // Badge
    textY += 20
    ctx.font = '500 28px sans-serif'
    const badgeText = slide.badge
    const badgeW = ctx.measureText(badgeText).width + 48
    ctx.fillStyle = colors.badge
    ctx.beginPath()
    ctx.roundRect(pad, textY, badgeW, 52, 8)
    ctx.fill()
    ctx.fillStyle = colors.text
    ctx.fillText(badgeText, pad + 24, textY + 36)

    return canvas.toDataURL('image/jpeg', 0.92)
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, font: string): string[] {
    ctx.font = font
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word
      if (ctx.measureText(test).width <= maxW) { cur = test }
      else { if (cur) lines.push(cur); cur = word }
    }
    if (cur) lines.push(cur)
    return lines
  }

  const generateVideo = async () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    setGeneratingVideo(true)
    setVideoUrl(null)
    showToast('Compositing slides — this takes about 60 seconds...')
    try {
      // Render each slide to canvas with text overlay — sequential with small delay
      const composited: string[] = []
      for (const slide of slides) {
        const rendered = await renderSlideToCanvas(slide)
        composited.push(rendered)
        await new Promise(r => setTimeout(r, 50))
      }
      const compositedSlides = slides.map((s, i) => ({ ...s, image: composited[i] }))

      const res = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: compositedSlides, slideDuration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVideoUrl(data.video)
      showToast('Video ready!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating video', 'error')
    } finally {
      setGeneratingVideo(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setSlides((prev) => {
          const updated = [...prev]
          const targetIndex = selectedSlide !== null ? selectedSlide + i : i
          if (updated[targetIndex]) {
            updated[targetIndex] = { ...updated[targetIndex], image: dataUrl }
          }
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
    showToast(`${files.length} image${files.length > 1 ? 's' : ''} added`)
  }

  const downloadSlides = () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    // Create a simple text export of all slide content
    const content = slides.map(s =>
      `SLIDE ${s.num}\n${s.tag}\n${s.headline}\n${s.body}\n[${s.badge}]\n`
    ).join('\n---\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${channel.replace(/\s+/g, '_')}_carousel.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Slides exported!')
  }

  const publishToYouTube = async () => {
    if (!videoUrl) { showToast('Export video first', 'error'); return }
    setYtPublishing(true)
    showToast('Uploading to YouTube...')
    try {
      const caption = slides.map((s) => `${s.headline} — ${s.body}`).join('\n\n')
      const tagsArray = ytTags
        ? ytTags.split(',').map(t => t.trim()).filter(Boolean)
        : caption.match(/#[\w]+/g)?.map(t => t.replace('#', '')) || []
      const payload = {
        videoBase64: videoUrl,
        title: ytTitle || slides[0]?.headline || 'Carousel Video',
        description: ytDescription || caption,
        tags: tagsArray,
        channelName: channel,
      }
      console.log('[youtube-publish-client] Sending:', { title: payload.title, description: payload.description.slice(0, 100) + '...', tags: payload.tags, channelName: payload.channelName, videoSize: payload.videoBase64.length })
      const res = await fetch('/api/publish/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Published to YouTube!`)
      setShowYouTube(false)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'YouTube upload failed', 'error')
    } finally {
      setYtPublishing(false)
    }
  }

  const sendForApproval = async () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    setSendingApproval(true)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          headline: slides[0]?.headline || topic || 'Untitled',
          topic,
          slides,
          videoBase64: videoUrl || undefined,
          platforms: publishPlatforms.length > 0 ? publishPlatforms : ['instagram', 'tiktok', 'youtube'],
          ytTitle: ytTitle || slides[0]?.headline || '',
          ytDescription: ytDescription || slides.map(s => s.headline + '\n' + s.body).join('\n\n'),
          ytTags: ytTags ? ytTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
          // Food Guide: pass restaurant metadata for auto-publish to website on approval
          ...(channel === 'Omnira Food' && foodRestaurantMetas.length === 1 && { restaurantMeta: foodRestaurantMetas[0] }),
          ...(channel === 'Omnira Food' && foodRestaurantMetas.length > 1 && { restaurantMetas: foodRestaurantMetas }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Sent for approval!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to send for approval', 'error')
    } finally {
      setSendingApproval(false)
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setTopic('')
    setChannel('Gentlemen of Fuel')
    setSlideCount(6)
    setSlides([])
    setSelectedSlide(null)
    setSlideDuration(3)
    setPublishPlatforms([])
    setVideoUrl(null)
    setDraftSaved(false)
    showToast('Draft cleared')
  }

  const buildFoodCarousel = async () => {
    const valid = foodMode === 'no-frills'
      ? foodRestaurants.slice(0, 1).filter(r => r.name.trim() && r.city.trim())
      : foodRestaurants.filter(r => r.name.trim() && r.city.trim()).slice(0, 5)

    if (!valid.length) {
      showToast('Enter at least one restaurant name and city', 'error')
      return
    }

    setBuildingFood(true)
    setFoodBuildStatus('Researching restaurants with web search…')
    setSlides([])
    setSelectedSlide(null)

    try {
      // Step 1: Generate slides via Claude web search
      const genRes = await fetch('/api/food-carousel-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: foodMode, restaurants: valid, channel }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || 'Slide generation failed')

      const rawSlides: Slide[] = genData.slides.map((s: Slide) => ({ ...s, image: undefined }))
      setSlides(rawSlides)
      setSelectedSlide(0)
      setTopic(foodMode === 'no-frills'
        ? `${valid[0].name} — ${valid[0].city} (No Frills But Kills)`
        : `Top ${valid.length} Eats — ${valid.map(r => r.city).filter((c, i, a) => a.indexOf(c) === i).join(', ')}`)

      // Store restaurant metadata for the approval workflow + website auto-publish
      const metas = genData.restaurantMetas || (genData.restaurantMeta ? [genData.restaurantMeta] : [])
      setFoodRestaurantMetas(metas)

      const imageQueries: string[] = genData.imageQueries || []

      // Step 2: Auto-fetch images via Serper + proxy
      setFoodBuildStatus(`Finding food photos (0/${rawSlides.length})…`)
      const updatedSlides = [...rawSlides]

      await Promise.all(
        rawSlides.map(async (_, idx) => {
          const query = imageQueries[idx]
          if (!query) return

          try {
            // Search Serper for image URLs
            const searchRes = await fetch('/api/search-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, count: 5 }),
            })
            if (!searchRes.ok) return
            const searchData = await searchRes.json()
            const urls: { url: string }[] = searchData.images || []

            // Try each URL until one proxies successfully
            for (const { url } of urls.slice(0, 5)) {
              try {
                const proxyRes = await fetch('/api/fetch-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url }),
                })
                if (!proxyRes.ok) continue
                const proxyData = await proxyRes.json()
                if (proxyData.base64) {
                  updatedSlides[idx] = { ...updatedSlides[idx], image: proxyData.base64 }
                  setSlides(prev => {
                    const next = [...prev]
                    next[idx] = { ...next[idx], image: proxyData.base64 }
                    return next
                  })
                  break
                }
              } catch { /* try next */ }
            }
          } catch { /* image fetch failed — slide stays text-only */ }
        })
      )

      showToast(`${rawSlides.length} slides built${imageQueries.length ? ' with images' : ''}!`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error building food carousel', 'error')
    } finally {
      setBuildingFood(false)
      setFoodBuildStatus('')
    }
  }

  const exportSlides = async () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    setExportingSlides(true)
    showToast('Compositing slides for export…')
    try {
      const res = await fetch('/api/export-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, channel }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${channel.replace(/\s+/g, '_').toLowerCase()}_slides.zip`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Slides downloaded!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error')
    } finally {
      setExportingSlides(false)
    }
  }

  const reorderSlide = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= slides.length) return
    setSlides(prev => {
      const updated = [...prev]
      const temp = updated[fromIndex]
      updated[fromIndex] = updated[toIndex]
      updated[toIndex] = temp
      return updated
    })
    // Follow the moved slide's selection
    if (selectedSlide === fromIndex) setSelectedSlide(toIndex)
    else if (selectedSlide === toIndex) setSelectedSlide(fromIndex)
  }

  const moveImageToSlide = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (!slides[fromIndex]?.image) { showToast('No image to move', 'error'); return }
    setSlides(prev => {
      const updated = [...prev]
      const img = updated[fromIndex].image
      updated[fromIndex] = { ...updated[fromIndex], image: undefined }
      updated[toIndex] = { ...updated[toIndex], image: img }
      return updated
    })
    showToast(`Image moved to slide ${toIndex + 1}`)
  }

  const swapImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    setSlides(prev => {
      const updated = [...prev]
      const imgA = updated[fromIndex].image
      const imgB = updated[toIndex].image
      updated[fromIndex] = { ...updated[fromIndex], image: imgB }
      updated[toIndex] = { ...updated[toIndex], image: imgA }
      return updated
    })
    showToast(`Swapped images between slides ${fromIndex + 1} and ${toIndex + 1}`)
  }

  const sel = selectedSlide !== null ? slides[selectedSlide] : null
  const colors = sel ? (ACCENT_COLORS[sel.accent] || ACCENT_COLORS.red) : ACCENT_COLORS.red

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-stone-900">Carousel builder</span>
            {draftSaved && (
              <span className="hidden md:inline text-[11px] text-stone-400">Draft saved</span>
            )}
          </div>
          <div className="flex gap-2">
            {(topic || slides.length > 0) && (
              <button
                onClick={clearDraft}
                className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 text-stone-500 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Clear draft
              </button>
            )}
            {slides.length > 0 && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Add images
                </button>
                <button
                  onClick={exportSlides}
                  disabled={exportingSlides}
                  className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {exportingSlides ? 'Zipping…' : 'Export Slides'}
                </button>
                <button
                  onClick={generateVideo}
                  disabled={generatingVideo}
                  className="px-3 py-2 min-h-[44px] text-[13px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {generatingVideo ? 'Exporting...' : 'Export MP4'}
                </button>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download={`${channel.replace(/\s+/g, '_')}_carousel.mp4`}
                    className="px-3 py-2 min-h-[44px] text-[13px] font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    ↓ MP4
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-stone-100 bg-white shrink-0">
          {(['controls', 'slides', 'detail'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobilePanel(tab)}
              className={`flex-1 py-3 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
                mobilePanel === tab
                  ? 'text-stone-900 border-stone-900'
                  : 'text-stone-400 border-transparent'
              } ${tab === 'detail' && selectedSlide === null ? 'opacity-40' : ''}`}
              disabled={tab === 'detail' && selectedSlide === null}
            >
              {tab === 'controls' ? 'Setup' : tab === 'slides' ? `Slides${slides.length ? ` (${slides.length})` : ''}` : 'Edit'}
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left panel — controls */}
          <div className={`w-full md:w-72 border-r border-stone-100 overflow-y-auto p-4 md:p-5 flex flex-col gap-4 shrink-0 ${mobilePanel === 'controls' ? 'flex' : 'hidden md:flex'}`}>

            {/* Food Guide Builder — Omnira Food only */}
            {channel === 'Omnira Food' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-amber-700 uppercase tracking-widest">🍽️ Food Guide Builder</p>

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setFoodMode('no-frills')}
                    className={`py-2 rounded-lg text-[11px] font-medium border transition-all ${foodMode === 'no-frills' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >🔥 No Frills</button>
                  <button
                    onClick={() => setFoodMode('top5')}
                    className={`py-2 rounded-lg text-[11px] font-medium border transition-all ${foodMode === 'top5' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >🍽️ Top 5</button>
                </div>

                {/* Restaurant inputs */}
                <div className="flex flex-col gap-2">
                  {(foodMode === 'no-frills' ? foodRestaurants.slice(0, 1) : foodRestaurants).map((r, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      {foodMode === 'top5' && (
                        <p className="text-[9px] font-medium text-amber-600 uppercase tracking-wider">Restaurant {i + 1}</p>
                      )}
                      <input
                        type="text"
                        value={r.name}
                        onChange={e => setFoodRestaurants(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="Restaurant name"
                        className="w-full text-[13px] border border-amber-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-amber-400 placeholder:text-stone-400"
                      />
                      <input
                        type="text"
                        value={r.city}
                        onChange={e => setFoodRestaurants(prev => prev.map((x, j) => j === i ? { ...x, city: e.target.value } : x))}
                        placeholder="City"
                        className="w-full text-[13px] border border-amber-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-amber-400 placeholder:text-stone-400"
                      />
                    </div>
                  ))}
                </div>

                {foodBuildStatus && (
                  <p className="text-[11px] text-amber-700 animate-pulse">{foodBuildStatus}</p>
                )}

                <button
                  onClick={buildFoodCarousel}
                  disabled={buildingFood}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white text-[13px] font-medium rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {buildingFood ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Building…
                    </>
                  ) : 'Research & Build Carousel →'}
                </button>
              </div>
            )}

            {/* Load today's news */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2.5">
              <p className="text-[10px] font-medium text-amber-700 uppercase tracking-widest">Today&apos;s news</p>
              <select
                value={newsChannel}
                onChange={(e) => setNewsChannel(e.target.value)}
                className="w-full text-[16px] md:text-[13px] border border-amber-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-amber-400 text-stone-900"
              >
                {NEWS_CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={loadTodaysNews}
                disabled={loadingNews}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-amber-600 text-white text-[14px] md:text-[13px] font-medium rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingNews ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Finding today&apos;s story...
                  </>
                ) : (
                  'Load today\u2019s news'
                )}
              </button>
            </div>

            {/* Topic */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Topic</p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g. The Ferrari vs Lamborghini rivalry story"
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg p-3 md:p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Channel */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Slide count */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">
                Slides — {slideCount}
              </p>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setSlideCount(n)}
                    className={`py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${slideCount === n ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >{n}</button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generateSlides}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-stone-900 text-white text-[14px] md:text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Generating slides...
                </>
              ) : (
                <><span className="text-[11px]">✦</span> Generate carousel</>
              )}
            </button>

            {/* Send for approval */}
            {slides.length > 0 && (
              <button
                onClick={sendForApproval}
                disabled={sendingApproval}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-amber-600 text-white text-[14px] md:text-[13px] font-medium rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingApproval ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Send for approval
                  </>
                )}
              </button>
            )}

            {/* Video export */}
            {slides.length > 0 && (
              <div className="bg-white border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Export video</p>
                
                <div>
                  <p className="text-[11px] text-stone-400 mb-1">Seconds per slide — {slideDuration}s</p>
                  <input
                    type="range" min={2} max={6} step={1} value={slideDuration}
                    onChange={(e) => setSlideDuration(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                    <span>2s</span><span>Total: {slides.length * slideDuration}s</span><span>6s</span>
                  </div>
                </div>

                <button
                  onClick={generateVideo}
                  disabled={generatingVideo}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingVideo ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Generating video...
                    </>
                  ) : (
                    <><span className="text-[11px]">▶</span> Export as MP4</>
                  )}
                </button>

                {videoUrl && (
                  <>
                    <a
                      href={videoUrl}
                      download={`${channel.replace(/\s+/g, '_')}_carousel.mp4`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-[13px] font-medium rounded-xl hover:bg-green-700 transition-colors"
                    >
                      ↓ Download MP4
                    </a>

                    {/* Publish button */}
                    <button
                      onClick={() => setShowPublish(!showPublish)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-medium rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <span className="text-[11px]">↗</span> Publish
                    </button>

                    {showPublish && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col gap-2.5">
                        <p className="text-[10px] font-medium text-blue-700 uppercase tracking-widest">Platforms</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PUBLISH_PLATFORMS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => togglePlatform(p.id)}
                              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                                publishPlatforms.includes(p.id)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={publishNow}
                          disabled={publishing || publishPlatforms.length === 0}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {publishing ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                              Publishing...
                            </>
                          ) : (
                            `Publish now${publishPlatforms.length ? ` to ${publishPlatforms.length}` : ''}`
                          )}
                        </button>
                      </div>
                    )}

                    {/* YouTube direct publish */}
                    <button
                      onClick={() => {
                        setShowYouTube(!showYouTube)
                        if (!ytTitle) setYtTitle(slides[0]?.headline || '')
                        if (!ytDescription) setYtDescription(slides.map(s => `${s.headline} — ${s.body}`).join('\n\n'))
                        if (!ytTags) setYtTags(generateYtTags())
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-[13px] font-medium rounded-xl hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      YouTube Direct
                    </button>

                    {showYouTube && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2.5">
                        <p className="text-[10px] font-medium text-red-700 uppercase tracking-widest">YouTube upload</p>
                        <div>
                          <p className="text-[10px] text-stone-400 mb-1">Title</p>
                          <input
                            value={ytTitle}
                            onChange={(e) => setYtTitle(e.target.value)}
                            className="w-full text-[16px] md:text-[12px] border border-red-200 rounded-lg px-2.5 py-2 min-h-[44px] bg-white focus:outline-none focus:border-red-400 text-stone-900"
                            placeholder="Video title"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-400 mb-1">Description</p>
                          <textarea
                            value={ytDescription}
                            onChange={(e) => setYtDescription(e.target.value)}
                            rows={3}
                            className="w-full text-[16px] md:text-[12px] border border-red-200 rounded-lg px-2.5 py-2 resize-none bg-white focus:outline-none focus:border-red-400 text-stone-900"
                            placeholder="Video description"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-400 mb-1">Tags</p>
                          <input
                            value={ytTags}
                            onChange={(e) => setYtTags(e.target.value)}
                            className="w-full text-[16px] md:text-[12px] border border-red-200 rounded-lg px-2.5 py-2 min-h-[44px] bg-white focus:outline-none focus:border-red-400 text-stone-900"
                            placeholder="tag1, tag2, tag3"
                          />
                        </div>
                        <p className="text-[10px] text-stone-400">Channel: {channel}</p>
                        <button
                          onClick={publishToYouTube}
                          disabled={ytPublishing}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-[13px] font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {ytPublishing ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                              Uploading to YouTube...
                            </>
                          ) : (
                            'Upload to YouTube'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Upload images */}
            {slides.length > 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-4 min-h-[56px] bg-white border border-stone-100 rounded-xl hover:bg-stone-50 transition-colors text-left"
              >
                <div className="w-10 h-10 md:w-8 md:h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-stone-800">Upload images</p>
                  <p className="text-[11px] text-stone-400">Add your own photos to slides</p>
                </div>
              </button>
            )}

          </div>

          {/* Centre — slide strip */}
          <div className={`flex-1 overflow-y-auto p-4 md:p-5 ${mobilePanel === 'slides' ? 'block' : 'hidden md:block'}`}>
            {slides.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-medium text-stone-600">No slides yet</p>
                  <p className="text-[13px] text-stone-400 mt-1">Enter a topic and click Generate carousel</p>
                  <button
                    onClick={() => setMobilePanel('controls')}
                    className="mt-4 px-5 py-3 min-h-[44px] bg-stone-900 text-white text-[14px] font-medium rounded-xl md:hidden"
                  >
                    Get started
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] text-stone-400">{slides.length} slides · {typeof window !== 'undefined' && window.innerWidth < 768 ? 'swipe to browse' : 'click to preview'}</p>
                {/* Horizontal swipeable on mobile, wrapped grid on desktop */}
                <div
                  ref={slideStripRef}
                  className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory md:flex-wrap md:overflow-x-visible md:pb-0 md:snap-none scrollbar-hide"
                >
                  {slides.map((slide, i) => (
                    <div key={i} className="snap-start shrink-0 md:shrink flex flex-col items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedSlide(i)
                          if (window.innerWidth < 768) setMobilePanel('detail')
                        }}
                        className={`transition-all ${selectedSlide === i ? 'ring-2 ring-stone-900 ring-offset-2 rounded-xl' : 'opacity-80 hover:opacity-100'}`}
                      >
                        <SlidePreview slide={slide} index={i} />
                      </button>
                      {/* Reorder buttons */}
                      {slides.length > 1 && (
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); reorderSlide(i, 'up') }}
                            disabled={i === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-20 transition-colors text-stone-500"
                            title="Move left"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className="text-[10px] text-stone-400 min-w-[20px] text-center">{i + 1}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); reorderSlide(i, 'down') }}
                            disabled={i === slides.length - 1}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-20 transition-colors text-stone-500"
                            title="Move right"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Right — detail panel */}
          {sel && (
            <div className={`w-full md:w-72 border-l-0 md:border-l border-stone-100 overflow-y-auto p-4 md:p-5 flex flex-col gap-3 shrink-0 ${mobilePanel === 'detail' ? 'flex' : 'hidden md:flex'}`}>
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Slide {sel.num}</p>

              {/* Large preview */}
              <div
                className="relative rounded-xl overflow-hidden w-full"
                style={{
                  aspectRatio: '4/5',
                  background: sel.image ? `url(${sel.image}) center/cover` : colors.bg,
                }}
              >
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)' }} />
                <div className="absolute top-0 left-0 right-0 p-4">
                  <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: colors.text }}>{sel.tag}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-medium text-[13px] leading-snug mb-2">{sel.headline}</p>
                  <p className="text-white/65 text-[11px] leading-relaxed mb-3">{sel.body}</p>
                  <span className="text-[9px] font-medium tracking-wider uppercase px-2.5 py-1 rounded" style={{ background: colors.badge, color: colors.text }}>
                    {sel.badge}
                  </span>
                </div>
              </div>

              {/* Editable fields */}
              <div className="flex flex-col gap-2">
                {(['tag', 'headline', 'body', 'badge'] as const).map((field) => (
                  <div key={field}>
                    <p className="text-[10px] text-stone-400 mb-1 capitalize">{field}</p>
                    {field === 'body' ? (
                      <textarea
                        value={sel[field]}
                        rows={3}
                        onChange={(e) => {
                          const updated = [...slides]
                          updated[selectedSlide!] = { ...updated[selectedSlide!], [field]: e.target.value }
                          setSlides(updated)
                        }}
                        className="w-full text-[16px] md:text-[12px] border border-stone-200 rounded-lg px-3 py-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                      />
                    ) : (
                      <input
                        value={sel[field]}
                        onChange={(e) => {
                          const updated = [...slides]
                          updated[selectedSlide!] = { ...updated[selectedSlide!], [field]: e.target.value }
                          setSlides(updated)
                        }}
                        className="w-full text-[16px] md:text-[12px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                      />
                    )}
                  </div>
                ))}

                {/* Accent colour */}
                <div>
                  <p className="text-[10px] text-stone-400 mb-1">Accent colour</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(ACCENT_COLORS).map(([name, c]) => (
                      <button
                        key={name}
                        onClick={() => {
                          const updated = [...slides]
                          updated[selectedSlide!] = { ...updated[selectedSlide!], accent: name }
                          setSlides(updated)
                        }}
                        className={`w-8 h-8 md:w-6 md:h-6 rounded-full border-2 transition-all ${sel.accent === name ? 'border-stone-900 scale-110' : 'border-transparent'}`}
                        style={{ background: c.text }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>

                {/* Upload image for this slide */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 min-h-[44px] text-[14px] md:text-[12px] bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                >
                  {sel.image ? 'Replace image' : '+ Upload image'}
                </button>

                {/* Move image to another slide */}
                {sel.image && sel.image !== 'loading' && slides.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] text-stone-400">Move image to</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => swapImages(selectedSlide!, Math.max(0, selectedSlide! - 1))}
                        disabled={selectedSlide === 0}
                        className="flex-1 px-2 py-2 min-h-[40px] text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30 transition-colors"
                        title="Swap image with previous slide"
                      >
                        ← Swap
                      </button>
                      <select
                        value=""
                        onChange={(e) => {
                          const target = Number(e.target.value)
                          if (!isNaN(target)) {
                            moveImageToSlide(selectedSlide!, target)
                            e.target.value = ''
                          }
                        }}
                        className="flex-1 px-2 py-2 min-h-[40px] text-[16px] md:text-[12px] border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-stone-400 text-stone-600"
                      >
                        <option value="" disabled>Slide...</option>
                        {slides.map((_, i) => i !== selectedSlide && (
                          <option key={i} value={i}>Slide {i + 1}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => swapImages(selectedSlide!, Math.min(slides.length - 1, selectedSlide! + 1))}
                        disabled={selectedSlide === slides.length - 1}
                        className="flex-1 px-2 py-2 min-h-[40px] text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30 transition-colors"
                        title="Swap image with next slide"
                      >
                        Swap →
                      </button>
                    </div>
                  </div>
                )}

                {/* Nav between slides */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setSelectedSlide(Math.max(0, selectedSlide! - 1))}
                    disabled={selectedSlide === 0}
                    className="flex-1 px-3 py-2.5 min-h-[44px] text-[13px] md:text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30"
                  >← Prev</button>
                  <button
                    onClick={() => setSelectedSlide(Math.min(slides.length - 1, selectedSlide! + 1))}
                    disabled={selectedSlide === slides.length - 1}
                    className="flex-1 px-3 py-2.5 min-h-[44px] text-[13px] md:text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30"
                  >Next →</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
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
