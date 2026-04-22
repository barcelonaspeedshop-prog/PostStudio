'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import PostPreview from '@/components/PostPreview'
import { generatePostContent, regenerateField, PostContent } from '@/lib/claude'
import { PLATFORMS, TONES, FORMATS } from '@/lib/platforms'
import { CHANNELS as CHANNEL_CONFIGS } from '@/lib/channels'
import type { RestaurantData } from '@/app/api/restaurant-research/route'

const CHANNEL_NAMES = Object.keys(CHANNEL_CONFIGS)

// ── Post Types ──────────────────────────────────────────────────────────────
type PostTypeValue = 'standard' | 'no-frills' | 'top5' | 'restaurant-feature' | 'car-feature' | 'stats' | 'quiz'

const POST_TYPES: { value: PostTypeValue; label: string; placeholder: string }[] = [
  {
    value: 'standard',
    label: '📰 Standard Post',
    placeholder: 'Describe your post — e.g. A product launch for our new wireless headphones. Target: music lovers 18–35.',
  },
  {
    value: 'no-frills',
    label: '🔥 No Frills But Kills',
    placeholder: 'Restaurant name, city, and why it kills — e.g. Chinchinken in Taito City Tokyo. Legendary Abura Soba, no tourists, pure flavour.',
  },
  {
    value: 'top5',
    label: '🍽️ Top 5 Eats',
    placeholder: 'City and what the guide covers — e.g. Top 5 dishes you must eat in Tokyo. From ramen to wagyu.',
  },
  {
    value: 'restaurant-feature',
    label: '⭐ Restaurant Feature',
    placeholder: 'Restaurant name, location, and what makes it special — e.g. Dishoom Kensington. Bombay café culture at its finest.',
  },
  {
    value: 'car-feature',
    label: '🏎️ Car Feature',
    placeholder: 'Car make, model, and what makes it extraordinary — e.g. 1967 Ferrari 275 GTB/4. The most beautiful car ever made.',
  },
  {
    value: 'stats',
    label: '📊 Stats Comparison',
    placeholder: 'Topic and the key stats to compare — e.g. Verstappen vs Hamilton: championship wins, race victories, pole positions.',
  },
  {
    value: 'quiz',
    label: '❓ Quiz',
    placeholder: 'Quiz topic — e.g. How well do you know Formula 1? 5 questions about the greatest drivers of all time.',
  },
]

const FOOD_POST_TYPES: PostTypeValue[] = ['no-frills', 'top5', 'restaurant-feature']
const RESTAURANT_RESEARCH_TYPES: PostTypeValue[] = ['no-frills', 'restaurant-feature']

// ── Video creation helpers ──────────────────────────────────────────────────
async function startVideoJob(
  images: File[],
  channel: string,
  musicOn: boolean,
  mood: string,
  musicTrack: File | null,
  slideTitle: string,
): Promise<string> {
  const formData = new FormData()
  formData.append('chapters', JSON.stringify([{ id: 1, title: slideTitle || 'Slides' }]))
  formData.append('channel', channel)
  formData.append('musicEnabled', musicOn ? 'true' : 'false')
  if (musicOn) formData.append('musicMood', mood)
  if (musicOn && musicTrack) formData.append('music', musicTrack)
  images.forEach(img => {
    formData.append('media', img)
    formData.append('mediaChapterIds', '1')
  })
  const res = await fetch('/api/story-video/start', { method: 'POST', body: formData })
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Video start failed') }
  return (await res.json()).jobId
}

async function pollVideoJob(jobId: string, onProgress: (p: number) => void): Promise<void> {
  // 150 × 3 s = 7.5 minutes — enough for large multi-image ffmpeg jobs
  for (let i = 0; i < 150; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(`/api/story-video/status/${jobId}`)
    if (!res.ok) throw new Error(`Status check failed (HTTP ${res.status})`)
    const d = await res.json()
    onProgress(d.progress ?? 0)
    if (d.status === 'complete') return
    if (d.status === 'error') throw new Error(d.error || 'Video creation failed')
  }
  throw new Error('Video creation timed out after 7.5 minutes')
}

