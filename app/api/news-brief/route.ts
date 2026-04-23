import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function callClaudeWithRetry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  maxRetries = 3,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 529 && attempt < maxRetries) {
        console.warn(`[news-brief] Claude 529 overload, retrying in 10s (attempt ${attempt}/${maxRetries})`)
        await sleep(10000)
        continue
      }
      throw err
    }
  }
  throw new Error('Unreachable')
}

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, exotic cars, automotive, car launches, car auctions',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix, F1 driver news, F1 team news, F1 championship',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, transfer news — NOT American football, NOT NFL, NOT rugby',
  'Omnira Food': 'food, recipes, restaurants, cuisine, cooking, chefs, Michelin star, food trends, dining',
}

// 2-3 search angles per channel — tried in order if the first yields nothing
const CHANNEL_SEARCH_ANGLES: Record<string, string[]> = {
  'Gentlemen of Fuel': [
    'luxury supercar new model reveal',
    'exotic car auction sale record',
    'classic car news collector',
  ],
  'Omnira F1': [
    'Formula 1 race Grand Prix news',
    'F1 driver team announcement result',
    'Formula One qualifying championship standings',
  ],
  'Omnira Football': [
    'Premier League Champions League news',
    'soccer football transfer signing',
    'La Liga Bundesliga Serie A match result',
  ],
  'Omnira Food': [
    'restaurant chef Michelin star news',
    'food trend recipe celebrity chef',
    'dining food industry news opening',
  ],
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

function hasFreshnessMarkers(topic: string, headline: string, today: string): boolean {
  const combined = (topic + ' ' + headline).toLowerCase()
  const dateObj = new Date(today + 'T00:00:00Z')
  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const currentMonthName = monthNames[dateObj.getUTCMonth()]
  const currentYear = today.split('-')[0]
  const markers = [today, currentMonthName, currentYear, 'today', 'latest', 'breaking']
  return markers.some(m => combined.includes(m))
}

// Build the search prompt for a given attempt
function buildSearchPrompt(opts: {
  channel: string
  topicKeywords: string
  angles: string[]
  today: string
  yesterday: string
  hasExclusions: boolean
  exclusionList: string
  broadFallback: boolean
  strongFreshness?: boolean
}): string {
  const { topicKeywords, angles, today, yesterday, hasExclusions, exclusionList, broadFallback, strongFreshness } = opts
  const anglesText = angles.map((a, i) => `${i + 1}. "${a} news"`).join('\n')
  const dateWindow = broadFallback
    ? `the last 72 hours (since ${opts.yesterday})`
    : `the last 48 hours (today ${today} or yesterday ${yesterday})`
  const dateHint = broadFallback
    ? `Include date terms like "${yesterday}" or "${today}" in your searches.`
    : `Include "${today}" or "${yesterday}" in your web searches to find fresh results.`

  const freshnessBanner = strongFreshness
    ? `CRITICAL: You MUST return a story published on ${today} or ${yesterday} ONLY. Do NOT return any story from before ${yesterday}. If your first search returns old results, search again with "${today}" or "${yesterday}" explicitly in the query. Reject any article whose publish date is earlier than ${yesterday}.`
    : ''

  return `Today is ${today}. Find a news story published in ${dateWindow} about: ${topicKeywords}.

Try these search angles in order — use whichever finds the most recent story:
${anglesText}

${dateHint}
${freshnessBanner ? `\n${freshnessBanner}\n` : ''}${hasExclusions ? `\nYou MUST NOT cover any of these topics:\n${exclusionList}\nFind a completely different story.\n` : ''}
If you genuinely cannot find any story from the last ${broadFallback ? '72' : '48'} hours, respond with ONLY this JSON:
{"topic":"no news found","headline":"No story available","articleUrl":"","searchTerms":[]}

Otherwise respond with ONLY a JSON object (no markdown, no extra text):
- "topic": concise descriptive topic string (15-25 words)
- "headline": short 5-8 word headline
- "articleUrl": URL of the best source article
- "searchTerms": array of 5 specific image search terms (player names, team names, venues, car models)`
}

function isNoNewsResponse(topic: string): boolean {
  const t = (topic || '').toLowerCase().trim()
  if (!t || t.length < 10) return true
  const patterns = [
    'no news found', 'no story available', 'no stories', 'nothing found',
    'no results', 'no articles', 'no recent', 'no coverage', 'no updates',
    'could not find', 'unable to find', 'no fresh news', 'story not found',
    'no news available',
  ]
  return patterns.some(p => t.includes(p))
}

async function searchForNews(opts: {
  channel: string
  topicKeywords: string
  angles: string[]
  today: string
  yesterday: string
  hasExclusions: boolean
  exclusionList: string
  excludeTopics: string[]
  broadFallback: boolean
  strongFreshness?: boolean
}): Promise<{ topic: string; headline: string; articleUrl?: string; searchTerms?: string[] } | null> {
  const systemPrompt = opts.hasExclusions
    ? `You are a news researcher. You MUST NOT cover any of the following topics:\n${opts.exclusionList}\nFind a completely different story about different people, teams, and events.`
    : `You are a news researcher.`

  const userContent = buildSearchPrompt(opts)

  const searchMessage = await callClaudeWithRetry({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    messages: [{ role: 'user', content: userContent }],
  })

  const searchText = searchMessage.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const cleaned = searchText.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch)
    if (isNoNewsResponse(parsed.topic)) return null
    return parsed
  } catch {
    console.error('[news-brief] Failed to parse search response:', searchText.substring(0, 300))
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channel, exclude_topic, exclude_topics: rawExcludeTopics, preSelected } = await req.json()
    // Support both single exclude_topic (legacy) and exclude_topics array
    const exclude_topics: string[] = Array.isArray(rawExcludeTopics)
      ? rawExcludeTopics
      : exclude_topic ? [exclude_topic] : []

    console.log(`[news-brief] [${channel}] Received — preSelected type: ${typeof preSelected}, value: ${JSON.stringify(preSelected)?.substring(0, 200)}`)

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    let trend: { topic: string; headline: string; articleUrl?: string; searchTerms?: string[] } | null = null

    if (preSelected?.topic) {
      // Use pre-selected story from curation queue — skip web search entirely
      console.log(`[news-brief] [${channel}] TAKING PRESELECTED PATH: topic="${preSelected.topic}" headline="${preSelected.headline}"`)
      trend = {
        topic: preSelected.topic,
        headline: preSelected.headline || preSelected.topic.split(/\s+/).slice(0, 6).join(' '),
        articleUrl: preSelected.articleUrl || '',
        searchTerms: [],
      }
    } else {
      console.log(`[news-brief] [${channel}] TAKING WEB SEARCH PATH — preSelected was: ${JSON.stringify(preSelected)?.substring(0, 100)}`)
      const topicKeywords = CHANNEL_TOPICS[channel]
      const angles = CHANNEL_SEARCH_ANGLES[channel] || [topicKeywords]
      const today = new Date().toISOString().split('T')[0]
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = yesterdayDate.toISOString().split('T')[0]

      const hasExclusions = exclude_topics.length > 0
      const exclusionList = exclude_topics.map((t, i) => `${i + 1}. "${t}"`).join('\n')

      const searchOpts = { channel, topicKeywords, angles, today, yesterday, hasExclusions, exclusionList, excludeTopics: exclude_topics }

      // Attempt 1: last 48 hours with channel-specific search angles
      console.log(`[news-brief] [${channel}] Attempt 1 — 48h window, ${angles.length} angles`)
      trend = await searchForNews({ ...searchOpts, broadFallback: false })

      // Freshness verification: if topic lacks current-date markers, retry with stronger prompt
      if (trend && !hasFreshnessMarkers(trend.topic, trend.headline || '', today)) {
        console.warn(`[news-brief] [${channel}] Topic "${trend.topic.substring(0, 60)}" lacks freshness markers — retrying with strong freshness prompt`)
        const freshnessRetry = await searchForNews({ ...searchOpts, broadFallback: false, strongFreshness: true })
        if (freshnessRetry) {
          trend = freshnessRetry
          console.log(`[news-brief] [${channel}] Freshness retry returned: "${trend.topic.substring(0, 60)}"`)
        }
      }

      // Attempt 2: widen to 72 hours with broader terms if first attempt found nothing
      if (!trend) {
        console.warn(`[news-brief] [${channel}] Attempt 1 returned no news — retrying with 72h window`)
        trend = await searchForNews({ ...searchOpts, broadFallback: true })
      }

      if (!trend) {
        console.warn(`[news-brief] [${channel}] Both attempts returned no news`)
        return NextResponse.json(
          { error: 'No fresh news found for this channel today' },
          { status: 503, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        )
      }
    }

    // Step 2: Fetch the article's featured image
    let articleImageUrl: string | null = null
    if (trend.articleUrl) {
      articleImageUrl = await fetchArticleImage(trend.articleUrl)
    }

    // Step 3: Generate the carousel slides
    const system = `You are a social media content expert specialising in carousel posts.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`

    const searchTerms: string[] = trend.searchTerms || []

    const prompt = `Create a carousel post about: "${trend.topic}"
Channel: ${channel}

Generate between 6 and 10 slides. Use more slides (8-10) for complex stories with many facts and stats; use fewer (6-7) for simpler stories.

Return a JSON array of slide objects. Each object must have:
- "num": slide number as two-digit string e.g. "01"
- "tag": short category label in CAPS (e.g. "THE ORIGIN STORY")
- "headline": punchy headline (max 8 words)
- "body": description text (see body length rules below)
- "badge": short badge label in CAPS (max 5 words)
- "accent": one of these color names: "red", "amber", "blue", "green", "purple", "teal"
- "imageQuery": a specific image search term for this slide's visual (2-5 words, e.g. a specific car model, stadium, driver name)

Body length rules:
- Slide 1 (hook intro): teaser that grabs attention immediately, max 20 words
- Slide 2 (brand context): 5-7 sentences, 80-120 words — full editorial background on this specific story. Real journalism: context, history, stakes, and significance. NOT generic channel promo.
- All other slides: 2-3 sentences, max 40 words — specific facts and details from the story

For every second middle slide (specifically slides at 1-indexed positions 4, 6, and 8 when they exist), you MAY include an optional "chartData" field if the story contains genuine, specific statistics worth visualising. Never include fabricated data. Only add this when real numbers exist. When included, use this structure:
{ "type": "bar", "title": "Brief descriptive title", "items": [{ "label": "Team A", "value": 71, "unit": "pts" }] }
Use "type": "comparison" for head-to-head two-item comparisons.

Make slide 1 an attention-grabbing hook, slide 2 a deep-dive brand context slide, middle slides narrative story beats each covering a specific aspect or fact, and the last slide a verdict/CTA.
Return only the JSON array, nothing else.`

    const message = await callClaudeWithRetry({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
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
