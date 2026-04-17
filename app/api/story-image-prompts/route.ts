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

TASK: Read the narration sentence by sentence. Group consecutive sentences that describe the SAME moment in time into one scene. Write exactly one image prompt per scene.

IRON RULES — VIOLATIONS ARE NOT ALLOWED:
1. ONE MOMENT IN TIME PER IMAGE. NEVER put two different time periods in one image. NEVER put a young and older version of the same person in one image. Each image = one frozen moment.
2. You MUST produce between 4 and 6 prompts. Never fewer than 4.
3. Output is a JSON array of strings ONLY. No keys, no object, no markdown fences.
4. Each prompt is 2-3 sentences describing WHO + WHAT they are doing + WHERE + WHEN (era/age) + visual style.
5. SPECIFICITY: use names, ages, locations, and time periods exactly as stated in the text.
6. FORBIDDEN — combining scenes: "Earl Woods teaching young Tiger while [adult Tiger doing something else]" — this mixes two time periods. NEVER do this.
7. FORBIDDEN — generic imagery not grounded in the text.
8. End every prompt with a render cue such as "photorealistic, cinematic lighting" or "editorial illustration, dramatic shadows".

HOW TO SPLIT SCENES: when the text shifts to a different year, a different age, a different person, or a different event — that is a new scene and a new prompt.

EXAMPLE OF CORRECT OUTPUT (Tiger Woods chapter):
["Earl Woods, a middle-aged Black U.S. Army officer, crouching in a modest California garage in 1975, patiently guiding the tiny hands of his 18-month-old son around a cut-down golf club. Fluorescent workshop light. Photorealistic, warm tones.",
"A 3-year-old Tiger Woods on The Mike Douglas Show in 1978, putting against Bob Hope on a TV stage set, studio lights bright overhead, the tiny child totally focused. Cinematic, 16mm film grain.",
"A teenage Tiger Woods, around 15, alone on a sun-bleached municipal golf course in Cypress, California, mid-swing, intense concentration, late 1980s summer haze. Photorealistic, golden hour light."]`,
    messages: [
      {
        role: 'user',
        content: `Chapter ${ch.id}: "${ch.title}"

NARRATION:
${narration || '(no narration provided)'}
${visual ? `\nVISUAL DIRECTION:\n${visual}` : ''}

CHANNEL STYLE: ${styleGuide}

Step 1 — Read the narration and identify 4-6 distinct moments in time (different years, ages, events, or people).
Step 2 — For each moment write ONE prompt. Never combine two moments into one prompt.
Step 3 — Output the prompts as a JSON array of strings. Start with [`,
      },
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
