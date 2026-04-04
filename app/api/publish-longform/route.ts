import { NextRequest, NextResponse } from 'next/server'

const POSTPROXY_BASE = 'https://api.postproxy.dev'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.POSTPROXY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'POSTPROXY_API_KEY is not configured' }, { status: 500 })
    }

    const incomingForm = await req.formData()
    const videoFile = incomingForm.get('video') as File | null
    const thumbnailFile = incomingForm.get('thumbnail') as File | null
    const content = incomingForm.get('content') as string || ''
    const title = incomingForm.get('title') as string || 'Story Video'
    const platforms: string[] = JSON.parse(incomingForm.get('platforms') as string || '[]')

    if (!videoFile) {
      return NextResponse.json({ error: 'video file is required' }, { status: 400 })
    }
    if (platforms.length === 0) {
      return NextResponse.json({ error: 'at least one platform is required' }, { status: 400 })
    }

    // Build Postproxy FormData
    const formData = new FormData()
    formData.append('post[body]', content)

    for (const p of platforms) {
      formData.append('profiles[]', p)
    }

    // Attach video
    formData.append('media[]', videoFile, 'story_video.mp4')

    // Attach thumbnail for platforms that support it
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile, thumbnailFile.name)
    }

    // Platform-specific parameters
    for (const p of platforms) {
      switch (p) {
        case 'youtube':
          formData.append('platforms[youtube][title]', title.slice(0, 100))
          formData.append('platforms[youtube][privacy_status]', 'public')
          formData.append('platforms[youtube][description]', content.slice(0, 5000))
          if (thumbnailFile) {
            formData.append('platforms[youtube][thumbnail]', thumbnailFile, thumbnailFile.name)
          }
          break
        case 'facebook':
          formData.append('platforms[facebook][format]', 'reel')
          formData.append('platforms[facebook][title]', title.slice(0, 100))
          formData.append('platforms[facebook][description]', content.slice(0, 500))
          if (thumbnailFile) {
            formData.append('platforms[facebook][thumbnail]', thumbnailFile, thumbnailFile.name)
          }
          break
        case 'instagram':
          formData.append('platforms[instagram][format]', 'reel')
          break
        case 'tiktok':
          formData.append('platforms[tiktok][privacy_status]', 'PUBLIC_TO_EVERYONE')
          break
      }
    }

    // Log for debugging
    const formEntries: Record<string, string> = {}
    formData.forEach((value, key) => {
      formEntries[key] = value instanceof Blob ? `[Blob ${value.size} bytes ${value.type}]` : String(value)
    })
    console.log('[publish-longform] Sending to Postproxy:', JSON.stringify(formEntries, null, 2))

    const res = await fetch(`${POSTPROXY_BASE}/api/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    let data: Record<string, unknown>
    const responseText = await res.text()
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error('[publish-longform] Non-JSON response:', res.status, responseText)
      return NextResponse.json({ error: `Postproxy returned ${res.status}`, details: responseText }, { status: res.status })
    }

    if (!res.ok) {
      console.error('[publish-longform] Error:', res.status, JSON.stringify(data, null, 2))
      return NextResponse.json({ error: data.message || data.error || `Postproxy returned ${res.status}`, details: data }, { status: res.status })
    }

    return NextResponse.json({ id: data.id, status: data.status, platforms: data.platforms })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[publish-longform] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
