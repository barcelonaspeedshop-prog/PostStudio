import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const DATA_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const USED_VIRAL_PATH = path.join(DATA_DIR, 'used-viral.json')
const MAX_USED_PER_CHANNEL = 30

const ACTIVE_CHANNELS = ['Gentlemen of Fuel', 'Omnira F1', 'Omnira Football', 'Omnira Food']

const CHANNEL_ACCENT: Record<string, string> = {
  'Gentlemen of Fuel': 'amber',
  'Omnira F1': 'red',
  'Omnira Football': 'green',
  'Omnira Food': 'teal',
}

const SLIDE_TAGS = ['THE HOOK', 'THE STORY', 'THE FACTS', 'THE IMPACT', 'THE VERDICT', 'JOIN US']
const SLIDE_BADGES = ['VIRAL PICK', 'KEY DETAIL', 'FAST FACT', 'DID YOU KNOW', 'DEBATE THIS', 'FOLLOW US']

// ─── Change 1: Era-varied search prompt rotation ──────────────────────────────
// 5 templates, each ~20% probability. Only one template searches current news.
// The other four steer Claude toward iconic/historical content.

const CHANNEL_NICHE: Record<string, string> = {
  'Gentlemen of Fuel': 'classic car',
  'Omnira F1': 'Formula 1',
  'Omnira Football': 'football',
  'Omnira Food': 'food and restaurant',
}

// Current-news fallback — used only ~20% of the time
const VIRAL_SEARCH_CURRENT: Record<string, string> = {
  'Gentlemen of Fuel':
    'classic car viral story 2025 auction record barn find shocking sale price rare discovery',
  'Omnira F1':
    'formula 1 viral debate 2025 GOAT driver controversy surprising stat fan argument',
  'Omnira Football':
    'football viral debate 2025 GOAT transfer controversy record premier league champions league',
  'Omnira Food':
    'food viral trend 2025 recipe controversy chef drama Michelin restaurant scandal',
}

type SearchPick = { query: string; eraFocused: boolean }

function pickSearchPrompt(channel: string): SearchPick {
  const niche = CHANNEL_NICHE[channel]
  const roll = Math.random()

  if (roll < 0.20) {
    // ~20% — current news (original behaviour)
    return { query: VIRAL_SEARCH_CURRENT[channel], eraFocused: false }
  } else if (roll < 0.40) {
    return { query: `iconic ${niche} marketing moments of all time`, eraFocused: true }
  } else if (roll < 0.60) {
    return { query: `most famous ${niche} campaigns of the 1990s and 2000s`, eraFocused: true }
  } else if (roll < 0.80) {
    return { query: `biggest ${niche} viral moments before 2020`, eraFocused: true }
  } else {
    return { query: `most legendary ${niche} stories of the last 40 years`, eraFocused: true }
  }
}

// ─── Output schema ────────────────────────────────────────────────────────────

const OUTPUT_SCHEMA = `{
  "campaign": {
    "title": "Short punchy campaign title (under 10 words)",
    "angle": "The specific hook that makes this shareable (1-2 sentences)",
    "why_viral": "Why this will perform strongly with this channel's audience (1-2 sentences)",
    "search_ref": "Concrete story or fact you found: include real names, dates, numbers (2-3 sentences)"
  },
  "reel_script": {
    "hook": "Opening line to grab attention in the first 2 seconds",
    "beats": [
      "Beat 1 — key point (5-10 words)",
      "Beat 2 — key point",
      "Beat 3 — key point",
      "Beat 4 — key point",
      "Beat 5 — key point"
    ],
    "cta": "End call-to-action (under 10 words)"
  },
  "carousel_tiles": [
    { "slide": 1, "headline": "Hook headline (under 8 words)", "body": "Teaser (under 20 words)" },
    { "slide": 2, "headline": "...", "body": "Context or fact (under 30 words)" },
    { "slide": 3, "headline": "...", "body": "..." },
    { "slide": 4, "headline": "...", "body": "..." },
    { "slide": 5, "headline": "...", "body": "..." },
    { "slide": 6, "headline": "CTA slide headline", "body": "Engagement prompt (under 15 words)" }
  ]
}`

// ─── Change 3: Dedup entry stores title + ref fingerprint ────────────────────
// Storing only the title allowed "same story, different headline" repeats.
// Now we store { title, ref } where ref is a 120-char fingerprint of the
// underlying story (from search_ref). The skip list passed to Claude shows
// both, so it can avoid the topic even if it would pick a new title for it.

