import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000 // 2s between attempts

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const { text, voiceId } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const voice = voiceId || 'v1Oa3bMmaLK6LwTzVkOy' // Default voice

    let lastError = ''
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })

        if (res.ok) {
          const audioBuffer = await res.arrayBuffer()
          const base64 = Buffer.from(audioBuffer).toString('base64')
          if (attempt > 1) {
            console.log(`[story-voiceover] Succeeded on attempt ${attempt}`)
          }
          return NextResponse.json({
            audio: `data:audio/mpeg;base64,${base64}`,
            size: audioBuffer.byteLength,
          })
        }

        const errText = await res.text()
        lastError = `ElevenLabs returned ${res.status}: ${errText.slice(0, 200)}`
        console.warn(`[story-voiceover] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError)

        // Don't retry on 4xx client errors (bad request, auth, etc.)
        if (res.status >= 400 && res.status < 500) {
          return NextResponse.json({ error: `ElevenLabs returned ${res.status}` }, { status: res.status })
        }
      } catch (fetchErr: unknown) {
        lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        console.warn(`[story-voiceover] Attempt ${attempt}/${MAX_RETRIES} network error:`, lastError)
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt) // 2s, 4s backoff
      }
    }

    console.error('[story-voiceover] All attempts failed:', lastError)
    return NextResponse.json({ error: lastError || 'ElevenLabs request failed after retries' }, { status: 502 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-voiceover]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
