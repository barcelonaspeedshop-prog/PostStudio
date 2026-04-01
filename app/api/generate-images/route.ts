import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const CACHE_DIR = '/tmp/poststudio_image_cache'

function getCacheKey(prompt: string): string {
  return createHash('md5').update(prompt).digest('hex')
}

function getCachedImage(prompt: string): string | null {
  const key = getCacheKey(prompt)
  const cachePath = path.join(CACHE_DIR, `${key}.txt`)
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf-8')
  }
  return null
}

function setCachedImage(prompt: string, url: string): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
  const key = getCacheKey(prompt)
  const cachePath = path.join(CACHE_DIR, `${key}.txt`)
  writeFileSync(cachePath, url)
}

function buildImagePrompt(slide: { headline: string; tag: string; body: string }, style: string): string {
  const subject = slide.headline.toLowerCase()
  const context = slide.body.slice(0, 100)
  return `${style} photograph. Subject: ${subject}. Context: ${context}. Dramatic cinematic lighting, rich shadows, film grain texture, vintage color grading. Full-bleed background for text overlay. No text, no watermarks.`
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })
    }

    const { slide, slideIndex, style = 'vintage cinematic' } = await req.json()

    if (!slide) {
      return NextResponse.json({ error: 'slide is required' }, { status: 400 })
    }

    const prompt = buildImagePrompt(slide, style)

    // Check cache first
    const cached = getCachedImage(prompt)
    if (cached) {
      return NextResponse.json({ 
        index: slideIndex, 
        url: cached, 
        cached: true,
        error: null 
      })
    }

    // Generate with DALL-E 2
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-2',
        prompt,
        n: 1,
        size: '1024x1024',
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || 'DALL-E API error')
    }

    const url = data.data?.[0]?.url
    if (!url) throw new Error('No image URL returned')

    // Cache the result
    setCachedImage(prompt, url)

    return NextResponse.json({ 
      index: slideIndex, 
      url, 
      cached: false,
      error: null 
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
