import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const DEFAULT_VOICE_ID = 'P9S3WZL3JE8uQqgYH5B7'

export const maxDuration = 120

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

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const voice = voiceId || DEFAULT_VOICE_ID

    const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[story-voiceover] ElevenLabs error:', res.status, errorText)
      let errorMsg: string
      try {
        const errorData = JSON.parse(errorText)
        errorMsg = errorData.detail?.message || errorData.detail || errorData.error || `ElevenLabs returned ${res.status}`
      } catch {
        errorMsg = `ElevenLabs returned ${res.status}`
      }
      return NextResponse.json({ error: errorMsg }, { status: res.status })
    }

    // ElevenLabs returns raw audio bytes (mpeg by default)
    const audioBuffer = await res.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')
    const dataUrl = `data:audio/mpeg;base64,${base64}`

    return NextResponse.json({
      audio: dataUrl,
      voiceId: voice,
      characterCount: text.trim().length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[story-voiceover] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
