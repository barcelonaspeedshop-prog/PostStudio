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
You write highly specific, visual prompts that describe scenes in rich detail.
Each prompt should be 40-80 words and cover: subject, composition, lighting, mood, style, colour palette.
Always respond with valid JSON only — no markdown, no backticks, no preamble.`,
      messages: [{
        role: 'user',
        content: `Generate one detailed AI image prompt for each chapter of this video script.

Video topic: "${topic || 'Unknown'}"
Channel: ${channelName}
Visual style for this channel: ${styleGuide}

Script chapters:
${chaptersText}

Return a JSON array where each object has:
- "chapterId": the chapter id number
- "prompt": the detailed image prompt (40-80 words, ready to paste into Midjourney or DALL-E 3)
- "title": the chapter title (copy from the input)

The prompt must:
1. Describe a specific visual scene — not abstract concepts
2. Specify lighting (e.g. "dramatic side lighting", "golden hour backlight")
3. Specify mood and atmosphere
4. Match the ${channelName} brand style: ${styleGuide}
5. End with rendering style cues like "cinematic, 8K, photorealistic" or "hyper-detailed illustration"

Return only the JSON array.`,
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