async function downloadJobVideo(jobId: string, format: 'youtube' | 'reels'): Promise<string> {
  const res = await fetch(`/api/story-video/download/${jobId}?format=${format}`)
  if (!res.ok) throw new Error(`Download failed for format: ${format}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = e => resolve(e.target?.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// ── Toast + Publish Results ───────────────────────────────────────────────────
type Toast = { msg: string; type?: 'success' | 'error' }
type PlatformResult = { platform: string; success: boolean; id?: string; error?: string; skipped?: boolean; reason?: string }

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const [publishResults, setPublishResults] = useState<PlatformResult[] | null>(null)
  const show = (msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const showResults = (results: PlatformResult[]) => {
    setPublishResults(results)
    setTimeout(() => setPublishResults(null), 6000)
  }
  return { toast, show, publishResults, showResults }
}

// ── Post-type-aware content generator ───────────────────────────────────────
async function generateForPostType(opts: {
  postType: PostTypeValue
  aiPrompt: string
  platforms: string[]
  tone: string
  restaurantData: RestaurantData | null
  channel: string
}): Promise<PostContent> {
  const { postType, aiPrompt, platforms, tone, restaurantData, channel } = opts
  const pStr = platforms.join(', ') || 'Instagram'
  const isFood = FOOD_POST_TYPES.includes(postType)
  const foodLink = isFood ? 'premirafirst.com/food' : ''

  if (postType === 'standard') {
    return generatePostContent(aiPrompt, platforms, tone)
  }

  // Build a rich context string from researched restaurant data if available
  const rdContext = restaurantData
    ? `
Restaurant data (verified):
Name: ${restaurantData.name}
Address: ${restaurantData.address}, ${restaurantData.city}, ${restaurantData.country}
Cuisine: ${restaurantData.cuisine}
Opening hours: ${restaurantData.hours}
Price range: ${restaurantData.priceRange}
Must order: ${restaurantData.mustOrder.map(d => `${d.dish} — ${d.description}`).join('; ')}
Maps: ${restaurantData.mapsLink}
Story: ${restaurantData.story}
Awards: ${restaurantData.awards || 'None listed'}
Booking: ${restaurantData.bookingUrl || 'Walk-in / call direct'}
`
    : ''

  const templates: Record<PostTypeValue, { system: string; prompt: string }> = {
    standard: { system: '', prompt: '' }, // handled above

    'no-frills': {
      system: `You are a food content expert for Omnira Food (${channel}). Write in a dark, premium, editorial tone — bold opinions, vivid descriptions. Always respond with valid JSON only.`,
      prompt: `Create a "No Frills But Kills" restaurant post for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}
${rdContext}

Format the description as slide-by-slide structure:
🔥 HOOK: [One-line attention grabber — make it visceral and compelling]

📖 THE STORY: [2-3 sentences — why this place kills. The atmosphere, the obsession, what makes locals love it]

🍜 MUST ORDER:
• [Dish 1] — [One sentence. What it is and why it matters]
• [Dish 2] — [One sentence. What it is and why it matters]

ℹ️ THE INFO:
📍 [Full address]
🕐 [Opening hours]
💰 [Price range]
🗺️ [Google Maps link]

❓ POLL: [Debate-sparking question about this restaurant or food type]

Return this exact JSON:
{
  "title": "RESTAURANT NAME — City",
  "description": "[full slide structure above]",
  "caption": "One punchy hook sentence (max 120 chars) — make it hit hard",
  "tags": ["NoFrillsButKills","OmniraFood","HiddenGem","FoodieTravel","[city]Food","[cuisine]","StreetFood","FoodDiscovery"],
  "cta": "Full story at ${foodLink} 🍽️"
}`,
    },

    'top5': {
      system: `You are a food guide writer for Omnira Food (${channel}). Authoritative, specific, editorial. Always respond with valid JSON only.`,
      prompt: `Create a "Top 5 Eats" destination food guide for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}
${rdContext}

Format the description as:
🍽️ TOP 5: [City] — [Hook line why this city's food scene matters]

1. [Dish / Place] 📍 [Where exactly] — [1-2 sentences: what it is and why it's unmissable]
2. [Dish / Place] 📍 [Where exactly] — [1-2 sentences]
3. [Dish / Place] 📍 [Where exactly] — [1-2 sentences]
4. [Dish / Place] 📍 [Where exactly] — [1-2 sentences]
5. [Dish / Place] 📍 [Where exactly] — [1-2 sentences]

❓ POLL: Which would you try first?

Return this exact JSON:
{
  "title": "Top 5 Eats: [City]",
  "description": "[full guide above]",
  "caption": "5 dishes you can't leave [city] without trying. (max 120 chars)",
  "tags": ["Top5Eats","OmniraFood","[city]Food","FoodTravel","FoodGuide","MustEat","Foodie","FoodDiscovery"],
  "cta": "Full guide at ${foodLink} 🍽️"
}`,
    },

    'restaurant-feature': {
      system: `You are a restaurant critic and food writer for Omnira Food (${channel}). Write with editorial authority and warmth. Always respond with valid JSON only.`,
      prompt: `Create a full restaurant feature post for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}
${rdContext}

Format the description as:
⭐ [RESTAURANT NAME]
[City] · [Cuisine] · [Price range]

[2-3 sentence opening — the atmosphere, the feeling of being there, what makes it different]

🍽️ MUST ORDER:
• [Dish 1] — [Description]
• [Dish 2] — [Description]
• [Dish 3] — [Description]

🕐 HOURS: [Schedule]
📍 [Address]
💰 [Price range]
[Awards/recognition if any]

BOOK: [booking URL or method]
📲 Full profile: ${foodLink}

Return this exact JSON:
{
  "title": "[Restaurant Name] — [City]",
  "description": "[full feature above]",
  "caption": "One sentence that captures why this restaurant matters (max 130 chars)",
  "tags": ["OmniraFood","RestaurantFeature","[city]Food","[cuisine]","FoodCritic","Foodie","DiningGuide","MustVisit"],
  "cta": "Full profile at ${foodLink}/restaurant/${restaurantData?.slug || '[slug]'} 🍽️"
}`,
    },

    'car-feature': {
      system: `You are an automotive writer for ${channel}. Write with passion, technical authority and editorial style. Always respond with valid JSON only.`,
      prompt: `Create a car feature post for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}

Format the description as:
🏎️ [CAR NAME / MODEL]

[Hook: one line that captures the essence of this car — visceral, specific]

[2-3 sentences: the history, the significance, what makes this machine special]

⚡ KEY SPECS:
• [Spec 1]
• [Spec 2]
• [Spec 3]

🏆 WHY IT MATTERS: [One sentence verdict]

Return this exact JSON:
{
  "title": "[Make Model Year]",
  "description": "[full feature above]",
  "caption": "One electric sentence about this car (max 120 chars)",
  "tags": ["${channel.replace(/\s+/g,'').replace(/&/g,'')}","CarFeature","Automotive","ClassicCar","Supercar","CarEnthusiast","GentlemenOfFuel","MotorSport"],
  "cta": "What do you think? Drop your take below 👇"
}`,
    },

    'stats': {
      system: `You are a sports/data journalist for ${channel}. Write fact-first, analytical but accessible. Always respond with valid JSON only.`,
      prompt: `Create a stats comparison post for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}

