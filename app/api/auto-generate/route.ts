import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string
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

  for (const channel of channels) {
    console.log(`[auto-generate] Starting: ${channel}`)
    try {
      // Step 1: Get today's news
      console.log(`[auto-generate] [${channel}] Fetching news...`)
      const newsRes = await fetch(`${baseUrl}/api/news-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, timestamp: Date.now() }),
      })
      const newsData = await newsRes.json()
      if (!newsRes.ok) throw new Error(newsData.error || 'News fetch failed')

      const slides: Slide[] = newsData.slides
      const topic: string = newsData.topic || newsData.story || ''
      const headline = slides[0]?.headline || topic

      // Step 2: Composite slides server-side
      console.log(`[auto-generate] [${channel}] Compositing ${slides.length} slides...`)
      const compRes = await fetch(`${baseUrl}/api/composite-slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides }),
      })
      const compData = await compRes.json()
      if (!compRes.ok) throw new Error(compData.error || 'Compositing failed')

      const compositedSlides = slides.map((s, i) => ({
        ...s,
        image: compData.frames[i] || s.image,
      }))

      // Step 3: Generate video
      console.log(`[auto-generate] [${channel}] Generating video...`)
      const vidRes = await fetch(`${baseUrl}/api/video-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: compositedSlides, slideDuration: 3 }),
      })
      const vidData = await vidRes.json()
      if (!vidRes.ok) throw new Error(vidData.error || 'Video export failed')

      // Step 4: Generate tags
      const ytTags = generateTags(channel, topic, slides)
      const ytTitle = headline
      const ytDescription = slides.map(s => s.headline + '\n' + s.body).join('\n\n')

      // Step 5: Add to approval queue
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
