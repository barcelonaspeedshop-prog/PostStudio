import Anthropic from '@anthropic-ai/sdk'
import { CHANNEL_SCORING } from '@/lib/channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type StoryScore = 'High' | 'Medium' | 'Low'

export type CurationStory = {
  id: string
  topic: string
  headline: string
  articleUrl: string
  score: StoryScore
  reason: string
  isFixture?: boolean
  fixtureDate?: string
}

export type CurationFixture = {
  event: string
  date: string
  detail?: string
  type: 'preview' | 'recap'
  priorityBoost: boolean
}

export type ChannelCurationStatus = 'pending' | 'building' | 'built' | 'skipped' | 'low-news'

export type CurationChannelQueue = {
  status: ChannelCurationStatus
  populated_at: string
  suggested_id: string | null
  stories: CurationStory[]
  fixtures?: CurationFixture[]
  lowNewsDay?: boolean
  error?: string
}

export type CurationQueue = {
  date: string
  populated_at: string
  channels: Record<string, CurationChannelQueue>
}

const HIGH_IMPORTANCE_CRITERIA: Record<string, string> = {
  'Omnira F1': 'race weekends, driver/team changes, championship implications, technical rule changes',
  'Omnira Football': 'title-deciding matches, major transfers, trophy finals, historic results',
  'Gentlemen of Fuel': 'major auction results, anniversary of iconic cars/events, concours wins, record-breaking sales',
  'Road & Trax': 'C1 championship rounds, endurance racing majors, grassroots motorsport wins',
  'Omnira Cricket': 'international fixtures, series deciders, records broken, major tournament results',
  'Omnira Golf': 'major tournaments (Masters, US Open, The Open, PGA Championship), Ryder Cup, record-breaking rounds',
  'Omnira NFL': 'gameday especially playoffs and primetime, major trades, injuries to star players',
  'Omnira Food': 'seasonal or trending food events, viral recipes, major restaurant news, Michelin awards',
  'Omnira Travel': 'seasonal timing, destination trends, breaking travel news, major tourism events',
}

const CHANNEL_TOPICS: Record<string, string> = {
  'Gentlemen of Fuel': 'classic cars, luxury cars, supercars, exotic cars, automotive, car launches, car auctions',
  'Omnira F1': 'Formula 1, F1 racing, Grand Prix, F1 driver news, F1 team news, F1 championship',
  'Road & Trax': 'motorsport, racing, rally, endurance racing, NASCAR, IndyCar, WRC, IMSA, DTM, Citroen C1 challenge',
  'Omnira Football': 'football, soccer, Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, transfer news',
  'Omnira Cricket': 'cricket, Test cricket, T20, IPL, international cricket, county cricket, ODI',
  'Omnira Golf': 'golf, PGA Tour, Masters, Ryder Cup, LIV Golf, European Tour, DP World Tour',
  'Omnira NFL': 'NFL, American football, NFL draft, NFL free agency, Super Bowl, quarterback',
  'Omnira Food': 'food, recipes, restaurants, cuisine, cooking, chefs, Michelin star, food trends, dining',
  'Omnira Travel': 'travel, destinations, tourism, adventure, hotels, flights, travel news, holiday',
}

const FIXTURE_TOPICS: Record<string, string> = {
  'Omnira F1': 'Formula 1 race schedule Grand Prix calendar next week',
  'Omnira Football': 'Premier League Champions League Europa League fixtures next week',
  'Road & Trax': 'Citroen C1 Endurance Championship motorsport events calendar',
  'Omnira Cricket': 'international cricket schedule Test T20 ODI series fixtures',
  'Omnira Golf': 'PGA Tour DP World Tour golf tournament schedule upcoming',
  'Omnira NFL': 'NFL game schedule this week upcoming games',
}

export const SPORTS_CHANNELS = new Set([
  'Omnira F1', 'Omnira Football', 'Road & Trax',
  'Omnira Cricket', 'Omnira Golf', 'Omnira NFL',
])

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

export type UnscoredStory = {
  id?: string
  topic: string
  headline: string
  articleUrl: string
}

