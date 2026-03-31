import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const { slides, style = 'vintage cinematic' } = await req.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    // Generate images in parallel, one per slide
    const imagePromises = slides.map(async (slide: { headline: string; tag: string; body: string }, i: number) => {
      const prompt = buildImagePrompt(slide, style)
      try {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        })
        return {
          index: i,
          url: response.data?.[0]?.url || null,
          error: null,
        }
      } catch (err: unknown) {
        return {
          index: i,
          url: null,
          error: err instanceof Error ? err.message : 'Generation failed',
        }
      }
    })

    const results = await Promise.all(imagePromises)
    return NextResponse.json({ images: results })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildImagePrompt(slide: { headline: string; tag: string; body: string }, style: string): string {
  const subject = slide.headline.toLowerCase()
  const context = slide.body.slice(0, 100)

  return `${style} photograph for a social media carousel slide. 
Subject: ${subject}. 
Context: ${context}
Style: dramatic cinematic lighting, rich shadows, film grain texture, vintage color grading, wide angle composition. 
The image should work as a full-bleed background with text overlaid on top — avoid faces as the main focus, favor atmospheric and evocative scenes.
No text, no watermarks, no UI elements.`
}
