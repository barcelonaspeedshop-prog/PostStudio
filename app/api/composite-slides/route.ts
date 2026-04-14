import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getChannel } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const W = 1080
const H = 1350

// Font stack that works across Docker/Alpine (fontconfig) and local dev.
const FONT_STACK = 'DejaVu Sans, Noto Sans, Liberation Sans, Arial, Helvetica, sans-serif'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function escapeXml(str: string): string {
  return str
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

type SlideInput = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string
  tileType?: 'hook' | 'brand' | 'story' | 'story-text' | 'cta'
  channel?: string
}

// ─── Tile Type 1: HOOK (slide 1) ───────────────────────────────────
// Full-bleed image, bottom 60% gradient, channel badge top-left,
// slide number top-right, tag + headline + divider + body at bottom.
function buildHookSvg(slide: SlideInput, primary: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const tagLines = wrapText(slide.tag, 40)
  const hedLines = wrapText(slide.headline, 16)
  const bodyLines = wrapText(slide.body, 46)

  const hedLineH = 100
  const bodyLineH = 52
  const dividerGap = 36

  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad
  y -= bodyH
  const bodyY = y
  y -= dividerGap
  const dividerY = y
  y -= hedH + 10
  const hedY = y

  let svg = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="40%" stop-color="black" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  svg += `<rect width="${W}" height="200" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Channel badge top-left
  const badgeName = escapeXml(channelName.toUpperCase())
  const badgeW = Math.min(badgeName.length * 18 + 60, 700)
  svg += `<rect x="${pad}" y="50" width="${badgeW}" height="52" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`
  svg += `<text x="${pad + 24}" y="84" font-family="${FONT_STACK}" font-size="24" font-weight="700" fill="white" letter-spacing="2">${badgeName}</text>`

  // Slide number top-right
  svg += `<text x="${W - pad}" y="88" font-family="${FONT_STACK}" font-size="32" fill="white" fill-opacity="0.35" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Tag above headline
  tagLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY - 20 - (tagLines.length - 1 - i) * 36}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9">${escapeXml(line)}</text>`
  })

  // Headline
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="88" font-weight="700" fill="white">${escapeXml(line)}</text>`
  })

  // Divider
  svg += `<rect x="${pad}" y="${dividerY}" width="200" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.7"/>`

  // Body
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 44 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="38" fill="rgb(240,240,240)" fill-opacity="0.8">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ─── Tile Type 2: BRAND (slide 2) ──────────────────────────────────
// NO image — solid brand bg, channel name top, centred content
// (label + line + headline + body), handle at bottom.
function buildBrandSvg(slide: SlideInput, primary: string, bg: string, channelName: string, handle: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)

  const hedLines = wrapText(slide.headline, 20)
  const bodyLines = wrapText(slide.body, 44)
  const tagLines = wrapText(slide.tag, 40)

  const hedLineH = 100
  const bodyLineH = 52
  const hedH = hedLines.length * hedLineH
  const bodyH = bodyLines.length * bodyLineH
  const tagH = tagLines.length * 36
  const totalH = tagH + 36 + 4 + 40 + hedH + 30 + bodyH

  const startY = Math.max((H - totalH) / 2, 200)

  let svg = ''

  // Full background (the base image will be solid bg, but add a subtle overlay for texture)
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})"/>`

  // Channel name top centre
  svg += `<text x="${W / 2}" y="100" font-family="${FONT_STACK}" font-size="28" font-weight="700" fill="rgb(${pr},${pg},${pb})" text-anchor="middle" letter-spacing="4">${escapeXml(channelName.toUpperCase())}</text>`

  // Slide number
  svg += `<text x="${W / 2}" y="145" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.25" text-anchor="middle">${escapeXml(slide.num)}</text>`

  let y = startY

  // Tag / label
  tagLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * 36}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.85" text-anchor="middle" letter-spacing="2">${escapeXml(line)}</text>`
  })
  y += tagH + 36

  // Accent line
  svg += `<rect x="${W / 2 - 60}" y="${y}" width="120" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.6"/>`
  y += 44

  // Headline centred
  hedLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * hedLineH}" font-family="${FONT_STACK}" font-size="88" font-weight="700" fill="white" text-anchor="middle">${escapeXml(line)}</text>`
  })
  y += hedH + 30

  // Body centred
  bodyLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * bodyLineH}" font-family="${FONT_STACK}" font-size="38" fill="rgb(240,240,240)" fill-opacity="0.75" text-anchor="middle">${escapeXml(line)}</text>`
  })

  // Handle bottom centre
  svg += `<text x="${W / 2}" y="${H - 80}" font-family="${FONT_STACK}" font-size="26" fill="white" fill-opacity="0.3" text-anchor="middle" letter-spacing="1">${escapeXml(handle)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ─── Tile Type 3: STORY (slides 3..N-1) ────────────────────────────
// Full-bleed image, bottom gradient, oversized headline (96px),
// tag top-left, divider + body below headline.
function buildStorySvg(slide: SlideInput, primary: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const hedLines = wrapText(slide.headline, 14)
  const bodyLines = wrapText(slide.body, 46)

  const hedLineH = 110
  const bodyLineH = 52
  const dividerGap = 36
  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad
  y -= bodyH
  const bodyY = y
  y -= dividerGap
  const dividerY = y
  y -= hedH + 10
  const hedY = y

  let svg = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="35%" stop-color="black" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  svg += `<rect width="${W}" height="180" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Tag top-left with accent colour
  svg += `<text x="${pad}" y="90" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9" letter-spacing="1">${escapeXml(slide.tag)}</text>`

  // Slide number top-right
  svg += `<text x="${W - pad}" y="90" font-family="${FONT_STACK}" font-size="32" fill="white" fill-opacity="0.3" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Oversized headline
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="96" font-weight="700" fill="white">${escapeXml(line)}</text>`
  })

  // Divider in accent colour
  svg += `<rect x="${pad}" y="${dividerY}" width="180" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.6"/>`

  // Body
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 44 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="38" fill="rgb(240,240,240)" fill-opacity="0.8">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ─── Tile Type 4: CTA (last slide) ────────────────────────────────
// Full-bleed image, gradient, channel badge, "OUR VERDICT" label,
// headline, follow button with accent fill.
function buildCtaSvg(slide: SlideInput, primary: string, channelName: string, handle: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const hedLines = wrapText(slide.headline, 16)
  const hedLineH = 100
  const hedH = hedLines.length * hedLineH

  let svg = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="30%" stop-color="black" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.94"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  svg += `<rect width="${W}" height="200" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Channel badge top-left
  const badgeName = escapeXml(channelName.toUpperCase())
  const badgeW = Math.min(badgeName.length * 18 + 60, 700)
  svg += `<rect x="${pad}" y="50" width="${badgeW}" height="52" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`
  svg += `<text x="${pad + 24}" y="84" font-family="${FONT_STACK}" font-size="24" font-weight="700" fill="white" letter-spacing="2">${badgeName}</text>`

  // "OUR VERDICT" label
  const verdictY = H - pad - 80 - hedH - 80
  svg += `<text x="${pad}" y="${verdictY}" font-family="${FONT_STACK}" font-size="28" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9" letter-spacing="3">OUR VERDICT</text>`

  // Headline
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${verdictY + 50 + i * hedLineH}" font-family="${FONT_STACK}" font-size="88" font-weight="700" fill="white">${escapeXml(line)}</text>`
  })

  // Follow button at bottom
  const btnW = 420
  const btnH = 64
  const btnX = (W - btnW) / 2
  const btnY = H - pad - btnH
  const btnLabel = `FOLLOW ${escapeXml(handle.toUpperCase())}`

  svg += `<rect x="${btnX}" y="${btnY}" width="${btnW}" height="${btnH}" rx="32" fill="rgb(${pr},${pg},${pb})"/>`
  svg += `<text x="${W / 2}" y="${btnY + 43}" font-family="${FONT_STACK}" font-size="24" font-weight="700" fill="white" text-anchor="middle" letter-spacing="2">${btnLabel}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

function determineTileType(slide: SlideInput, index: number, total: number): 'hook' | 'brand' | 'story' | 'story-text' | 'cta' {
  if (slide.tileType) return slide.tileType
  if (index === 0) return 'hook'
  if (index === 1) return 'brand'
  if (index === total - 1) return 'cta'
  return 'story'
}

export async function POST(req: NextRequest) {
  try {
    const { slides, channel } = await req.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    const ch = getChannel(channel || '')

    const composited = await Promise.all(slides.map(async (slide: SlideInput, idx: number) => {
      const tileType = determineTileType(slide, idx, slides.length)
      const [bgr, bgg, bgb] = hexToRgb(ch.bg)

      let base: sharp.Sharp

      // Brand and story-text tiles: always solid bg, never use image
      if (tileType === 'brand' || tileType === 'story-text') {
        base = sharp({
          create: { width: W, height: H, channels: 3, background: { r: bgr, g: bgg, b: bgb } },
        })
      } else if (slide.image && slide.image.startsWith('data:')) {
        const base64Data = slide.image.replace(/^data:image\/\w+;base64,/, '')
        const imgBuffer = Buffer.from(base64Data, 'base64')
        base = sharp(imgBuffer).resize(W, H, { fit: 'cover', position: 'centre' })
      } else {
        base = sharp({
          create: { width: W, height: H, channels: 3, background: { r: bgr, g: bgg, b: bgb } },
        })
      }

      // Build SVG overlay for this tile type
      let svgOverlay: string
      switch (tileType) {
        case 'hook':
          svgOverlay = buildHookSvg(slide, ch.primary, ch.name)
          break
        case 'brand':
          svgOverlay = buildBrandSvg(slide, ch.primary, ch.bg, ch.name, ch.handle)
          break
        case 'story-text':
          svgOverlay = buildBrandSvg(slide, primary, bg, ch.name, ch.handle)
          break
        case 'story':
          svgOverlay = buildStorySvg(slide, ch.primary)
          break
        case 'story-text':
          svgOverlay = buildBrandSvg(slide, ch.primary, ch.bg, ch.name, ch.handle)
          break
        case 'cta':
          svgOverlay = buildCtaSvg(slide, ch.primary, ch.name, ch.handle)
          break
      }

      const result = await base
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .jpeg({ quality: 92 })
        .toBuffer()

      return `data:image/jpeg;base64,${result.toString('base64')}`
    }))

    return NextResponse.json({ frames: composited })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[composite-slides]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
