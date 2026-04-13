import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_TOPICS_PATH = path.join(DATA_DIR, 'used-topics.json')

type UsedTopics = Record<string, string[]>

async function loadUsedTopics(): Promise<UsedTopics> {
  try {
    if (!existsSync(USED_TOPICS_PATH)) return {}
    const raw = await readFile(USED_TOPICS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function saveUsedTopics(topics: UsedTopics): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
  await writeFile(USED_TOPICS_PATH, JSON.stringify(topics, null, 2))
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Use Claude to extract specific image search queries from slide content.
 * Returns one search query per slide, focusing on proper nouns and specific subjects.
 */
async function extractImageQueries(slides: Slide[], channel: string): Promise<string[]> {
  try {
    const slideSummaries = slides.map((s, i) =>
      `Slide ${i + 1}: Headline: "${s.headline}" Body: "${s.body}"`
    ).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'You extract specific image search queries. Return ONLY a JSON array of strings, one per slide. No markdown, no explanation.',
      messages: [{
        role: 'user',
        content: `Extract the best Google Image search query for each slide below. The channel is "${channel}".

Rules:
- Focus on SPECIFIC proper nouns: player names, team names, car models, race circuits, specific events
- Remove generic words like "football", "soccer", "racing", "sports", "world", "news", "update", "breaking"
- Include context that helps find the RIGHT image (e.g. "Yan Diomande Manchester United transfer" not "United Football")
- Each query should be 3-6 words maximum
- For people: use their full name + team/context
- For cars: use make + model + year if mentioned
- For events: use event name + location

${slideSummaries}

Return a JSON array of ${slides.length} search query strings.`,
      }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)?.[0]
    if (!match) throw new Error('No JSON array found')
    const queries: string[] = JSON.parse(match)
    if (queries.length !== slides.length) throw new Error('Wrong number of queries')
    return queries
  } catch (e) {
    console.warn('[auto-generate] Claude image query extraction failed:', e instanceof Error ? e.message : e)
    // Fallback: use headline words, filtering out generic terms
    const genericWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with', 'how', 'why', 'what', 'football', 'soccer', 'racing', 'sports', 'world', 'news', 'update', 'breaking', 'latest', 'big', 'new', 'top', 'major', 'shocking'])
    return slides.map(s => {
      const words = s.headline.split(/\s+/).filter(w => w.length > 2 && !genericWords.has(w.toLowerCase()))
      return words.slice(0, 4).join(' ') + ' ' + channel
    })
  }
}

async function pickRandomMusic(): Promise<string | null> {
  const musicFolder = process.env.MUSIC_FOLDER
  if (!musicFolder || !existsSync(musicFolder)) return null
  try {
    const entries = await readdir(musicFolder)
    const mp3s: string[] = []
    for (const f of entries) {
      if (!f.toLowerCase().endsWith('.mp3')) continue
      const fileStat = await stat(path.join(musicFolder, f))
      if (fileStat.isFile()) mp3s.push(f)
    }
    if (mp3s.length === 0) return null
    const pick = mp3s[Math.floor(Math.random() * mp3s.length)]
    const buffer = await readFile(path.join(musicFolder, pick))
    console.log(`[auto-generate] Using music: ${pick}`)
    return `data:audio/mpeg;base64,${buffer.toString('base64')}`
  } catch (e) {
    console.warn('[auto-generate] Failed to read music folder:', e instanceof Error ? e.message : e)
    return null
  }
}

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

const DEFAULT_CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira F1',
  'Road & Trax',
  'Omnira Football',
]

const CHANNEL_TAGS: Record<string, string[]> = {
  'Gentlemen of Fuel': ['Motorsport', 'Cars', 'Racing', 'Automotive'],
  'Omnira F1': ['Formula 1', 'F1', 'Grand Prix', 'Racing', 'Motorsport'],
  'Road & Trax': ['Cars', 'Automotive', 'Driving', 'Road Cars'],
  'Omnira Football': ['Football', 'Soccer', 'Premier League'],
}

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'youtube']

type Slide = {
  num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string; imageOptions?: string[]
}

function generateTags(channel: string, topic: string, slides: Slide[]): string[] {
  const tags: string[] = [channel, ...(CHANNEL_TAGS[channel] || [])]
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with', 'how', 'why', 'what'])
  if (topic) {
    tags.push(...topic.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase())).slice(0, 4))
  }
  for (const s of slides) {
    tags.push(...s.headline.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()) && /^[A-Z]/.test(w)))
  }
  const allText = slides.map(s => `${s.headline} ${s.body} ${s.tag} ${s.badge}`).join(' ')
  const hashTags = (allText.match(/#[\w]+/g) || []).map(t => t.replace('#', ''))
  tags.push(...hashTags)
  const seen = new Set<string>()
  return tags.filter(t => {
    const key = t.toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 15)
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
  let channels: string[]

  try {
    const body = await req.json().catch(() => ({}))
    channels = body.channels && Array.isArray(body.channels) ? body.channels : DEFAULT_CHANNELS
  } catch {
    channels = DEFAULT_CHANNELS
  }

  const results: { channel: string; status: string; headline?: string; error?: string }[] = []

  // Load previously used topics for deduplication
  const usedTopics = await loadUsedTopics()

  for (const channel of channels) {
    console.log(`[auto-generate] Starting: ${channel}`)
    try {
      // Get excluded topics for this channel
      const channelExclusions = usedTopics[channel] || []
      console.log(`[auto-generate] [${channel}] Excluding ${channelExclusions.length} previous topics`)

      // Step 1: Get today's news (with topic exclusions)
      console.log(`[auto-generate] [${channel}] Fetching news...`)
      const newsRes = await fetch(`${baseUrl}/api/news-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, timestamp: Date.now(), exclude_topics: channelExclusions }),
      })
      const newsData = await newsRes.json()
      if (!newsRes.ok) throw new Error(newsData.error || 'News fetch failed')

      const slides: Slide[] = newsData.slides
      const topic: string = newsData.topic || newsData.story || ''
      const headline = slides[0]?.headline || topic

      // Step 2: Extract specific image search queries using Claude
      console.log(`[auto-generate] [${channel}] Extracting image search queries...`)
      const imageQueries = await extractImageQueries(slides, channel)
      console.log(`[auto-generate] [${channel}] Image queries:`, imageQueries)

      // Step 3: Fetch images for each slide via Serper image search
      console.log(`[auto-generate] [${channel}] Fetching images for ${slides.length} slides...`)
      await Promise.all(slides.map(async (slide, slideIdx) => {
        try {
          const searchQuery = imageQueries[slideIdx] || `${slide.headline} ${channel}`
          const imgRes = await fetch(`${baseUrl}/api/search-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery, count: 5 }),
          })
          if (!imgRes.ok) return
          const imgData = await imgRes.json()
          const imageUrls: string[] = (imgData.images || [])
            .map((img: { url: string }) => img.url)
            .filter((url: string) => !isBlockedImageUrl(url))
          if (imageUrls.length === 0) {
            console.warn(`[auto-generate] [${channel}] No valid image URLs for "${slide.headline}" after filtering`)
            return
          }

          // Store all URLs as options for cycling later
          slide.imageOptions = imageUrls

          // Try each image URL until one downloads and converts successfully
          for (const url of imageUrls) {
            try {
              const proxyRes = await fetch(`${baseUrl}/api/fetch-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
              })
              if (!proxyRes.ok) continue
              const proxyData = await proxyRes.json()
              if (proxyData.base64) {
                slide.image = proxyData.base64
                break // success — stop trying more URLs
              }
            } catch {
              // This URL failed, try the next one
              continue
            }
          }
          if (!slide.image) {
            console.warn(`[auto-generate] [${channel}] All image URLs failed for "${slide.headline}" — using solid colour`)
          }
        } catch (e) {
          console.warn(`[auto-generate] [${channel}] Image search failed for "${slide.headline}":`, e instanceof Error ? e.message : e)
        }
      }))

      console.log(`[auto-generate] [${channel}] Compositing ${slides.length} slides...`)
      const compRes = await fetch(`${baseUrl}/api/composite-slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, channel }),
      })
      const compData = await compRes.json()
      if (!compRes.ok) throw new Error(compData.error || 'Compositing failed')

      const compositedSlides = slides.map((s, i) => ({
        ...s,
        image: compData.frames[i] || s.image,
      }))

      console.log(`[auto-generate] [${channel}] Generating video...`)
      const musicBase64 = await pickRandomMusic()
      const vidRes = await fetch(`${baseUrl}/api/video-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: compositedSlides,
          slideDuration: 5,
          ...(musicBase64 ? { audioUrl: musicBase64, musicVolume: 15 } : {}),
        }),
      })
      const vidData = await vidRes.json()
      if (!vidRes.ok) throw new Error(vidData.error || 'Video export failed')

      // Generate tags
      const ytTags = generateTags(channel, topic, slides)
      const ytTitle = headline
      const ytDescription = slides.map(s => s.headline + '\n' + s.body).join('\n\n')

      console.log(`[auto-generate] [${channel}] Adding to approval queue...`)
      const approvalRes = await fetch(`${baseUrl}/api/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          headline,
          topic,
          slides: compositedSlides,
          videoBase64: vidData.video,
          platforms: DEFAULT_PLATFORMS,
          ytTitle,
          ytDescription,
          ytTags,
        }),
      })
      const approvalData = await approvalRes.json()
      if (!approvalRes.ok) throw new Error(approvalData.error || 'Approval queue failed')

      // Track this topic to avoid repeats in future runs
      if (topic) {
        if (!usedTopics[channel]) usedTopics[channel] = []
        usedTopics[channel].push(topic)
        // Keep only the last 7 entries per channel
        if (usedTopics[channel].length > 7) {
          usedTopics[channel] = usedTopics[channel].slice(-7)
        }
        await saveUsedTopics(usedTopics)
      }

      console.log(`[auto-generate] [${channel}] Done: "${headline}"`)
      results.push({ channel, status: 'success', headline })

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      console.error(`[auto-generate] [${channel}] Failed:`, msg)
      results.push({ channel, status: 'error', error: msg })
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'error').length
  console.log(`[auto-generate] Complete: ${succeeded} succeeded, ${failed} failed`)

  return NextResponse.json({
    summary: `Generated ${succeeded}/${channels.length} channels`,
    results,
  })
}
