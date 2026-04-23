import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { saveToDrive } from '@/lib/drive-images'
import { generateCTA, loadRecentCTAs, saveRecentCTA } from '@/lib/ctas'
import { generateHashtags } from '@/lib/hashtags'
import { getContentTypeForDay, generateContentSlides, extractPollFromSlides, type ContentType } from '@/lib/content-mix'
import { CHANNELS } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_TOPICS_PATH = path.join(DATA_DIR, 'used-topics.json')

type UsedTopics = Record<string, string[]>

async function loadUsedTopics(): Promise<UsedTopics> {
  try {
    if (!existsSync(USED_TOPICS_PATH)) return {}
    // Reset exclusions each new day — yesterday's topics should not block today's search
    const fileStat = await stat(USED_TOPICS_PATH)
    const fileDate = fileStat.mtime.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    if (fileDate < today) {
      console.log(`[auto-generate] used-topics.json is from ${fileDate} — resetting for today (${today})`)
      return {}
    }
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
      model: 'claude-haiku-4-5-20251001',
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
${channel === 'Omnira Football' ? `
CHANNEL-SPECIFIC RULES FOR OMNIRA FOOTBALL:
- Every query MUST target association football/soccer only — never use terms that could return American football, NFL, or rugby results
- Append "soccer" to every query
- Never use the word "football" alone — always use "soccer" instead
- Example: "Salah Liverpool soccer goal" not "Salah Liverpool football"
` : ''
}
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
    const genericWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with'])
    return slides.map(s => {
      const words = s.headline.split(/\s+/).filter(w => !genericWords.has(w.toLowerCase()))
      return words.slice(0, 5).join(' ')
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
  'Omnira Football',
  'Omnira Food',
]

const CHANNEL_TAGS: Record<string, string[]> = {
  'Gentlemen of Fuel': ['Motorsport', 'Cars', 'Racing', 'Automotive'],
  'Omnira F1': ['Formula 1', 'F1', 'Grand Prix', 'Racing', 'Motorsport'],
  'Omnira Football': ['Football', 'Soccer', 'Premier League'],
  'Omnira Food': ['Food', 'Restaurants', 'Cuisine', 'Dining'],
}

const DEFAULT_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube']

const CHANNEL_FALLBACK_QUERIES: Record<string, string> = {
  'Gentlemen of Fuel': 'luxury supercar racing',
  'Omnira F1': 'Formula 1 race track',
  'Omnira Football': 'football stadium crowd soccer',
  'Omnira Food': 'gourmet food restaurant',
}

type ChartData = {
  type: string
  title: string
  items: { label: string; value: number | string; unit?: string }[]
}

type Slide = {
  num: string; tag: string; headline: string; body: string; badge: string; accent: string;
  image?: string; imageOptions?: string[]; tileType?: string; chartData?: ChartData
}

// ── Chart extraction ───────────────────────────────────────────────────────
// Scans a story-text slide's body for numeric patterns (points, goals, %, £)
// and builds a chartData object when 2+ comparable values are found.
function extractChartData(slide: { body: string; headline: string }): ChartData | undefined {
  const text = `${slide.headline}. ${slide.body}`

  type RawItem = { label: string; value: number; unit: string }

  // Get the best label from text immediately before a match position
  function labelBefore(pos: number, lookback = 55): string {
    const before = text.slice(Math.max(0, pos - lookback), pos).trimEnd()
    // Prefer a run of capitalised words at the tail (team/player names)
    const cap = before.match(/\b([A-Z][a-zA-Z&'-]+(?:\s+[A-Z][a-zA-Z&'-]+)*)\s*$/)
    if (cap && cap[1].length >= 3 && cap[1].length <= 24) return cap[1]
    // Fall back to last 1-2 meaningful words
    const words = before.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).filter(w => w.length >= 3)
    const tail = words.slice(-2).join(' ')
    return tail.length >= 3 ? tail : ''
  }

  // Deduplicate raw items by numeric value then return ≥2 unique entries
  function dedupe(raw: RawItem[]): RawItem[] {
    const seen = new Set<number>()
    return raw.filter(item => {
      if (seen.has(item.value)) return false
      seen.add(item.value)
      return true
    }).slice(0, 5)
  }

  // Strategy functions — each returns (label, value, unit) triples
  const strategies: Array<{ run: () => RawItem[]; title: (unit: string) => string }> = [
    {
      run: () => {
        const items: RawItem[] = []
        const re = /([\d,]+(?:\.\d+)?)\s*(?:points?|pts)\b/gi
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const v = parseFloat(m[1].replace(/,/g, ''))
          const label = labelBefore(m.index)
          if (!isNaN(v) && label) items.push({ label, value: v, unit: 'pts' })
        }
        return items
      },
      title: () => 'Points Standings',
    },
    {
      run: () => {
        const items: RawItem[] = []
        const re = /([\d,]+)\s*goals?\b/gi
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const v = parseInt(m[1])
          const label = labelBefore(m.index)
          if (!isNaN(v) && label) items.push({ label, value: v, unit: 'goals' })
        }
        return items
      },
      title: () => 'Goals',
    },
    {
      run: () => {
        const items: RawItem[] = []
        const re = /([\d,]+(?:\.\d+)?)\s*%/g
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const v = parseFloat(m[1])
          const label = labelBefore(m.index)
          if (!isNaN(v) && label) items.push({ label, value: v, unit: '%' })
        }
        return items
      },
      title: () => 'Comparison',
    },
    {
      run: () => {
        const items: RawItem[] = []
        const re = /(£|€|\$)([\d,]+(?:\.\d+)?)\s*(M|bn|B|k)?\b/gi
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const v = parseFloat(m[2].replace(/,/g, ''))
          const suffix = m[3] ? m[3].toUpperCase() : ''
          const label = labelBefore(m.index)
          if (!isNaN(v) && label) items.push({ label, value: v, unit: `${m[1]}${suffix}` })
        }
        return items
      },
      title: (unit) => unit.includes('£') || unit.includes('€') || unit.includes('$') ? 'Transfer Value' : 'Value',
    },
    {
      run: () => {
        const items: RawItem[] = []
        const re = /([\d,]+)\s*(wins?|races?|laps?|assists?)\b/gi
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const v = parseInt(m[1])
          const rawUnit = m[2].replace(/s$/, 's') // keep plural
          const label = labelBefore(m.index)
          if (!isNaN(v) && label) items.push({ label, value: v, unit: rawUnit })
        }
        return items
      },
      title: (unit) => unit.charAt(0).toUpperCase() + unit.slice(1),
    },
  ]

  for (const { run, title } of strategies) {
    const unique = dedupe(run())
    if (unique.length >= 2) {
      const unit = unique[0].unit
      return {
        type: 'bar',
        title: title(unit),
        items: unique.map(({ label, value, unit: u }) => ({ label, value, unit: u || undefined })),
      }
    }
  }

  return undefined
}

