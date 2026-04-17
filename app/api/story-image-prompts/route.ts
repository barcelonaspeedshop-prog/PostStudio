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

type ChapterInput = { id: number; title: string; narration: string; visual?: string }

// Generate one image prompt for a single chapter — called in parallel for each chapter.
async function promptForChapter(
  ch: ChapterInput,
  styleGuide: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `You are an expert AI image prompt writer for Midjourney and DALL-E 3.
Write ONE image prompt for the scene described. Rules:
- Start with the primary subject (a person, object, or place — be specific)
- 2-3 sentences only
- Pure visual description — no narrative, no "this chapter shows…"
- Include: subject, setting, lighting, mood, and a render style cue at the end
- Output ONLY the prompt text — no labels, no JSON, no preamble`,
    messages: [{
      role: 'user',
      content: `Chapter: "${ch.title}"
Narration: ${ch.narration}${ch.visual ? `\nVisual direction: ${ch.visual}` : ''}
Channel style: ${styleGuide}

Write the image prompt now.`,
    }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { chapters, channel, topic: _topic } = await req.json()

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    const styleGuide = CHANNEL_STYLE[channel] || 'cinematic photography, dramatic lighting, high production value'

    // Generate all prompts in parallel — one API call per chapter.
    // This guarantees exactly one prompt per chapter with no ID confusion.
    const settled = await Promise.allSettled(
      (chapters as ChapterInput[]).map(ch => promptForChapter(ch, styleGuide))
    )

    const prompts = (chapters as ChapterInput[]).map((ch, i) => {
      const result = settled[i]
      return {
        chapterId: ch.id,
        title: ch.title,
        prompt: result.status === 'fulfilled' ? result.value : `[Failed to generate prompt for "${ch.title}"]`,
      }
    })

    console.log(`[story-image-prompts] Generated ${prompts.length} prompts for channel "${channel}"`)
    return NextResponse.json({ prompts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-image-prompts] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
