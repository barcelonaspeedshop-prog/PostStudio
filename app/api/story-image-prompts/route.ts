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

/**
 * For one chapter, identify all distinct visual scenes and return one short
 * image prompt per scene (3-6 prompts depending on content richness).
 * Returns a plain JSON array of strings — no wrapping object.
 */
async function promptsForChapter(ch: ChapterInput, styleGuide: string): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: `You are an expert AI image prompt writer for Midjourney and DALL-E 3.

Your job: read a chapter's narration, identify every distinct visual scene or moment, and write one short image prompt per scene.

Rules for each prompt:
- Start with the primary subject (a specific person, object, or place — never abstract)
- 2-3 sentences only
- Pure visual description — no storytelling, no "this shows…", no narration
- Cover: subject · setting · lighting · mood · one render/style cue at the end
- Each prompt must describe a DIFFERENT scene from the others in this chapter

Output format: a JSON array of strings — nothing else. No preamble, no keys, no markdown.
Example output: ["A worn leather steering wheel...", "Two mechanics argue...", "Rain hammers a pit-lane garage..."]

Aim for 3-6 prompts depending on how many distinct scenes the chapter contains.`,
    messages: [{
      role: 'user',
      content: `Chapter: "${ch.title}"
Narration: ${ch.narration}${ch.visual ? `\nVisual direction: ${ch.visual}` : ''}
Channel visual style: ${styleGuide}

Identify all distinct visual scenes in this chapter and write one image prompt per scene.
Return a JSON array of strings.`,
    }],
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 10)
      if (valid.length > 0) return valid
    }
  } catch { /* fall through */ }

  // Fallback: treat the whole response as a single prompt
  return [raw]
}

export async function POST(req: NextRequest) {
  try {
    const { chapters, channel, topic: _topic } = await req.json()

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    const styleGuide = CHANNEL_STYLE[channel] || 'cinematic photography, dramatic lighting, high production value'

    // One parallel API call per chapter — guarantees correct chapter assignment
    const settled = await Promise.allSettled(
      (chapters as ChapterInput[]).map(ch => promptsForChapter(ch, styleGuide))
    )

    const prompts = (chapters as ChapterInput[]).map((ch, i) => {
      const result = settled[i]
      return {
        chapterId: ch.id,
        title: ch.title,
        prompts: result.status === 'fulfilled'
          ? result.value
          : [`[Failed to generate prompts for "${ch.title}"]`],
      }
    })

    const total = prompts.reduce((s, p) => s + p.prompts.length, 0)
    console.log(`[story-image-prompts] Generated ${total} prompts across ${prompts.length} chapters for "${channel}"`)
    return NextResponse.json({ prompts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-image-prompts] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
