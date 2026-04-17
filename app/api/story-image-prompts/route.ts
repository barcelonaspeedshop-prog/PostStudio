import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Channel-specific art direction so prompts match each brand's visual identity
const CHANNEL_STYLE: Record<string, string> = {
  'Gentlemen of Fuel':  'cinematic automotive photography, dramatic studio lighting, rich dark backgrounds, luxury feel, shallow depth of field, magazine quality',
  'Omnira F1':          'high-speed motorsport photography, motion blur, pit lane energy, cockpit close-ups, tarmac-level angles, vivid F1 team colours',
  'Road & Trax':        'raw racing action, gravel and dust, rally stages, endurance circuits, wide-angle track shots, gritty dramatic atmosphere',
  'Omnira Football':    'stadium football, dramatic floodlit action, pitch-level perspective, crowd emotion, Champions League atmosphere, vibrant jerseys',
  'Omnira Cricket':     'cricket grounds, golden-hour light on the crease, dramatic caught-behind moments, pristine white kit, heritage ground architecture',
  'Omnira Golf':        'manicured fairways, golden sunrise, dramatic bunker shots, lush green landscape, calm reflective mood, PGA Tour atmosphere',
  'Omnira NFL':         'American football action, stadium crowd energy, end-zone celebrations, aerial view of formations, dramatic twilight games',
  'Omnira Food':        'food photography, studio macro shots, steam rising, rich colour, appetising close-ups, rustic table-top styling, warm tones',
  'Omnira Travel':      'travel photography, sweeping landscapes, golden-hour light, cultural moments, vivid local colour, wide-angle destination shots',
}

export async function POST(req: NextRequest) {
  try {
    const { chapters, channel, topic } = await req.json()

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    const styleGuide = CHANNEL_STYLE[channel] || 'cinematic photography, dramatic lighting, high production value'
    const channelName = channel || 'General'

    const chaptersText = chapters
      .map((ch: { id: number; title: string; narration: string; visual: string }) =>
        `Chapter ${ch.id} — "${ch.title}"\nNarration: ${ch.narration}\nVisual direction: ${ch.visual}`
      )
      .join('\n\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `You are an expert AI image prompt writer for Midjourney and DALL-E 3.
Each prompt must describe ONE single scene for ONE chapter only — never blend multiple chapters.
Rules:
- Start with the primary subject (e.g. "A silver Ferrari 488", "A packed stadium", "A golden bowl of ramen")
- 2-3 sentences maximum — short, dense, visual
- No storytelling, no narrative, no "the chapter discusses..." — pure visual description only
- Specify: subject, setting, lighting, mood, and one style/render cue at the end
- Never reference other chapters or the overall video topic
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
      messages: [{
        role: 'user',
        content: `Generate one standalone AI image prompt per chapter. Each prompt is independent — treat every chapter in isolation.

Channel visual style: ${styleGuide}

Chapters (process each separately):
${chaptersText}

Return a JSON array where each object has:
- "chapterId": the chapter id number
- "title": the chapter title (copy exactly from input)
- "prompt": 2-3 sentence image prompt starting with the primary subject

Prompt format example:
"A lone racing driver in a red helmet crouches beside a silver F1 car on a rain-soaked pit lane. Neon reflections streak across wet tarmac under harsh floodlights. Cinematic, shallow depth of field, photorealistic, 8K."

Return only the JSON array — one object per chapter.`,
      }],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    let prompts
    try {
      prompts = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Failed to parse prompts from AI' }, { status: 502 })
    }

    return NextResponse.json({ prompts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-image-prompts] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
