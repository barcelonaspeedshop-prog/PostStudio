'use client'
import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Slide = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string // base64 data URL
}

const CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira F1',
  'Omnira Football',
  'Omnira Cricket',
  'Omnira Golf',
  'Omnira NFL',
  'Omnira Food',
  'Omnira Travel',
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
      className="relative rounded-xl overflow-hidden flex-shrink-0"
      style={{
        width: 200,
        height: 250,
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
  const [slideCount, setSlideCount] = useState(10)
  const [slides, setSlides] = useState<Slide[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [imageStyle, setImageStyle] = useState('vintage cinematic')
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [slideDuration, setSlideDuration] = useState(3)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const generateSlides = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/carousel-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel, slideCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSlides(data.slides)
      setSelectedSlide(0)
      showToast(`${data.slides.length} slides generated!`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating slides', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const generateImages = async () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    setGeneratingImages(true)
    showToast('Generating images — this takes about 30 seconds...')
    try {
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, style: imageStyle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Apply returned image URLs to slides
      const updated = [...slides]
      data.images.forEach((img: { index: number; url: string | null }) => {
        if (img.url && updated[img.index]) {
          updated[img.index] = { ...updated[img.index], image: img.url }
        }
      })
      setSlides(updated)
      showToast('Images generated!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating images', 'error')
    } finally {
      setGeneratingImages(false)
    }
  }

  const generateVideo = async () => {
    if (!slides.length) { showToast('Generate slides first', 'error'); return }
    setGeneratingVideo(true)
    setVideoUrl(null)
    showToast('Generating video — this takes about 60 seconds...')
    try {
      let audioDataUrl: string | null = null
      if (audioFile) {
        const reader = new FileReader()
        audioDataUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(audioFile)
        })
      }

      const res = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, slideDuration, audioUrl: audioDataUrl }),
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

  const sel = selectedSlide !== null ? slides[selectedSlide] : null
  const colors = sel ? (ACCENT_COLORS[sel.accent] || ACCENT_COLORS.red) : ACCENT_COLORS.red

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Carousel builder</span>
          <div className="flex gap-2">
            {slides.length > 0 && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-[12px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Add images
                </button>
                <button
                  onClick={downloadSlides}
                  className="px-3 py-1.5 text-[12px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Export
                </button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) { setAudioFile(file); showToast(`Audio: ${file.name}`) }
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — controls */}
          <div className="w-72 border-r border-stone-100 overflow-y-auto p-5 flex flex-col gap-4 shrink-0">

            {/* Topic */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Topic</p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g. The Ferrari vs Lamborghini rivalry story"
                className="w-full text-[13px] border border-stone-200 rounded-lg p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Channel */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900"
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
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>5</span><span>15</span>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generateSlides}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Image generation */}
            {slides.length > 0 && (
              <div className="bg-white border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">AI image style</p>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                >
                  <option value="vintage cinematic">Vintage cinematic</option>
                  <option value="modern editorial photography">Modern editorial</option>
                  <option value="dramatic motorsport photography">Motorsport</option>
                  <option value="luxury lifestyle photography">Luxury lifestyle</option>
                  <option value="black and white film photography">Black and white film</option>
                  <option value="golden hour outdoor photography">Golden hour</option>
                </select>
                <button
                  onClick={generateImages}
                  disabled={generatingImages}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-900 text-[13px] font-medium rounded-xl hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200"
                >
                  {generatingImages ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Generating images...
                    </>
                  ) : (
                    <><span className="text-[11px]">✦</span> Generate images with AI</>
                  )}
                </button>
                <p className="text-[10px] text-stone-400">~$0.40 per carousel · 30 seconds</p>
              </div>
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
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-600 text-left"
                >
                  {audioFile ? `✓ ${audioFile.name}` : '+ Add music track (optional)'}
                </button>

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
                  <a
                    href={videoUrl}
                    download={`${channel.replace(/\s+/g, '_')}_carousel.mp4`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-[13px] font-medium rounded-xl hover:bg-green-700 transition-colors"
                  >
                    ↓ Download MP4
                  </a>
                )}
              </div>
            )}

            {/* Image upload tip */}
            {slides.length > 0 && (
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-1">Images</p>
                <p className="text-[12px] text-stone-500">Select a slide then click <strong>Add images</strong> to assign a background photo. Upload multiple to fill slides in order.</p>
              </div>
            )}
          </div>

          {/* Centre — slide strip */}
          <div className="flex-1 overflow-y-auto p-5">
            {slides.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-stone-600">No slides yet</p>
                  <p className="text-[12px] text-stone-400 mt-1">Enter a topic and click Generate carousel</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-stone-400">{slides.length} slides · click a slide to preview</p>
                <div className="flex flex-wrap gap-3">
                  {slides.map((slide, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlide(i)}
                      className={`transition-all ${selectedSlide === i ? 'ring-2 ring-stone-900 ring-offset-2 rounded-xl' : 'opacity-80 hover:opacity-100'}`}
                    >
                      <SlidePreview slide={slide} index={i} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — detail panel */}
          {sel && (
            <div className="w-72 border-l border-stone-100 overflow-y-auto p-5 flex flex-col gap-3 shrink-0">
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
                        className="w-full text-[12px] border border-stone-200 rounded-lg px-2.5 py-2 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                      />
                    ) : (
                      <input
                        value={sel[field]}
                        onChange={(e) => {
                          const updated = [...slides]
                          updated[selectedSlide!] = { ...updated[selectedSlide!], [field]: e.target.value }
                          setSlides(updated)
                        }}
                        className="w-full text-[12px] border border-stone-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900"
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
                        className={`w-6 h-6 rounded-full border-2 transition-all ${sel.accent === name ? 'border-stone-900 scale-110' : 'border-transparent'}`}
                        style={{ background: c.text }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>

                {/* Add image to this slide */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-600"
                >
                  {sel.image ? 'Change image' : '+ Add background image'}
                </button>

                {/* Nav between slides */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setSelectedSlide(Math.max(0, selectedSlide! - 1))}
                    disabled={selectedSlide === 0}
                    className="flex-1 px-3 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30"
                  >← Prev</button>
                  <button
                    onClick={() => setSelectedSlide(Math.min(slides.length - 1, selectedSlide! + 1))}
                    disabled={selectedSlide === slides.length - 1}
                    className="flex-1 px-3 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30"
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