export async function scoreStories(stories: UnscoredStory[], channel: string): Promise<CurationStory[]> {
  if (stories.length === 0) return []

  const criteria = CHANNEL_SCORING[channel]
  const highCriteria = criteria?.high ?? HIGH_IMPORTANCE_CRITERIA[channel] ?? 'breaking news, major events'
  const mediumCriteria = criteria?.medium ?? 'relevant and interesting but not top-tier'
  const lowCriteria = criteria?.low ?? 'rumours, filler, vague speculation, or duplicate angles'
  const context = criteria?.context ?? `A ${channel} social media channel.`

  const storiesPayload = stories.map((s, i) => ({
    index: i,
    topic: s.topic,
    headline: s.headline,
    articleUrl: s.articleUrl,
  }))

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are scoring news stories for the "${channel}" channel. ${context}

Score each story High, Medium, or Low based on these criteria:
- High: ${highCriteria}
- Medium: ${mediumCriteria}
- Low: ${lowCriteria}

Stories to score:
${JSON.stringify(storiesPayload, null, 2)}

Return ONLY a JSON array with one entry per story in the same order (no markdown, no backticks):
[{"index":0,"score":"High|Medium|Low","reason":"one sentence explanation"}]`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  let scored: { index: number; score: StoryScore; reason: string }[] = []
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)?.[0]
    if (match) {
      const parsed = JSON.parse(match)
      if (Array.isArray(parsed)) scored = parsed
    }
  } catch {
    console.error(`[curation] scoreStories: failed to parse response for ${channel}`)
  }

  return stories.map((s, i) => {
    const result = scored.find(r => r.index === i)
    return {
      id: s.id ?? generateId(),
      topic: s.topic,
      headline: s.headline,
      articleUrl: s.articleUrl,
      score: result?.score ?? 'Medium',
      reason: result?.reason ?? 'No reason provided',
    }
  })
}

export async function fetchCandidateStories(
  channel: string,
  today: string,
  cachedFixtures?: CurationFixture[],
): Promise<CurationChannelQueue> {
  const topicKeywords = CHANNEL_TOPICS[channel] || channel
  const highCriteria = HIGH_IMPORTANCE_CRITERIA[channel] || 'major breaking news, significant events'

  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]

  let rawStories: Omit<CurationStory, 'id'>[] = []
  let fixtures: CurationFixture[] = []

  // Use cached fixture data if available (avoids a Haiku+web_search call per sports channel)
  const fixturePromise = cachedFixtures !== undefined
    ? Promise.resolve(cachedFixtures)
    : SPORTS_CHANNELS.has(channel) ? fetchFixtures(channel, today) : Promise.resolve([])

  const [storiesResult, fixturesResult] = await Promise.allSettled([
    fetchStories(channel, topicKeywords, highCriteria, today, yesterday),
    fixturePromise,
  ])

  if (storiesResult.status === 'fulfilled') rawStories = storiesResult.value
  if (fixturesResult.status === 'fulfilled') fixtures = fixturesResult.value

  // Assign IDs
  const stories: CurationStory[] = rawStories.map(s => ({ ...s, id: generateId() }))

  // Boost stories matching upcoming priority fixtures
  for (const story of stories) {
    if (story.score !== 'High') {
      const storyLower = (story.topic + ' ' + story.headline).toLowerCase()
      for (const fixture of fixtures) {
        if (fixture.priorityBoost) {
          const keyWords = fixture.event.toLowerCase().split(/\s+/).filter(w => w.length > 3)
          if (keyWords.some(w => storyLower.includes(w))) {
            story.score = 'High'
            story.reason = `Fixture boost (${fixture.event} within 48h): ${story.reason}`
            story.isFixture = true
            story.fixtureDate = fixture.date
            break
          }
        }
      }
    }
  }

  // Sort: High → Medium → Low
  const order: Record<StoryScore, number> = { High: 0, Medium: 1, Low: 2 }
  stories.sort((a, b) => order[a.score] - order[b.score])

  const topStory = stories[0]
  const lowNewsDay = !topStory || topStory.score === 'Low'

  return {
    status: 'pending',
    populated_at: new Date().toISOString(),
    suggested_id: topStory?.id ?? null,
    stories,
    fixtures,
    lowNewsDay,
  }
}

async function fetchStories(
  channel: string,
  topicKeywords: string,
  highCriteria: string,
  today: string,
  yesterday: string,
): Promise<Omit<CurationStory, 'id'>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as never,
    messages: [{
      role: 'user',
      content: `Today is ${today}. Search for 10-15 distinct news stories published in the last 48 hours (since ${yesterday}) about: ${topicKeywords}.

Use multiple different search angles to find diverse, non-duplicate stories.

For the "${channel}" channel, score each story's importance:
- High: ${highCriteria}
- Medium: relevant and interesting but not top-tier
- Low: minor rumours, filler, clickbait, vague speculation, or duplicate angles already covered

Return ONLY a JSON array (no markdown, no backticks, no explanation):
[{"topic":"concise 15-25 word description","headline":"5-8 word headline","articleUrl":"url","score":"High|Medium|Low","reason":"one sentence explanation"}]

Sort by score (High first). Return 10-15 distinct stories. If you find fewer than 5, widen the search to 72 hours.`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)?.[0]
    if (!match) return []
    const parsed = JSON.parse(match)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is Omit<CurationStory, 'id'> =>
        typeof s.topic === 'string' &&
        typeof s.headline === 'string' &&
        typeof s.articleUrl === 'string' &&
        ['High', 'Medium', 'Low'].includes(s.score),
    )
  } catch {
    console.error(`[curation] Failed to parse stories for ${channel}`)
    return []
  }
}

async function fetchFixtures(channel: string, today: string): Promise<CurationFixture[]> {
  const nextWeekDate = new Date()
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeek = nextWeekDate.toISOString().split('T')[0]
  const topic = FIXTURE_TOPICS[channel]
  if (!topic) return []

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as never,
      messages: [{
        role: 'user',
        content: `Today is ${today}. Find upcoming ${channel} fixtures or events between now and ${nextWeek}.

Search for: ${topic}

Mark priorityBoost: true if the event is within 48 hours from now (needs preview content) OR ended within the last 24 hours (needs recap content).

Return ONLY a JSON array (no markdown):
[{"event":"event name","date":"YYYY-MM-DD","detail":"venue or matchup info","type":"preview|recap","priorityBoost":true}]

Return up to 10 fixtures. If none found, return [].`,
      }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)?.[0]
    if (!match) return []
    const parsed = JSON.parse(match)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
