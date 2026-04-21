import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getChannel } from '@/lib/channels'
import { saveToDrive } from '@/lib/drive-images'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const W = 1280
const H = 720
const FONT_STACK = 'DejaVu Sans, Noto Sans, Liberation Sans, Arial, Helvetica, sans-serif'

// Left panel width (text area) — hero image fills the rest
const TEXT_PANEL_W = 560
const TEXT_X = 60
const HERO_X = 580

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length <= maxCharsPerLine) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function dynamicFontSize(text: string, maxWidth: number, baseFontSize: number): number {
  let fontSize = baseFontSize
  const minSize = 44
  while (fontSize > minSize) {
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.56))
    const lines = wrapText(text, charsPerLine)
    const longestLine = Math.max(...lines.map(l => l.length))
    if (longestLine * fontSize * 0.56 <= maxWidth) break
    fontSize -= 4
  }
  return Math.max(fontSize, minSize)
}

function renderTitleSvg(
  title: string,
  accentWord: string,
  primaryColor: string,
  textX: number,
  startY: number,
  fontSize: number,
  maxWidth: number,
): string {
  const lineHeight = Math.round(fontSize * 1.35)
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.56))
  const lines = wrapText(title, charsPerLine)
  const accentLower = accentWord.toLowerCase().trim()
  const charW = fontSize * 0.56

  const parts: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const y = startY + i * lineHeight
    const lineLower = line.toLowerCase()
    const accentIdx = accentLower ? lineLower.indexOf(accentLower) : -1

    if (accentIdx !== -1 && accentLower) {
      const before = line.slice(0, accentIdx)
      const accent = line.slice(accentIdx, accentIdx + accentWord.length)
      const after = line.slice(accentIdx + accentWord.length)
      const beforeW = before.length * charW
      const accentW = accent.length * charW

      if (before) {
        parts.push(
          `<text x="${textX}" y="${y}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="white">${escapeXml(before)}</text>`
        )
      }
      parts.push(
        `<text x="${textX + beforeW}" y="${y}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="${primaryColor}">${escapeXml(accent)}</text>`
      )
      if (after) {
        parts.push(
          `<text x="${textX + beforeW + accentW}" y="${y}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="white">${escapeXml(after)}</text>`
        )
      }
    } else {
      parts.push(
        `<text x="${textX}" y="${y}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="800" fill="white">${escapeXml(line)}</text>`
      )
    }
  }
  return parts.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { channel, title, accentWord = '', heroImageBase64 } = body as {
      channel: string
      title: string
      accentWord?: string
      heroImageBase64?: string
    }

    if (!channel || !title) {
      return NextResponse.json({ error: 'channel and title are required' }, { status: 400 })
    }

    const cfg = getChannel(channel)
    const [br, bg, bb] = hexToRgb(cfg.bg)
    const primary = cfg.primary

    // ── Step 1: Build background ──────────────────────────────────────────────
    let base = sharp({
      create: { width: W, height: H, channels: 3, background: { r: br, g: bg, b: bb } },
    }).jpeg({ quality: 92 })

    const compositeInputs: sharp.OverlayOptions[] = []

    // ── Step 2: Hero image on right side ──────────────────────────────────────
    if (heroImageBase64) {
      const heroB64 = heroImageBase64.startsWith('data:')
        ? heroImageBase64.replace(/^data:image\/\w+;base64,/, '')
        : heroImageBase64
      try {
        const heroBuf = Buffer.from(heroB64, 'base64')
        const heroResized = await sharp(heroBuf)
          .resize(W - HERO_X, H, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 88 })
          .toBuffer()
        compositeInputs.push({ input: heroResized, left: HERO_X, top: 0 })
      } catch {
        // Hero image failed to process — skip it, render text-only
      }
    }

    // ── Step 3: SVG overlay (gradients + text) ────────────────────────────────
    const fontSize = dynamicFontSize(title, TEXT_PANEL_W - TEXT_X, 80)
    const titleStartY = 160
    const titleSvg = renderTitleSvg(title, accentWord, primary, TEXT_X, titleStartY, fontSize, TEXT_PANEL_W - TEXT_X)

    const channelNameText = cfg.name.toUpperCase()

    const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Left-to-right gradient: opaque bg → transparent — keeps text readable over hero -->
    <linearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${cfg.bg}" stop-opacity="1"/>
      <stop offset="50%"  stop-color="${cfg.bg}" stop-opacity="0.92"/>
      <stop offset="75%"  stop-color="${cfg.bg}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${cfg.bg}" stop-opacity="0"/>
    </linearGradient>
    <!-- Bottom vignette -->
    <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.55"/>
    </linearGradient>
  </defs>

  <!-- Gradient overlays -->
  <rect width="${W}" height="${H}" fill="url(#leftFade)"/>
  <rect width="${W}" height="${H}" fill="url(#bottomVignette)"/>

  <!-- Channel name (top left) -->
  <text
    x="${TEXT_X}" y="52"
    font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="${primary}"
    letter-spacing="3"
  >${escapeXml(channelNameText)}</text>

  <!-- Accent rule under channel name -->
  <rect x="${TEXT_X}" y="64" width="64" height="3" fill="${primary}" rx="1.5"/>

  <!-- Title text -->
  ${titleSvg}

  <!-- Bottom branding bar -->
  <rect x="0" y="${H - 56}" width="${W}" height="56" fill="${cfg.bg}" fill-opacity="0.88"/>
  <rect x="0" y="${H - 56}" width="5" height="56" fill="${primary}"/>
  <text
    x="22" y="${H - 20}"
    font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="white" fill-opacity="0.85"
    letter-spacing="1"
  >${escapeXml(cfg.name)}</text>
</svg>`.trim()

    compositeInputs.push({
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    })

    // ── Step 4: Composite all layers ──────────────────────────────────────────
    const pipeline = sharp({
      create: { width: W, height: H, channels: 3, background: { r: br, g: bg, b: bb } },
    })

    const jpegBuf = await pipeline
      .composite(compositeInputs)
      .jpeg({ quality: 92 })
      .toBuffer()

    const thumbnailBase64 = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`

    // ── Step 5: Save to Drive ─────────────────────────────────────────────────
    const timestamp = Date.now()
    const slug = title.slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase()
    const filename = `thumbnail_${slug}_${timestamp}.jpg`

    let driveFileId: string | null = null
    try {
      driveFileId = await saveToDrive(channel, 'AI Generated', thumbnailBase64, filename)
    } catch {
      // Drive save failed — still return the thumbnail
    }

    return NextResponse.json({ thumbnailBase64, driveFileId, filename })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Thumbnail generation failed' },
      { status: 500 }
    )
  }
}