function enforceTilePattern(slides: Slide[]): void {
  slides.forEach((slide, i) => {
    if (slide.tileType === 'poll') return  // preserve explicit poll tiles
    if (i === 0) {
      slide.tileType = 'hook'
    } else if (i === 1) {
      slide.tileType = 'brand'
    } else if (i === slides.length - 1) {
      slide.tileType = 'cta'
    } else {
      slide.tileType = (i - 2) % 2 === 0 ? 'story' : 'story-text'
    }
  })
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

  let preSelected: Record<string, { topic: string; headline: string; articleUrl: string }> = {}
  try {
    const body = await req.json().catch(() => ({}))
    channels = body.channels && Array.isArray(body.channels) ? body.channels : DEFAULT_CHANNELS
    preSelected = body.preSelected || {}
    console.log(`[auto-generate] Received channels: ${JSON.stringify(channels)}`)
    console.log(`[auto-generate] Received preSelected keys: ${JSON.stringify(Object.keys(preSelected))}`)
    for (const [ch, ps] of Object.entries(preSelected)) {
      console.log(`[auto-generate] preSelected["${ch}"]: topic="${(ps as { topic: string }).topic}" headline="${(ps as { headline: string }).headline}"`)
    }
  } catch {
    channels = DEFAULT_CHANNELS
    console.error('[auto-generate] Body parse failed — using DEFAULT_CHANNELS, preSelected lost')
  }

  // Credit balance check — skip generation if balance is critically low
  try {
    const creditRes = await fetch('https://api.anthropic.com/v1/organizations/usage', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
    })
    if (creditRes.ok) {
      const creditData = await creditRes.json() as { credit_balance?: number }
      const balance = creditData.credit_balance ?? null
      if (balance !== null && balance < 2.0) {
        console.warn(`[auto-generate] Credit balance too low ($${balance.toFixed(2)}) — skipping generation`)
        return NextResponse.json({
          summary: 'Skipped — Anthropic credit balance below $2.00',
          balance,
          results: [],
        }, { status: 200 })
      }
      if (balance !== null) {
        console.log(`[auto-generate] Credit balance: $${balance.toFixed(2)}`)
      }
    }
  } catch (e) {
    // Non-fatal — log and continue if the balance check itself fails
    console.warn('[auto-generate] Could not check credit balance:', e instanceof Error ? e.message : e)
  }

  const results: { channel: string; status: string; headline?: string; error?: string }[] = []

  // Load previously used topics for deduplication
  const usedTopics = await loadUsedTopics()

  for (const channel of channels) {
    console.log(`[auto-generate] Starting: ${channel}`)
    try {
      const channelExclusions = usedTopics[channel] || []
      console.log(`[auto-generate] [${channel}] Excluding ${channelExclusions.length} previous topics`)

      const channelPreSelected = preSelected[channel] as (typeof preSelected[string] & { contentType?: ContentType }) | undefined

      // Determine content type for today; preSelected can carry an override
      const activeContentType: ContentType = channelPreSelected?.contentType || getContentTypeForDay()
      console.log(`[auto-generate] [${channel}] Content type: ${activeContentType}`)

      let slides: Slide[] = []
      let topic = ''
      let pollQuestion: string | undefined
      let pollOptions: string[] | undefined

      if (activeContentType !== 'news') {
        // ── Content-mix generator (Quiz / Stats / History / Tips) ─────────────
        const channelCfg = CHANNELS[channel]
        if (!channelCfg?.contentMix) {
          console.warn(`[auto-generate] [${channel}] No contentMix config — falling back to news`)
        } else {
          console.log(`[auto-generate] [${channel}] Generating ${activeContentType} slides via content-mix`)
          const generated = await generateContentSlides(
            activeContentType, channel, channelCfg.contentMix, channelCfg.primary,
          )
          slides = generated.slides as Slide[]
          topic = generated.topic
          console.log(`[auto-generate] [${channel}] Content-mix topic: "${topic}"`)
          // Extract poll data from poll slide (Stats & Quiz generators append one)
          const pollData = extractPollFromSlides(slides)
          pollQuestion = pollData.pollQuestion
          pollOptions = pollData.pollOptions
        }
      }

      if (slides.length === 0) {
        // ── News via news-brief (default, or content-mix fallback) ────────────
        if (channelPreSelected) {
          console.log(`[auto-generate] [${channel}] Using pre-selected story: topic="${channelPreSelected.topic}" headline="${channelPreSelected.headline}"`)
        } else {
          console.log(`[auto-generate] [${channel}] No preSelected — falling back to web search`)
        }
        const newsBriefPayload = {
          channel,
          timestamp: Date.now(),
          exclude_topics: channelExclusions,
          ...(channelPreSelected ? { preSelected: channelPreSelected } : {}),
        }
        console.log(`[auto-generate] [${channel}] news-brief payload (preSelected present: ${!!channelPreSelected}):`, JSON.stringify(newsBriefPayload).substring(0, 300))
        const newsRes = await fetch(`${baseUrl}/api/news-brief`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newsBriefPayload),
        })
        const newsData = await newsRes.json()
        if (!newsRes.ok) throw new Error(newsData.error || 'News fetch failed')

        slides = newsData.slides
        topic = newsData.topic || newsData.story || ''
        pollQuestion = newsData.pollQuestion
        pollOptions = newsData.pollOptions

        // Word-overlap duplicate check: retry if 3+ significant words match a recent used topic
        if (topic && !channelPreSelected) {
          const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'was', 'are', 'vs', 'with', 'that', 'this', 'has', 'have', 'had'])
          const significantWords = (s: string) => new Set(s.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w)))
          const topicWords = significantWords(topic)
          const recentTopics = usedTopics[channel] || []
          const isDuplicate = recentTopics.some(used => {
            const usedWords = significantWords(used)
            const overlap = [...topicWords].filter(w => usedWords.has(w))
            return overlap.length >= 3
          })
          if (isDuplicate) {
            console.warn(`[auto-generate] [${channel}] Topic "${topic.substring(0, 60)}" overlaps with recent used topics — retrying`)
            const retryRes = await fetch(`${baseUrl}/api/news-brief`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel, timestamp: Date.now(), exclude_topics: [...channelExclusions, topic] }),
            })
            const retryData = await retryRes.json()
            if (retryRes.ok && retryData.slides) {
              slides = retryData.slides
              topic = retryData.topic || retryData.story || topic
              console.log(`[auto-generate] [${channel}] Duplicate retry returned: "${topic.substring(0, 60)}"`)
            }
          }
        }
      }

      enforceTilePattern(slides)

      // Auto-generate chart data for story-text tiles from body text
      slides.forEach((slide) => {
        if (slide.tileType === 'story-text') {
          const chart = extractChartData(slide)
          if (chart) {
            slide.chartData = chart
            console.log(`[auto-generate] [${channel}] Chart extracted for slide ${slide.num}: "${chart.title}" (${chart.items.length} items)`)
          }
        }
      })

      const headline = slides[0]?.headline || topic

      // Step 2: Extract specific image search queries using Claude
      console.log(`[auto-generate] [${channel}] Extracting image search queries...`)
      const imageQueries = await extractImageQueries(slides, channel)
      console.log(`[auto-generate] [${channel}] Image queries:`, imageQueries)

      // Step 3: Fetch images for each slide via Serper image search
      console.log(`[auto-generate] [${channel}] Fetching images for ${slides.length} slides...`)
      await Promise.all(slides.map(async (slide, slideIdx) => {
        // Solid-bg tiles never need images
        if (slide.tileType === 'brand' || slide.tileType === 'story-text' || slide.tileType === 'poll') {
          console.log(`[auto-generate] [${channel}] Skipping image for ${slide.tileType} tile (index ${slideIdx})`)
          return
        }
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
          if (!slide.image && slideIdx === 0) {
            // Hook tile: try channel-level fallback query before giving up
            const fallbackQuery = CHANNEL_FALLBACK_QUERIES[channel]
            if (fallbackQuery) {
              console.warn(`[auto-generate] [${channel}] Hook tile has no image — trying channel fallback query: "${fallbackQuery}"`)
              try {
                const fbImgRes = await fetch(`${baseUrl}/api/search-images`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: fallbackQuery, count: 5 }),
                })
                if (fbImgRes.ok) {
                  const fbImgData = await fbImgRes.json()
                  const fbUrls: string[] = (fbImgData.images || [])
                    .map((img: { url: string }) => img.url)
                    .filter((url: string) => !isBlockedImageUrl(url))
                  for (const fbUrl of fbUrls) {
                    try {
                      const fbProxyRes = await fetch(`${baseUrl}/api/fetch-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: fbUrl }),
                      })
                      if (!fbProxyRes.ok) continue
                      const fbProxyData = await fbProxyRes.json()
                      if (fbProxyData.base64) {
                        slide.image = fbProxyData.base64
                        console.log(`[auto-generate] [${channel}] Hook tile fallback image resolved via "${fallbackQuery}"`)
                        break
                      }
                    } catch {
                      continue
                    }
                  }
                }
              } catch (fbErr) {
                console.warn(`[auto-generate] [${channel}] Fallback image search failed:`, fbErr instanceof Error ? fbErr.message : fbErr)
              }
            }
            if (!slide.image) {
              // Last resort: generate with DALL-E 3
              console.warn(`[auto-generate] [${channel}] Hook tile still has no image — calling DALL-E 3`)
              try {
                const aiRes = await fetch(`${baseUrl}/api/generate-image`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ channel, topic }),
                })
                if (aiRes.ok) {
                  const aiData = await aiRes.json()
                  if (aiData.base64) {
                    slide.image = aiData.base64
                    console.log(`[auto-generate] [${channel}] Hook tile image generated by DALL-E 3`)
                    // Save AI-generated image to Drive (fire-and-forget)
                    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
                      const aiDate = new Date().toISOString().split('T')[0]
                      const aiSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
                      const aiFilename = `ai-${channel.replace(/[^a-z0-9]+/gi, '-')}-${aiSlug}-${aiDate}.jpg`
                      saveToDrive(channel, 'AI Generated', slide.image!, aiFilename)
                        .catch(e => console.warn(`[auto-generate] [${channel}] AI image Drive save failed:`, e instanceof Error ? e.message : e))
                    }
                  }
                }
              } catch (aiErr) {
                console.warn(`[auto-generate] [${channel}] DALL-E 3 fallback failed:`, aiErr instanceof Error ? aiErr.message : aiErr)
              }
              if (!slide.image) {
                console.warn(`[auto-generate] [${channel}] Hook tile has no image after all fallbacks — using solid colour`)
              }
            }
          } else if (!slide.image) {
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

      // Save hook slide to Drive image library (fire-and-forget — never blocks the pipeline)
      if (process.env.GOOGLE_DRIVE_FOLDER_ID && compositedSlides[0]?.image) {
        const driveDate = new Date().toISOString().split('T')[0]
        const driveSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
        const driveFilename = `${channel.replace(/[^a-z0-9]+/gi, '-')}-${driveSlug}-${driveDate}.jpg`
        saveToDrive(channel, 'Generated', compositedSlides[0].image, driveFilename)
          .then(id => console.log(`[auto-generate] [${channel}] Saved hook slide to Drive: ${id} (${driveFilename})`))
          .catch(e => console.warn(`[auto-generate] [${channel}] Drive save skipped:`, e instanceof Error ? e.message : e))
      }

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

      // Generate CTA
      let cta: string | undefined
      try {
        const rawCaption = compositedSlides.map(s => `${s.headline} — ${s.body}`).join('\n\n')
        const caption = rawCaption.length > 2200 ? rawCaption.slice(0, 2197) + '...' : rawCaption
        const recentCTAs = await loadRecentCTAs(channel)
        cta = await generateCTA(caption, topic, channel, recentCTAs)
        await saveRecentCTA(channel, cta)
        console.log(`[auto-generate] [${channel}] CTA: "${cta}"`)
      } catch (e) {
        console.warn(`[auto-generate] [${channel}] CTA generation failed (non-fatal):`, e instanceof Error ? e.message : e)
      }

      // Generate hashtags (non-fatal — generation continues if this fails)
      let hashtags: string[] | undefined
      try {
        hashtags = await generateHashtags(topic, channel)
        console.log(`[auto-generate] [${channel}] Hashtags (${hashtags.length}): ${hashtags.slice(0, 5).join(' ')}…`)
      } catch (e) {
        console.warn(`[auto-generate] [${channel}] Hashtag generation failed (non-fatal):`, e instanceof Error ? e.message : e)
      }

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
          cta,
          hashtags,
          contentType: activeContentType,
          pollQuestion,
          pollOptions,
        }),
      })
      const approvalData = await approvalRes.json()
      if (!approvalRes.ok) throw new Error(approvalData.error || 'Approval queue failed')

      // Track this topic to avoid repeats in future runs
      if (topic) {
        if (!usedTopics[channel]) usedTopics[channel] = []
        usedTopics[channel].push(topic)
        // Keep only the last 14 entries per channel
        if (usedTopics[channel].length > 14) {
          usedTopics[channel] = usedTopics[channel].slice(-14)
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
