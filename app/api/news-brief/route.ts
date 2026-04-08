import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, automotive',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix',
  'Road & Trax': 'motorsport, racing, rally, endurance racing, NASCAR, IndyCar',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga',
}

const VALID_CHANNELS = Object.keys(CHANNEL_TOPICS)

export const maxDuration = 120
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchArticleImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    clearTimeout(timeout)
    if (!res.ok) return null

    const html = await res.text()

    // Try og:image first (most reliable for article featured images)
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogMatch) return ogMatch[1]

    // Try twitter:image
    const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)
    if (twMatch) return twMatch[1]

    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channel, exclude_topic } = await req.json()

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    const topicKeywords = CHANNEL_TOPICS[channel]
    const today = new Date().toISOString().split('T')[0]

    // Step 1: Use Claude with web search to find today's top story
    const searchSystemPrompt = exclude_topic
      ? `You are a news researcher. You MUST NOT write about "${exclude_topic}" under any circumstances. That topic is completely banned. Find a different, unrelated story.`
      : `You are a news researcher.`

    const searchMessage = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: searchSystemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{
        role: 'user',
        content: `Search the web for the most trending or breaking news story TODAY (${today}) in ${topicKeywords}. Look for recent race results, transfers, car launches, controversies, or major breaking news.${exclude_topic ? `\n\nIMPORTANT: Do NOT write about "${exclude_topic}" under any circumstances. This topic is banned. Find a completely different, unrelated story from today's news.` : ''}

Respond with ONLY a JSON object. No explanatory text before or after. No markdown. Just the raw JSON.

The JSON object must contain:
- "topic": a concise but descriptive topic string (15-25 words) that captures the story
- "headline": a short 5-8 word headline summary
- "articleUrl": the URL of the best source article you found
- "searchTerms": an array of 5 short image search terms related to different aspects of this story (e.g. specific people, cars, teams, venues mentioned)`,
      }],
    })

    // Extract the final text response (after tool use)
    const searchText = searchMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let trend: { topic: string; headline: string; articleUrl?: string; searchTerms?: string[] }
    try {
      const cleaned = searchText.replace(/```json|```/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonMatch) throw new Error('No JSON object found in response')
      trend = JSON.parse(jsonMatch)
    } catch {
      console.error('[news-brief] Failed to parse search response:', searchText.substring(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse trending topic response from AI' },
        { status: 502, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    // Step 2: Fetch the article's featured image
    let articleImageUrl: string | null = null
    if (trend.articleUrl) {
      articleImageUrl = await fetchArticleImage(trend.articleUrl)
    }

    // Step 3: Generate the carousel slides
    const slideCount = 5
    const system = `You are a social media content expert specialising in carousel posts.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const searchTerms: string[] = trend.searchTerms || []

    const prompt = `Create a ${slideCount}-slide carousel post about: "${trend.topic}"
Channel: ${channel}

Return a JSON array of exactly ${slideCount} slide objects. Each object must have:
- "num": slide number as two-digit string e.g. "01"
- "tag": short category label in CAPS (e.g. "THE ORIGIN STORY")
- "headline": punchy headline (max 8 words)
- "body": 2-3 sentence description (max 40 words)
- "badge": short badge label in CAPS (max 5 words)
- "accent": one of these color names: "red", "amber", "blue", "green", "purple", "teal"
- "imageQuery": a specific image search term for this slide's visual (2-5 words, e.g. a specific car model, stadium, driver name)

Make slide 1 a hook/intro, slides 2-4 tell the story, slide 5 is a CTA/verdict.
Return only the JSON array, nothing else.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    let slides: Array<Record<string, unknown>>
    try {
      const cleanedSlides = text.replace(/```json|```/g, '').trim()
      const slidesMatch = cleanedSlides.match(/\[[\s\S]*\]/)?.[0]
      if (!slidesMatch) throw new Error('No JSON array found in response')
      slides = JSON.parse(slidesMatch)
    } catch {
      console.error('[news-brief] Failed to parse slides response:', text.substring(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse carousel slides from AI' },
        { status: 502, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    // Step 4: Attach article image URL to slides
    // Use the article's featured image for the first slide, and provide
    // imageQuery for all slides so the client can fetch more via Pexels/DALL-E
    if (articleImageUrl) {
      // Set the article image on slide 1 (hero/hook slide)
      if (slides[0]) {
        slides[0].imageUrl = articleImageUrl
      }
    }

    // Ensure every slide has an imageQuery even if Claude didn't provide one
    for (let i = 0; i < slides.length; i++) {
      if (!slides[i].imageQuery && searchTerms[i]) {
        slides[i].imageQuery = searchTerms[i]
      }
    }

    return NextResponse.json({
      channel,
      story: trend.headline,
      topic: trend.topic,
      articleUrl: trend.articleUrl || null,
      articleImageUrl,
      slides,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[news-brief] Error:', message)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  }
}
