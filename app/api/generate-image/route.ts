import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHANNEL_STYLES: Record<string, string> = {
  'Gentlemen of Fuel': 'dramatic automotive photography, dark moody lighting, luxury supercar, professional studio quality',
  'Omnira F1':         'Formula 1 racing photography, dynamic motion blur, technical precision, dramatic lighting',
  'Road & Trax':       'motorsport action photography, racing circuit, dynamic composition',
  'Omnira Football':   'football stadium atmosphere, dramatic lighting, soccer action',
  'Omnira Cricket':    'cricket stadium, dramatic sky, professional sports photography',
  'Omnira Golf':       'golf course landscape, golden hour lighting, professional photography',
  'Omnira NFL':        'American football stadium, dramatic game action, professional sports photography',
  'Omnira Food':       'gourmet food photography, professional styling, dramatic lighting',
  'Omnira Travel':     'travel destination photography, stunning landscape, golden hour',
}

const DEFAULT_STYLE = 'professional photography, dramatic lighting, high quality'

export async function POST(req: NextRequest) {
  try {
    const { channel, topic, style } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
    }

    const channelStyle = style || CHANNEL_STYLES[channel as string] || DEFAULT_STYLE
    const prompt = `${topic}. ${channelStyle}. No text overlays, no watermarks, no logos, no captions.`

    console.log(`[generate-image] channel="${channel}" prompt="${prompt.slice(0, 120)}…"`)

    const client = new OpenAI({ apiKey })
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
      response_format: 'b64_json',
    })

    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error('No image data returned from DALL-E 3')

    console.log(`[generate-image] Generated successfully for channel="${channel}"`)
    return NextResponse.json({ base64: `data:image/png;base64,${b64}` })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[generate-image] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
