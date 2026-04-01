import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })

    const openai = new OpenAI({ apiKey })
    const { slides, style = 'vintage cinematic' } = await req.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    const imagePromises = slides.map(async (slide: { headline: string; tag: string; body: string }, i: number) => {
      const prompt = `${style} photograph for a social media carousel slide. Subject: ${slide.headline.toLowerCase()}. Context: ${slide.body.slice(0, 100)}. Style: dramatic cinematic lighting, rich shadows, film grain texture, vintage color grading. Full-bleed background composition. No text, no watermarks.`
      try {
        const response = await openai.images.generate({
          model: 'dall-e-2',
          prompt,
          n: 1,
          size: '1024x1024',
        })
        return { index: i, url: response.data?.[0]?.url || null, error: null }
      } catch (err: unknown) {
        return { index: i, url: null, error: err instanceof Error ? err.message : 'Failed' }
      }
    })

    const results = await Promise.all(imagePromises)
    return NextResponse.json({ images: results })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