Format the description as:
📊 [COMPARISON TITLE]

[Hook: the debate this stat settles or opens up]

[SUBJECT A] vs [SUBJECT B]:

[Stat 1]: [Value A] vs [Value B] → [Brief context]
[Stat 2]: [Value A] vs [Value B] → [Brief context]
[Stat 3]: [Value A] vs [Value B] → [Brief context]
[Stat 4]: [Value A] vs [Value B] → [Brief context]

📌 VERDICT: [One sentence that frames the debate without closing it]

❓ POLL: [The debate question]

Return this exact JSON:
{
  "title": "[Subject A] vs [Subject B]: The Stats",
  "description": "[full comparison above]",
  "caption": "The numbers settle the debate — or do they? (max 120 chars)",
  "tags": ["Stats","Comparison","${channel.replace(/\s+/g,'').replace(/&/g,'')}","DataViz","SportsFacts","Debate","Analysis","Numbers"],
  "cta": "Your verdict below 👇 #debate"
}`,
    },

    'quiz': {
      system: `You are a quiz writer for ${channel}. Write engaging, genuinely challenging questions. Always respond with valid JSON only.`,
      prompt: `Create a quiz post for platforms: ${pStr}.
Tone: ${tone}.
Brief: ${aiPrompt}

Format the description as:
❓ QUIZ: [Title]

Q1. [Question]
A) [Option]  B) [Option]  C) [Option]  D) [Option]
✅ Answer: [X] — [Brief explanation why]

Q2. [Question]
A) [Option]  B) [Option]  C) [Option]  D) [Option]
✅ Answer: [X] — [Brief explanation]

Q3. [Question]
A) [Option]  B) [Option]  C) [Option]  D) [Option]
✅ Answer: [X] — [Brief explanation]

🏆 SCORING: 3/3 = Legend | 2/3 = Know your stuff | 1/3 = Study up

