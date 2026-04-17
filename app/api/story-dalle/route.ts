import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/story-dalle
 * Body: { prompt: string, chapterId: number }
 * Returns: { imageDataUrl: string, chapterId: number, revisedPrompt?: string }
 *
 * Calls DALL-E 3 with the given prompt and returns the image as a base64 data URL.
 * Size: 1792×1024 (landscape, suits 16:9 video), quality: hd, style: vivid.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, chapterId } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    console.log(`[story-dalle] Generating for chapter ${chapterId}: "${prompt.substring(0, 100)}…"`)

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
      style: 'vivid',
      response_format: 'b64_json',
    })

    const b64 = response.data?.[0]?.b64_json
    const revisedPrompt = response.data?.[0]?.revised_prompt

    if (!b64) throw new Error('No image data returned from DALL-E')

    console.log(`[story-dalle] Chapter ${chapterId} done (${Math.round(b64.length / 1024)}KB b64)`)

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      chapterId,
      revisedPrompt,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-dalle] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