type UsedEntry = { title: string; ref: string }
type UsedViralStore = Record<string, UsedEntry[]>

function toEntry(title: string, searchRef: string): UsedEntry {
  return { title, ref: searchRef.slice(0, 120) }
}

// Migrate legacy string[] entries to UsedEntry[] on read
function normalisedEntries(raw: unknown[]): UsedEntry[] {
  return raw.map(item =>
    typeof item === 'string'
      ? { title: item, ref: '' }
      : (item as UsedEntry)
  )
}

async function readUsedViral(): Promise<UsedViralStore> {
  try {
    if (!existsSync(USED_VIRAL_PATH)) return {}
    const raw = await readFile(USED_VIRAL_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown[]>
    const result: UsedViralStore = {}
    for (const [ch, entries] of Object.entries(parsed)) {
      result[ch] = normalisedEntries(entries)
    }
    return result
  } catch {
    return {}
  }
}

async function updateUsedViral(channel: string, title: string, searchRef: string): Promise<void> {
  try {
    const used = await readUsedViral()
    const channelUsed = used[channel] || []
    channelUsed.push(toEntry(title, searchRef))
    used[channel] = channelUsed.slice(-MAX_USED_PER_CHANNEL)
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
    await writeFile(USED_VIRAL_PATH, JSON.stringify(used, null, 2))
  } catch (e) {
    console.warn('[viral-find] Could not update used-viral.json:', e instanceof Error ? e.message : e)
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { channel: string; formats?: string[] }
    const { channel, formats = ['reel', 'carousel'] } = body

    if (!channel || !ACTIVE_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${ACTIVE_CHANNELS.join(', ')}` },
        { status: 400 }
      )
    }

    const used = await readUsedViral()
    const skipList = used[channel] || []

    // ── Change 3: skip list passes both title AND story ref to Claude ──────────
    const skipText = skipList.length > 0
      ? `\n\nDo NOT pick any of these already-used campaigns — avoid the story even if you would phrase the title differently:\n${skipList.map((e, i) =>
          `${i + 1}. Title: "${e.title}"${e.ref ? ` | Story: "${e.ref}"` : ''}`
        ).join('\n')}`
      : ''

    // ── Change 1: pick a search prompt from the era-varied rotation ────────────
    const { query: searchQuery, eraFocused } = pickSearchPrompt(channel)
    const today = new Date().toISOString().split('T')[0]

    const nicheLabel = channel.includes('F1') ? 'motorsport / Formula 1'
      : channel.includes('Football') ? 'football'
      : channel.includes('Food') ? 'food and dining'
      : 'classic and collectible cars'

    // ── Change 2: picker prompt clarifies iconic > current ─────────────────────
    const systemPrompt = `You are a viral content strategist for "${channel}", a social media channel in the ${nicheLabel} niche.

Your job: use web_search to find a specific, real topic that is emotionally resonant, debate-worthy, or genuinely legendary for this audience. Then pick the single best angle for a social media campaign.

CRITICAL CONTENT GUIDANCE:
Prefer iconic, time-tested viral moments over current news. The best picks are stories that defined an era, sparked a debate that still runs today, or captured a moment so perfect it lives on for decades.
Examples of the calibre we want:
- Burger King Moldy Whopper campaign (2020)
- Senna vs Prost Suzuka 1989 collision
- Aguero 93:20 against QPR
- Ford vs Ferrari Le Mans 1966
Avoid stories from the past 90 days unless the story is genuinely iconic and not just trending.
${eraFocused ? 'This search is specifically for historical/iconic content — lean heavily toward pre-2020 moments.' : 'You may include recent stories if they are already cementing themselves as all-time moments.'}

Other rules:
- Be concrete. Name real people, real records, real events. No vague generic topics.
- One specific angle — not a list.${skipText}

Today is ${today}.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation, no backticks:
${OUTPUT_SCHEMA}`

    const userPrompt = `Search for the best viral campaign idea for "${channel}" using this query: ${searchQuery}

Search, evaluate what you find, then pick ONE specific iconic angle. Return the JSON.`

    console.log(`[viral-find] [${channel}] era=${eraFocused} query="${searchQuery}" skip=${skipList.length}`)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    if (!rawText.trim()) {
      console.error('[viral-find] Claude returned no text. Stop reason:', message.stop_reason)
      return NextResponse.json(
        { error: 'No response text from AI — model may have only used search tool without returning output' },
        { status: 502 }
      )
    }

    let parsed: {
      campaign: { title: string; angle: string; why_viral: string; search_ref: string }
      reel_script: { hook: string; beats: string[]; cta: string }
      carousel_tiles: { slide: number; headline: string; body: string }[]
    }

    try {
      const cleaned = rawText.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, match =>
        match.replace(/```json|```/g, '').trim()
      ).trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)?.[0]
      if (!jsonMatch) throw new Error('No JSON object found in response')
      parsed = JSON.parse(jsonMatch)
      if (!parsed.campaign?.title) throw new Error('Missing campaign.title in response')
    } catch (e) {
      const parseErr = e instanceof Error ? e.message : String(e)
      console.error(`[viral-find] [${channel}] JSON parse failed (${parseErr}):`, rawText.substring(0, 400))
      return NextResponse.json(
        { error: `Failed to parse structured response: ${parseErr}`, raw: rawText.substring(0, 300) },
        { status: 502 }
      )
    }

    // ── Change 3: write title + search_ref fingerprint to skip list ────────────
    await updateUsedViral(channel, parsed.campaign.title, parsed.campaign.search_ref)
    console.log(`[viral-find] [${channel}] Picked: "${parsed.campaign.title}"`)

    // ── Save drafts to approvals queue ────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.premirafirst.com'
    const accent = CHANNEL_ACCENT[channel] || 'blue'
    const drafts: { reel?: string; carousel?: string } = {}

    if (formats.includes('carousel')) {
      try {
        const slideCount = channel === 'Omnira Food' ? 8 : undefined
        const cgRes = await fetch(`${baseUrl}/api/carousel-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: parsed.campaign.angle,
            channel,
            ...(slideCount !== undefined ? { slideCount } : {}),
            hook: parsed.carousel_tiles[0]?.headline,
          }),
        })
        if (cgRes.ok) {
          const { slides } = await cgRes.json() as { slides: unknown[] }
          const appRes = await fetch(`${baseUrl}/api/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel,
              headline: parsed.carousel_tiles[0]?.headline || parsed.campaign.title,
              topic: parsed.campaign.title,
              slides,
              platforms: channel === 'Omnira Food' ? ['instagram', 'facebook'] : ['instagram'],
              format: 'carousel',
            }),
          })
          if (appRes.ok) {
            const { id } = await appRes.json() as { id: string }
            drafts.carousel = id
            console.log(`[viral-find] [${channel}] Carousel draft saved: ${id}`)
          } else {
            console.warn(`[viral-find] [${channel}] Approvals POST failed (${appRes.status})`)
          }
        } else {
          console.warn(`[viral-find] [${channel}] carousel-generate failed (${cgRes.status})`)
        }
      } catch (e) {
        console.warn('[viral-find] carousel draft error:', e instanceof Error ? e.message : e)
      }
    }

    if (formats.includes('reel')) {
      try {
        const scriptText = [
          parsed.reel_script.hook,
          ...parsed.reel_script.beats,
          parsed.reel_script.cta,
        ].join('\n')
        const slides = [{
          num: '01',
          tag: SLIDE_TAGS[0],
          headline: parsed.reel_script.hook,
          body: parsed.reel_script.beats.join(' · '),
          badge: SLIDE_BADGES[0],
          accent,
        }]
        const appRes = await fetch(`${baseUrl}/api/approvals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            headline: parsed.reel_script.hook,
            topic: parsed.campaign.title,
            slides,
            tiktokCaption: scriptText,
            platforms: ['instagram', 'tiktok'],
            format: 'reel',
          }),
        })
        if (appRes.ok) {
          const { id } = await appRes.json() as { id: string }
          drafts.reel = id
          console.log(`[viral-find] [${channel}] Reel draft saved: ${id}`)
        } else {
          console.warn(`[viral-find] [${channel}] Reel approvals POST failed (${appRes.status})`)
        }
      } catch (e) {
        console.warn('[viral-find] reel draft error:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({
      channel,
      formats,
      campaign: parsed.campaign,
      reel_script: parsed.reel_script,
      carousel_tiles: parsed.carousel_tiles,
      drafts,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[viral-find] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