Return this exact JSON:
{
  "title": "Quiz: [Topic]",
  "description": "[full quiz above]",
  "caption": "Think you know [topic]? Test yourself 👇 (max 110 chars)",
  "tags": ["Quiz","${channel.replace(/\s+/g,'').replace(/&/g,'')}","Trivia","Test","Challenge","FanQuiz","Knowledge","HowWellDoYouKnow"],
  "cta": "Drop your score below! 👇"
}`,
    },
  }

  const cfg = templates[postType]
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cfg.prompt, system: cfg.system, max_tokens: 1500 }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
  return JSON.parse(data.text.replace(/```json|```/g, '').trim()) as PostContent
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComposerPage() {
  const { toast, show, publishResults, showResults } = useToast()

  // Channel
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_NAMES[0])
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [statusLoading, setStatusLoading] = useState(false)

  // Post type
  const [postType, setPostType] = useState<PostTypeValue>('standard')

  // Restaurant research
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null)
  const [researching, setResearching] = useState(false)

  // AI prompt
  const [aiPrompt, setAiPrompt] = useState('')
  const [tone, setTone] = useState('casual')
  const [generating, setGenerating] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Post fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [caption, setCaption] = useState('')
  const [cta, setCta] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Platform / format
  const [selPlatforms, setSelPlatforms] = useState<string[]>([])
  const [selFormat, setSelFormat] = useState('30s reel')
  const [timing, setTiming] = useState('now')
  const [scheduleDt, setScheduleDt] = useState('')

  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaSrc, setMediaSrc] = useState<string | null>(null)

  // Music
  const [musicEnabled, setMusicEnabled] = useState(false)
  const [musicMood, setMusicMood] = useState<'calm' | 'energy'>('energy')
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)

  // Thumbnail
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null)
  const [generatingThumb, setGeneratingThumb] = useState(false)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Video reel toggle
  const [postAsVideo, setPostAsVideo] = useState(false)
  const [videoCreationStatus, setVideoCreationStatus] = useState('')

  // Load connected platforms on channel change
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setStatusLoading(true)
      try {
        const [ytRes, metaRes] = await Promise.all([
          fetch('/api/auth/youtube?action=status'),
          fetch('/api/auth/meta?action=status'),
        ])
        const ytStatus = ytRes.ok ? await ytRes.json() : {}
        const metaStatus = metaRes.ok ? await metaRes.json() : {}
        if (cancelled) return
        const connected: string[] = []
        if (ytStatus[selectedChannel]?.connected) connected.push('youtube')
        if (metaStatus[selectedChannel]?.instagram) connected.push('instagram')
        if (metaStatus[selectedChannel]?.facebook) connected.push('facebook')
        setConnectedPlatforms(connected)
        setSelPlatforms(prev => prev.filter(p => connected.includes(p)))
      } catch {
        setConnectedPlatforms([])
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedChannel])

  // Auto-select food-relevant channel when switching to a food post type
  useEffect(() => {
    if (FOOD_POST_TYPES.includes(postType) && !selectedChannel.toLowerCase().includes('food')) {
      const foodChannel = CHANNEL_NAMES.find(c => c.toLowerCase().includes('food'))
      if (foodChannel) setSelectedChannel(foodChannel)
    }
  }, [postType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Readiness
  const readiness = Math.min(
    100,
    (mediaFiles.length > 0 ? 20 : 0) +
    (title.length > 2 ? 20 : 0) +
    (caption.length > 5 ? 20 : 0) +
    (selPlatforms.length > 0 ? 20 : 0) +
    (tags.length > 0 ? 10 : 0) +
    (description.length > 5 ? 10 : 0)
  )

  const togglePlatform = (id: string) => {
    setSelPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setMediaFiles((prev) => [...prev, ...arr])
    const media = arr.find((f) => f.type.startsWith('image') || f.type.startsWith('video'))
    if (media) {
      const reader = new FileReader()
      reader.onload = (e) => setMediaSrc(e.target?.result as string)
      reader.readAsDataURL(media)
    }
  }

  const handleMusicFile = (files: FileList | null) => {
    if (!files || !files[0]) return
    setMusicFile(files[0])
    setMusicEnabled(true)
  }

  const addTag = () => {
    const v = tagInput.trim().replace(/^#/, '')
    if (!v || tags.includes(v)) return
    setTags((prev) => [...prev, v])
    setTagInput('')
  }

  const removeTag = (i: number) => setTags((prev) => prev.filter((_, idx) => idx !== i))

  const applyContent = useCallback((content: Partial<PostContent>) => {
    if (content.title !== undefined) setTitle(content.title)
    if (content.description !== undefined) setDescription(content.description)
    if (content.cta !== undefined) setCta(content.cta)
    if (content.tags !== undefined) setTags((prev) => [...new Set([...prev, ...content.tags!])])
    if (content.caption !== undefined) {
      // Auto-append food site link for food post types
      let cap = content.caption
      if (FOOD_POST_TYPES.includes(postType) && !cap.includes('premirafirst.com/food')) {
        cap = cap + '\n\nFull info → premirafirst.com/food 🍽️'
      }
      setCaption(cap)
    }
  }, [postType])

  // Research restaurant
  const handleResearch = async () => {
    if (!restaurantName.trim()) { show('Enter a restaurant name', 'error'); return }
    if (!restaurantCity.trim()) { show('Enter a city', 'error'); return }
    setResearching(true)
    setAiStatus('Researching restaurant...')
    try {
      const res = await fetch('/api/restaurant-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName: restaurantName.trim(), city: restaurantCity.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Research failed')
      setRestaurantData(data.restaurant)
      // Pre-fill prompt with restaurant summary
      setAiPrompt(`${data.restaurant.name} in ${data.restaurant.city}. ${data.restaurant.story}`)
      show(`Found ${data.restaurant.name} — data pre-filled!`)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Research failed', 'error')
    } finally {
      setResearching(false)
      setAiStatus('')
    }
  }

  // Generate content
  const handleGenerateAll = async () => {
    const promptToUse = aiPrompt.trim()
    if (!promptToUse) { show('Enter a description first', 'error'); return }
    setGenerating(true)
    setAiStatus('Generating content...')
    try {
      const content = await generateForPostType({
        postType,
        aiPrompt: promptToUse,
        platforms: selPlatforms,
        tone,
        restaurantData,
        channel: selectedChannel,
      })
      applyContent(content)
      show('Content generated!')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setGenerating(false)
      setAiStatus('')
    }
  }

  const handleRegenField = async (field: 'title' | 'description' | 'caption' | 'tags' | 'cta') => {
    if (!aiPrompt.trim() && !title) { show('Add a description first', 'error'); return }
    setAiStatus(`Regenerating ${field}...`)
    try {
      const result = await regenerateField(field, {
        promptText: aiPrompt || title,
        platforms: selPlatforms,
        tone,
        currentValue: field === 'description' ? description : undefined,
      })
      if (field === 'tags' && Array.isArray(result)) {
        setTags((prev) => [...new Set([...prev, ...(result as string[])])])
      } else if (field === 'title') setTitle(result as string)
      else if (field === 'description') setDescription(result as string)
      else if (field === 'caption') {
        let cap = result as string
        if (FOOD_POST_TYPES.includes(postType) && !cap.includes('premirafirst.com/food')) {
          cap = cap + '\n\nFull info → premirafirst.com/food 🍽️'
        }
        setCaption(cap)
      }
      else if (field === 'cta') setCta(result as string)
      show('Done!')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setAiStatus('')
    }
  }

  // Generate thumbnail
  const handleGenerateThumbnail = async () => {
    if (!title && !caption) { show('Add a title first', 'error'); return }
    setGeneratingThumb(true)
    try {
      const heroImage = mediaSrc?.startsWith('data:image/') ? mediaSrc : undefined
      const res = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selectedChannel,
          title: title || caption.split('\n')[0]?.slice(0, 80) || 'Untitled',
          accentWord: tags[0] || '',
          heroImageBase64: heroImage,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Thumbnail generation failed')
      setThumbnailSrc(data.thumbnailBase64)
      show('Thumbnail generated!')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Failed to generate thumbnail', 'error')
    } finally {
      setGeneratingThumb(false)
    }
  }

  // Publish handler — routes YouTube through its own API, others through /api/publish
  const doPublish = async (platforms: string[]) => {
    const connected = platforms.filter(p => connectedPlatforms.includes(p))
    if (!connected.length) {
      show('No connected platforms for this channel — connect on the Accounts page first', 'error')
      return
    }
    setPublishing(true)
    setVideoCreationStatus('')

    const allResults: PlatformResult[] = []

    const readAsDataURL = (file: File): Promise<string> =>
      new Promise(resolve => { const r = new FileReader(); r.onload = e => resolve(e.target?.result as string); r.readAsDataURL(file) })

    // ── Resolve media ─────────────────────────────────────────────────────────
    const videoFile = mediaFiles.find(f => f.type.startsWith('video/'))
    const imageFiles = mediaFiles.filter(f => f.type.startsWith('image/'))
    const videoData: string | null = videoFile
      ? (mediaSrc?.startsWith('data:video/') ? mediaSrc : await readAsDataURL(videoFile))
      : null
    const allImages: string[] = imageFiles.length > 0
      ? await Promise.all(imageFiles.map(readAsDataURL))
      : (mediaSrc?.startsWith('data:image/') ? [mediaSrc] : [])

    const needsVideoCreation = postAsVideo && imageFiles.length > 0 && !videoFile
    console.log(`[doPublish] postAsVideo=${postAsVideo} needsVideoCreation=${needsVideoCreation} images=${imageFiles.length} videoFile=${!!videoFile}`)

    // ── STEP 1: Create video from images (Video Reel mode only) ──────────────
    // This MUST complete before any platform publish is attempted.
    let videoJobId: string | null = null
    if (needsVideoCreation) {
      try {
        setVideoCreationStatus('Creating video reel...')
        videoJobId = await startVideoJob(imageFiles, selectedChannel, musicEnabled, musicMood, musicFile, title)
        console.log(`[doPublish] Video job started: ${videoJobId}`)
        await pollVideoJob(videoJobId, p => setVideoCreationStatus(`Creating video... ${p}%`))
        console.log(`[doPublish] Video job complete: ${videoJobId}`)
        setVideoCreationStatus('Video ready — publishing...')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Video creation failed'
        console.error(`[doPublish] Video creation failed:`, msg)
        show(msg, 'error')
        setPublishing(false)
        setVideoCreationStatus('')
        return  // Hard stop — do NOT fall through to image publishing
      }
    }

    // Safety net: in Video Reel mode we must have a completed job or an uploaded video.
    // If neither exists, refuse to publish rather than silently sending images.
    if (postAsVideo && imageFiles.length > 0 && !videoFile && !videoJobId) {
      show('Video Reel: video creation did not complete — cannot publish. Please try again.', 'error')
      setPublishing(false)
      setVideoCreationStatus('')
      return
    }

    // ── STEP 2: Download video formats (lazy, cached) ─────────────────────────
    const videoFormatCache: Partial<Record<'youtube' | 'reels', string>> = {}
    const getVideo = async (format: 'youtube' | 'reels'): Promise<string> => {
      if (!videoFormatCache[format]) {
        setVideoCreationStatus(`Preparing ${format === 'youtube' ? '16:9 video' : '9:16 reel'}...`)
        videoFormatCache[format] = await downloadJobVideo(videoJobId!, format)
        console.log(`[doPublish] Downloaded ${format}: ${(videoFormatCache[format]!.length / 1024 / 1024).toFixed(1)} MB`)
      }
      return videoFormatCache[format]!
    }

    try {
      // ── YouTube ──────────────────────────────────────────────────────────────
      if (connected.includes('youtube')) {
        let ytVideo = videoData
        if (!ytVideo && videoJobId) {
          try { ytVideo = await getVideo('youtube') }
          catch (e: unknown) {
            allResults.push({ platform: 'youtube', success: false, error: `Video download failed: ${e instanceof Error ? e.message : String(e)}` })
            ytVideo = null
          }
        }
        if (ytVideo) {
          try {
            const ytRes = await fetch('/api/publish/youtube', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoBase64: ytVideo,
                title: title || caption?.split('\n')[0]?.slice(0, 100) || 'PostStudio Upload',
                description: [description, caption].filter(Boolean).join('\n\n').slice(0, 5000),
                tags: tags.slice(0, 30),
                channelName: selectedChannel,
                thumbnailBase64: thumbnailSrc || undefined,
              }),
            })
            const ytData = await ytRes.json()
            if (ytRes.ok && (ytData.id || ytData.videoId)) {
              allResults.push({ platform: 'youtube', success: true, id: ytData.id || ytData.videoId })
            } else {
              allResults.push({ platform: 'youtube', success: false, error: ytData.error || 'YouTube upload failed' })
            }
          } catch (e: unknown) {
            allResults.push({ platform: 'youtube', success: false, error: e instanceof Error ? e.message : 'YouTube upload failed' })
          }
        } else if (!allResults.find(r => r.platform === 'youtube')) {
          allResults.push({
            platform: 'youtube', success: false, skipped: true,
            reason: postAsVideo
              ? 'Video Reel: no video ready — select Video Reel mode and upload images or a video file.'
              : 'No video attached — YouTube requires a video file.',
          })
        }
      }

      // ── Meta + other platforms ───────────────────────────────────────────────
      const otherPlatforms = connected.filter(p => p !== 'youtube')
      if (otherPlatforms.length > 0) {
        let metaVideo = videoData
        if (!metaVideo && videoJobId) {
          try { metaVideo = await getVideo('reels') }
          catch (e: unknown) {
            const msg = `Reel download failed: ${e instanceof Error ? e.message : String(e)}`
            for (const p of otherPlatforms) allResults.push({ platform: p, success: false, error: msg })
            metaVideo = null
          }
        }

        // CRITICAL: In Video Reel mode, NEVER fall back to sending images.
        // Only proceed if we have a video, OR we are in Carousel mode.
        const canPublishMeta = metaVideo || (!postAsVideo && allImages.length >= 0)
        const pendingPlatforms = otherPlatforms.filter(p => !allResults.find(r => r.platform === p))

        if (canPublishMeta && pendingPlatforms.length > 0) {
          const res = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: caption || description || title,
              // In Video Reel mode: only send video, NEVER images — even as fallback
              imageUrls: (!postAsVideo && !metaVideo && allImages.length > 0) ? allImages : undefined,
              videoBase64: metaVideo || undefined,
              platforms: pendingPlatforms,
              channel: selectedChannel,
              thumbnailBase64: thumbnailSrc || undefined,
            }),
          })
          const data = await res.json()
          if (Array.isArray(data.results)) allResults.push(...data.results)
        } else if (postAsVideo && !metaVideo) {
          for (const p of pendingPlatforms) {
            allResults.push({ platform: p, success: false, error: 'Video Reel: no video available to publish.' })
          }
        }
      }

      if (allResults.length > 0) showResults(allResults)
      else show('No platforms published — check connection status', 'error')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Publish failed', 'error')
    } finally {
      setPublishing(false)
      setVideoCreationStatus('')
    }
  }

  // Fix: auto-use connected platforms if none are explicitly selected
  const publishAll = () => {
    const toPublish = selPlatforms.length > 0 ? selPlatforms : connectedPlatforms
    if (!toPublish.length) {
      show('No connected platforms for this channel — connect on the Accounts page first', 'error')
      return
    }
    doPublish(toPublish)
  }

  const publishTo = (p: string) => doPublish([p])

  const currentPostType = POST_TYPES.find(pt => pt.value === postType)!
  const isFood = FOOD_POST_TYPES.includes(postType)
  const needsRestaurant = RESTAURANT_RESEARCH_TYPES.includes(postType)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">New post</span>
          <div className="flex gap-2">
            <button
              onClick={() => show('Draft saved')}
              className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Save draft
            </button>
            <button
              onClick={publishAll}
              disabled={publishing}
              className="px-3 py-2 min-h-[44px] text-[13px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {publishing && videoCreationStatus
                ? videoCreationStatus.length > 28 ? videoCreationStatus.slice(0, 26) + '…' : videoCreationStatus
                : publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Composer scroll area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">

            {/* Channel selector */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Channel</p>
              <div className="relative mb-3">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shrink-0 pointer-events-none"
                  style={{ background: CHANNEL_CONFIGS[selectedChannel]?.primary ?? '#888' }}
                />
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-[13px] border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:border-stone-400 appearance-none cursor-pointer"
                >
                  {CHANNEL_NAMES.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Post Type dropdown */}
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Post type</p>
              <div className="relative">
                <select
                  value={postType}
                  onChange={e => {
                    setPostType(e.target.value as PostTypeValue)
                    setRestaurantData(null)
                  }}
                  className="w-full pl-3 pr-4 py-2.5 text-[13px] border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:border-stone-400 appearance-none cursor-pointer"
                >
                  {POST_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {!statusLoading && connectedPlatforms.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-2">
                  No platforms connected for this channel —{' '}
                  <a href="/accounts" className="underline hover:text-amber-800">connect on Accounts page</a>
                </p>
              )}
              {!statusLoading && connectedPlatforms.length > 0 && (
                <p className="text-[11px] text-stone-400 mt-2">
                  Connected: {connectedPlatforms.join(', ')}
                </p>
              )}
            </div>

            {/* Restaurant Research — shown for No Frills / Restaurant Feature post types */}
            {needsRestaurant && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-[10px] font-medium text-amber-700 uppercase tracking-widest mb-1">
                  🔍 Restaurant Auto-Research
                </p>
                <p className="text-[11px] text-amber-600 mb-3">
                  Enter the restaurant and city — AI will find hours, address, price range, must-order dishes, and Maps link automatically.
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    value={restaurantName}
                    onChange={e => setRestaurantName(e.target.value)}
                    placeholder="Restaurant name"
                    className="flex-1 text-[13px] border border-amber-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-amber-400 text-stone-900 placeholder:text-stone-400"
                  />
                  <input
                    value={restaurantCity}
                    onChange={e => setRestaurantCity(e.target.value)}
                    placeholder="City"
                    className="w-32 text-[13px] border border-amber-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-amber-400 text-stone-900 placeholder:text-stone-400"
                  />
                </div>
                <button
                  onClick={handleResearch}
                  disabled={researching}
                  className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-amber-600 text-white text-[12px] font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {researching ? (
                    <><Spinner /> Researching...</>
                  ) : (
                    <><span>🔍</span> Research restaurant</>
                  )}
                </button>

                {restaurantData && (
                  <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg text-[11px] text-stone-700 space-y-1">
                    <p className="font-semibold text-stone-900 text-[12px]">✓ {restaurantData.name}</p>
                    <p>📍 {restaurantData.address}</p>
                    <p>🕐 {restaurantData.hours}</p>
                    <p>💰 {restaurantData.priceRange}</p>
                    <p>🍽️ {restaurantData.mustOrder.map(d => d.dish).join(' · ')}</p>
                    {restaurantData.awards && <p>🏆 {restaurantData.awards}</p>}
                    <button
                      onClick={() => setRestaurantData(null)}
                      className="text-[10px] text-stone-400 hover:text-stone-600 mt-1"
                    >
                      Clear research data
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Top 5 city research — shown for Top 5 post type */}
            {postType === 'top5' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-[10px] font-medium text-amber-700 uppercase tracking-widest mb-1">
                  🗺️ Top 5 City
                </p>
                <p className="text-[11px] text-amber-600 mb-3">
                  Enter the city for the food guide. The AI will generate the top 5 dishes and places.
                </p>
                <input
                  value={restaurantCity}
                  onChange={e => setRestaurantCity(e.target.value)}
                  placeholder="City (e.g. Tokyo, Barcelona, New York)"
                  className="w-full text-[13px] border border-amber-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-amber-400 text-stone-900 placeholder:text-stone-400"
                />
              </div>
            )}

            {/* AI Prompt Card */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-1">AI Content Generator</p>
              <p className="text-[11px] text-stone-400 mb-3">{currentPostType.label} — {
                postType === 'standard' ? 'fills title, description, caption, tags & CTA' :
                postType === 'no-frills' ? 'generates hook, story, must order, info slides & poll' :
                postType === 'top5' ? 'generates 5 destination dishes + poll slide' :
                postType === 'restaurant-feature' ? 'generates full restaurant profile with booking link' :
                postType === 'car-feature' ? 'generates editorial car feature with specs' :
                postType === 'stats' ? 'generates stats comparison with verdict & poll' :
                'generates quiz questions with answers'
              }</p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder={currentPostType.placeholder}
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg p-3 md:p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors capitalize ${
                        tone === t
                          ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateAll}
                  disabled={generating || researching}
                  className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-stone-900 text-white text-[14px] md:text-[12px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {generating ? (
                    <><Spinner /> Generating...</>
                  ) : (
                    <><span className="text-[10px]">✦</span> Generate all</>
                  )}
                </button>
              </div>
              {aiStatus && (
                <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1.5">
                  <Spinner className="w-3 h-3" /> {aiStatus}
                </p>
              )}
            </div>

            {/* Media */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Media</p>
              <label
                className="block border-2 border-dashed border-stone-300 rounded-xl p-6 md:p-5 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-stone-50') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-stone-50')}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              >
                <input type="file" multiple accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <svg className="w-7 h-7 mx-auto mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-[13px] text-stone-500">Drop video or images</p>
                <p className="text-[11px] text-stone-400 mt-0.5">MP4, MOV, JPG, PNG, WebP</p>
              </label>
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-stone-100 border border-stone-200 relative flex items-center justify-center overflow-hidden">
                      {f.type.startsWith('image') ? (
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" muted playsInline />
                      )}
                      <button
                        onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-4 h-4 bg-stone-900 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Post As toggle — shown when images present but no video */}
              {mediaFiles.some(f => f.type.startsWith('image/')) && !mediaFiles.some(f => f.type.startsWith('video/')) && (
                <div className="mt-3 flex items-center gap-2.5">
                  <p className="text-[11px] text-stone-500 shrink-0">Post as:</p>
                  <div className="flex rounded-lg border border-stone-200 overflow-hidden text-[11px] font-medium">
                    <button
                      onClick={() => setPostAsVideo(false)}
                      className={`px-3 py-1.5 transition-colors ${!postAsVideo ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                      Carousel
                    </button>
                    <button
                      onClick={() => setPostAsVideo(true)}
                      className={`px-3 py-1.5 transition-colors border-l border-stone-200 ${postAsVideo ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                    >
                      Video Reel
                    </button>
                  </div>
                  {postAsVideo && (
                    <p className="text-[10px] text-stone-400">Images will be assembled into an MP4 reel on publish</p>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Thumbnail</p>
              <div className="flex gap-2 mb-3">
                <label className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/jpeg,.jpg,.jpeg,image/png,.png"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const reader = new FileReader()
                      reader.onload = ev => setThumbnailSrc(ev.target?.result as string)
                      reader.readAsDataURL(f)
                    }}
                  />
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Add Thumbnail
                </label>
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={generatingThumb}
                  className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {generatingThumb ? <><Spinner className="w-3 h-3" /> Generating...</> : <><span className="text-[10px]">✦</span> Generate Thumbnail</>}
                </button>
              </div>
              {thumbnailSrc ? (
                <div className="relative">
                  <img src={thumbnailSrc} alt="Thumbnail preview" className="w-full rounded-lg border border-stone-200 object-cover" style={{ maxHeight: '160px' }} />
                  <button
                    onClick={() => setThumbnailSrc(null)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 bg-stone-900/70 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-stone-900"
                  >×</button>
                </div>
              ) : (
                <p className="text-[11px] text-stone-400">Used as the YouTube thumbnail and video cover image for Instagram/Facebook.</p>
              )}
            </div>

            {/* Music */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Background Music</p>
                <button
                  onClick={() => setMusicEnabled(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${musicEnabled ? 'bg-stone-800' : 'bg-stone-200'}`}
                  aria-label="Toggle music"
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${musicEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {musicEnabled && (
                <div className="space-y-3">
                  {/* Mood selector */}
                  <div>
                    <p className="text-[10px] text-stone-400 mb-1.5">Mood</p>
                    <div className="flex gap-2">
                      {(['calm', 'energy'] as const).map((mood) => (
                        <button
                          key={mood}
                          onClick={() => setMusicMood(mood)}
                          className={`flex-1 py-2 text-[12px] rounded-lg border transition-all capitalize ${
                            musicMood === mood
                              ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                              : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                          }`}
                        >
                          {mood === 'calm' ? '🎵 Calm' : '⚡ Energy'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload track */}
                  <div>
                    <p className="text-[10px] text-stone-400 mb-1.5">Track</p>
                    {musicFile ? (
                      <div className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                        <span className="text-[16px]">🎵</span>
                        <span className="flex-1 text-[11px] text-stone-700 truncate">{musicFile.name}</span>
                        <button onClick={() => setMusicFile(null)} className="text-[10px] text-stone-400 hover:text-stone-700">×</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-2.5 border border-dashed border-stone-300 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                        <input
                          ref={musicInputRef}
                          type="file"
                          accept="audio/mpeg,.mp3,audio/wav,.wav,audio/aac,.aac"
                          className="hidden"
                          onChange={(e) => handleMusicFile(e.target.files)}
                        />
                        <span className="text-[16px]">♪</span>
                        <span className="text-[11px] text-stone-500">Upload track (MP3, WAV, AAC)</span>
                      </label>
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">
                      {musicMood === 'calm' ? 'Calm mood: ambient, lo-fi, gentle backgrounds' : 'Energy mood: upbeat, driving, high-energy tracks'}
                    </p>
                  </div>
                </div>
              )}

              {!musicEnabled && (
                <p className="text-[11px] text-stone-400">Toggle on to add a background track or set a music mood for this post.</p>
              )}
            </div>

            {/* Platforms */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Platforms</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isConnected = connectedPlatforms.includes(p.id)
                  const isSelected = selPlatforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => isConnected && togglePlatform(p.id)}
                      title={isConnected ? undefined : `${p.label} not connected for ${selectedChannel}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-all ${
                        !isConnected
                          ? 'border-stone-100 text-stone-300 cursor-not-allowed'
                          : isSelected
                          ? 'border-stone-400 bg-stone-100 text-stone-900 font-medium'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isConnected ? p.color : '#d4d4d4' }} />
                      {p.label}
                      {!isConnected && <span className="text-[9px] text-stone-300">✕</span>}
                    </button>
                  )
                })}
              </div>
              {!statusLoading && connectedPlatforms.length > 0 && selPlatforms.length === 0 && (
                <p className="text-[10px] text-stone-400 mt-2">No platforms toggled — Publish will use all connected platforms.</p>
              )}
            </div>

            {/* Title */}
            <Field label="Post title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your post title..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <AIStrip onRegen={() => handleRegenField('title')} label="Regenerate title" loading={aiStatus.includes('title')} />
            </Field>

            {/* Description */}
            <Field label="Description / slide content">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={postType === 'standard' ? 4 : 8}
                placeholder={
                  postType === 'no-frills' ? '🔥 HOOK:\n📖 THE STORY:\n🍜 MUST ORDER:\nℹ️ INFO:' :
                  postType === 'top5' ? '1. Dish · Place\n2. Dish · Place\n...' :
                  'Full post description...'
                }
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400 font-mono text-[12px]"
              />
              <div className="flex items-center justify-between mt-1.5">
                <AIStrip
                  onRegen={() => handleRegenField('description')}
                  label="Regenerate"
                  loading={aiStatus.includes('description')}
                  extra={[{ label: 'Improve', onClick: () => handleRegenField('description') }]}
                />
                <span className="text-[10px] text-stone-400">{description.length} chars</span>
              </div>
            </Field>

            {/* Caption */}
            <Field label="Caption">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Short punchy caption..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between mt-1.5">
                <AIStrip onRegen={() => handleRegenField('caption')} label="Regenerate" loading={aiStatus.includes('caption')} />
                <span className="text-[10px] text-stone-400">{caption.length} / 2200</span>
              </div>
              {isFood && !caption.includes('premirafirst.com/food') && caption.length > 0 && (
                <button
                  onClick={() => setCaption(c => c + '\n\nFull info → premirafirst.com/food 🍽️')}
                  className="mt-1.5 text-[10px] text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  + Add food site link
                </button>
              )}
            </Field>

            {/* Tags */}
            <Field label="Tags & hashtags">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-full text-stone-600">
                    #{t}
                    <button onClick={() => removeTag(i)} className="text-stone-400 hover:text-stone-700 text-[10px] leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tag"
                  className="flex-1 text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
                />
                <button onClick={addTag} className="px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">Add</button>
                <AIStrip onRegen={() => handleRegenField('tags')} label="✦ AI suggest" loading={aiStatus.includes('tags')} />
              </div>
            </Field>

            {/* CTA */}
            <Field label="Call to action">
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder={isFood ? 'Full restaurant info at premirafirst.com/food 🍽️' : 'e.g. Link in bio! Shop now at...'}
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <AIStrip onRegen={() => handleRegenField('cta')} label="Generate CTA" loading={aiStatus.includes('cta')} />
            </Field>

            {/* Format */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Format & duration</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelFormat(f)}
                    className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
                      selFormat === f
                        ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">When to publish</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(['now', 'schedule', 'ai'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTiming(t)}
                    className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
                      timing === t
                        ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {t === 'now' ? 'Publish now' : t === 'schedule' ? 'Schedule' : '✦ Best time (AI)'}
                  </button>
                ))}
              </div>
              {timing === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduleDt}
                  onChange={(e) => setScheduleDt(e.target.value)}
                  className="text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                />
              )}
              {timing === 'ai' && (
                <p className="text-[11px] text-stone-400">AI will pick the optimal time per platform based on your audience engagement patterns.</p>
              )}
            </div>

          </div>

          {/* Preview Panel */}
          <PostPreview
            title={title}
            caption={caption}
            mediaSrc={mediaSrc}
            selectedPlatforms={selPlatforms.length > 0 ? selPlatforms : connectedPlatforms}
            tags={tags}
            readiness={readiness}
            onPublishAll={publishAll}
            onPublishTo={publishTo}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Publish Results Panel */}
      {publishResults && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-stone-900 text-white rounded-xl shadow-lg z-50 min-w-[260px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-700">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">Publish Results</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {publishResults.map(r => (
              <div key={r.platform} className="flex items-start gap-2.5">
                <span className="text-[14px] leading-none mt-0.5">
                  {r.success ? '✅' : r.skipped ? '⚠️' : '❌'}
                </span>
                <div>
                  <p className="text-[12px] font-medium capitalize">{r.platform}</p>
                  <p className={`text-[10px] ${r.success ? 'text-stone-400' : r.skipped ? 'text-amber-400' : 'text-red-400'}`}>
                    {r.success
                      ? `Published${r.id ? ` · ${r.id.slice(0, 16)}` : ''}`
                      : r.skipped
                      ? (r.reason || 'Not published')
                      : (r.error || 'Failed')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl p-4">
      <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2.5">{label}</p>
      {children}
    </div>
  )
}

function AIStrip({
  onRegen, label, loading, extra,
}: {
  onRegen: () => void
  label: string
  loading?: boolean
  extra?: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap">
      <button
        onClick={onRegen}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-stone-200 rounded-full text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40"
      >
        <span className="text-[9px]">✦</span> {label}
      </button>
      {extra?.map((e) => (
        <button
          key={e.label}
          onClick={e.onClick}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-stone-200 rounded-full text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <span className="text-[9px]">✦</span> {e.label}
        </button>
      ))}
    </div>
  )
}

function Spinner({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}
