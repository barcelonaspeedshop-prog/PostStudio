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

// ─── Channel-specific search prompts ────────────────────────────────────────
// Each prompt steers web_search toward the kinds of stories that generate
// strong debate, shareability, or emotional reaction in that channel's niche.

const VIRAL_SEARCH: Record<string, string> = {
  'Gentlemen of Fuel':
    'classic car viral story 2025 auction record barn find shocking sale price rare discovery controversy',
  'Omnira F1':
    'formula 1 viral debate 2025 GOAT driver controversy surprising stat anniversary historic moment fan argument',
  'Omnira Football':
    'football viral debate 2025 GOAT transfer controversy record premier league champions league fan argument',
  'Omnira Food':
    'food viral trend 2025 recipe controversy chef drama Michelin restaurant scandal surprising food fact',
}

// ─── Output schema passed to Claude ─────────────────────────────────────────

const OUTPUT_SCHEMA = `{
  "campaign": {
    "title": "Short punchy campaign title (under 10 words)",
    "angle": "The specific hook that makes this shareable (1-2 sentences)",
    "why_viral": "Why this will perform strongly with this channel's audience (1-2 sentences)",
    "search_ref": "Concrete story or fact you found: include real names, dates, numbers"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readUsedViral(): Promise<Record<string, string[]>> {
  try {
    if (!existsSync(USED_VIRAL_PATH)) return {}
    const raw = await readFile(USED_VIRAL_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function updateUsedViral(channel: string, campaignTitle: string): Promise<void> {
  try {
    const used = await readUsedViral()
    const channelUsed = used[channel] || []
    channelUsed.push(campaignTitle)
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
    const skipText = skipList.length > 0
      ? `\n\nIMPORTANT — do NOT pick any of these already-used campaigns (the audience has seen them):\n${skipList.map((s, i) => `${i + 1}. "${s}"`).join('\n')}`
      : ''

    const today = new Date().toISOString().split('T')[0]
    const searchQuery = VIRAL_SEARCH[channel]

    const systemPrompt = `You are a viral content strategist for "${channel}", a social media channel in the ${channel.includes('F1') ? 'motorsport' : channel.includes('Football') ? 'football' : channel.includes('Food') ? 'food' : 'classic car'} niche.

Your job: use web_search to find a specific, real topic that is currently trending, debated, or emotionally resonant for this audience. Then pick the single best angle for a social media campaign.

Rules:
- Be concrete. Name real people, real records, real events. No vague generic topics.
- Prefer recent (last 30 days) stories, but strong evergreen debates and milestone anniversaries are valid too.
- The campaign must feel fresh and timely.${skipText}

Today is ${today}.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation, no backticks:
${OUTPUT_SCHEMA}`

    const userPrompt = `Search for the best viral campaign idea for "${channel}" using this query: ${searchQuery}

Search, evaluate what you find, then pick ONE specific angle. Return the JSON.`

    console.log(`[viral-find] [${channel}] Starting search — ${skipList.length} campaigns in skip list`)

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
      console.error('[viral-find] Claude returned no text content. Stop reason:', message.stop_reason)
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

    await updateUsedViral(channel, parsed.campaign.title)
    console.log(`[viral-find] [${channel}] Picked: "${parsed.campaign.title}"`)

    return NextResponse.json({
      channel,
      formats,
      campaign: parsed.campaign,
      reel_script: parsed.reel_script,
      carousel_tiles: parsed.carousel_tiles,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[viral-find] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
