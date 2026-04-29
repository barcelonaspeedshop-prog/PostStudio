import { NextRequest, NextResponse } from 'next/server'
import AdmZip from 'adm-zip'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type SlideInput = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string
  tileType?: string
}

export async function POST(req: NextRequest) {
  try {
    const { slides, channel, slug } = await req.json() as { slides: SlideInput[]; channel: string; slug?: string }

    if (!slides?.length) {
      return NextResponse.json({ error: 'slides are required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Call composite-slides to get branded JPEG frames
    const compRes = await fetch(`${baseUrl}/api/composite-slides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides, channel }),
    })

    if (!compRes.ok) {
      const err = await compRes.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || `composite-slides failed (${compRes.status})`)
    }

    const { frames } = await compRes.json() as { frames: string[] }

    if (!frames?.length) {
      throw new Error('No frames returned from composite-slides')
    }

    // Build ZIP
    const zip = new AdmZip()
    const zipName = slug
      ? `${slug}-slides`
      : (channel || 'carousel').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-slides'

    for (let i = 0; i < frames.length; i++) {
      const dataUrl = frames[i]
      const base64 = dataUrl.split(',')[1]
      if (!base64) continue
      const buffer = Buffer.from(base64, 'base64')
      zip.addFile(`slide-${i + 1}.jpg`, buffer)
    }

    const zipBuffer = zip.toBuffer()

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[export-slides]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
