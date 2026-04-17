import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

async function promptsForChapter(ch: ChapterInput, styleGuide: string): Promise<string[]> {
  const narration = (ch.narration || '').trim()
  const visual = (ch.visual || '').trim()

  console.log(
    `[story-image-prompts] Chapter ${ch.id} "${ch.title}" — narration length: ${narration.length} chars, visual: ${visual.length} chars`
  )

  // Pre-fill the assistant turn with "[" to force Claude to open a JSON array immediately.
  // This is the most reliable technique for guaranteed JSON array output.
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are an image prompt writer for Midjourney and DALL-E 3.

TASK: Read the chapter narration and write 4 to 6 image prompts — one per distinct visual scene or moment.

STRICT RULES:
- You MUST return between 4 and 6 prompts. Never fewer than 4, even for short chapters.
- Output is a JSON array of strings ONLY. No keys, no wrapping object, no markdown.
- Each string is one self-contained image prompt (2-3 sentences).
- Each prompt MUST describe a different visual scene from the others.
- Every prompt must start with the main subject (a specific person, object, place).
- Include: subject · setting · lighting · mood · render style cue.
- Never narrate — describe only what would be visible in a photograph or illustration.
- If the chapter covers few topics, invent related visual scenes that would logically appear in a video about this subject.`,
    messages: [
      {
        role: 'user',
        content: `Chapter ${ch.id}: "${ch.title}"

NARRATION:
${narration || '(no narration provided)'}
${visual ? `\nVISUAL DIRECTION:\n${visual}` : ''}

CHANNEL STYLE: ${styleGuide}

Write 4-6 image prompts covering the distinct visual moments in this chapter.
Start your response with [ to open the JSON array.`,
      },
      // Pre-fill assistant response to force JSON array start
      {
        role: 'assistant',
        content: '[',
      },
    ],
  })

  // Claude's response continues from the "[" we pre-filled — prepend it back
  const continuation = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  const raw = '[' + continuation
  console.log(`[story-image-prompts] Chapter ${ch.id} raw response (${raw.length} chars): ${raw.substring(0, 300)}`)

  try {
    // Strip trailing markdown fence if present
    const cleaned = raw.replace(/```[\s\S]*$/, '').trim()
    const parsed = JSON.parse(cleaned)

    if (Array.isArray(parsed)) {
      const valid = parsed.filter((p): p is string => typeof p === 'string' && p.trim().length > 10)
      console.log(`[story-image-prompts] Chapter ${ch.id} parsed OK — ${valid.length} prompts`)
      if (valid.length > 0) return valid
    }

    console.warn(`[story-image-prompts] Chapter ${ch.id} parsed but got unexpected shape:`, typeof parsed)
  } catch (e) {
    console.warn(`[story-image-prompts] Chapter ${ch.id} JSON parse failed:`, e instanceof Error ? e.message : e)
    console.warn(`[story-image-prompts] Chapter ${ch.id} raw was:`, raw.substring(0, 500))
  }

  // Last-resort fallback: return the whole response as one prompt
  return [continuation.replace(/[\[\]"]/g, '').trim()]
}

export async function POST(req: NextRequest) {
  try {
    const { chapters, channel, topic: _topic } = await req.json()

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'chapters array is required' }, { status: 400 })
    }

    console.log(`[story-image-prompts] Received ${chapters.length} chapters for channel "${channel}"`)
    // Log each chapter's narration length so we can verify content is arriving
    ;(chapters as ChapterInput[]).forEach(ch => {
      console.log(`  ch${ch.id} "${ch.title}" narration=${ch.narration?.length ?? 0}ch`)
    })

    const styleGuide = CHANNEL_STYLE[channel] || 'cinematic photography, dramatic lighting, high production value'

    const settled = await Promise.allSettled(
      (chapters as ChapterInput[]).map(ch => promptsForChapter(ch, styleGuide))
    )

    const prompts = (chapters as ChapterInput[]).map((ch, i) => {
      const result = settled[i]
      if (result.status === 'rejected') {
        console.error(`[story-image-prompts] Chapter ${ch.id} rejected:`, result.reason)
      }
      return {
        chapterId: ch.id,
        title: ch.title,
        prompts: result.status === 'fulfilled'
          ? result.value
          : [`[Generation failed for chapter "${ch.title}"]`],
      }
    })

    const total = prompts.reduce((s, p) => s + p.prompts.length, 0)
    console.log(`[story-image-prompts] Done — ${total} prompts across ${prompts.length} chapters`)
    return NextResponse.json({ prompts })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-image-prompts] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
