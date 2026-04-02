import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const W = 1080
const H = 1350

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

const ACCENT_COLORS: Record<string, { bg: string; text: string }> = {
  red:    { bg: '1a0e08', text: 'c8390a' },
  amber:  { bg: '0e0c08', text: 'c87030' },
  blue:   { bg: '0c0e10', text: '185fa5' },
  green:  { bg: '0a1008', text: '2a8040' },
  purple: { bg: '0e0c14', text: '7f77dd' },
  teal:   { bg: '081010', text: '1d9e75' },
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

// Font stack that works across Docker/Alpine (fontconfig) and local dev.
// DejaVu Sans ships with most Alpine font packages; Noto Sans is another common pick.
const FONT_STACK = 'DejaVu Sans, Noto Sans, Liberation Sans, Arial, Helvetica, sans-serif'

function buildSvgOverlay(slide: {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
}): string {
  const colors = ACCENT_COLORS[slide.accent] || ACCENT_COLORS.red
  const [tr, tg, tb] = hexToRgb(colors.text)

  const tagLines = wrapText(slide.tag, 40)
  const hedLines = wrapText(slide.headline, 22)
  const bodyLines = wrapText(slide.body, 48)

  const badgeText = slide.badge
  const badgeWidth = Math.min(badgeText.length * 22 + 48, 900)

  // Calculate positions from bottom up
  const pad = 72
  const badgeH = 60
  const bodyLineH = 52
  const hedLineH = 100
  const dividerGap = 40

  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad - badgeH

  const badgeY = y
  y -= 24 + bodyH
  const bodyY = y
  y -= dividerGap
  const dividerY = y
  y -= 20 + hedH
  const hedY = y

  // Build SVG text elements
  let svgContent = ''

  // Gradient overlay (bottom)
  svgContent += `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="35%" stop-color="black" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  // Top vignette
  svgContent += `<rect width="${W}" height="180" fill="url(#topgrad)"/>`
  // Bottom gradient
  svgContent += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Slide number top left — use fill-opacity instead of rgba() for librsvg compat
  svgContent += `<text x="${pad}" y="90" font-family="${FONT_STACK}" font-size="32" fill="white" fill-opacity="0.35">${slide.num}</text>`

  // Tag
  tagLines.forEach((line, i) => {
    svgContent += `<text x="${pad}" y="${130 + i * 36}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${tr},${tg},${tb})" opacity="0.85">${escapeXml(line)}</text>`
  })

  // Headline
  hedLines.forEach((line, i) => {
    svgContent += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="88" font-weight="500" fill="white">${escapeXml(line)}</text>`
  })

  // Divider — use fill-opacity instead of rgba()
  svgContent += `<rect x="${pad}" y="${dividerY}" width="200" height="2" fill="white" fill-opacity="0.3"/>`

  // Body — use fill-opacity instead of rgba()
  bodyLines.forEach((line, i) => {
    svgContent += `<text x="${pad}" y="${bodyY + 44 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="38" fill="rgb(240,240,240)" fill-opacity="0.8">${escapeXml(line)}</text>`
  })

  // Badge background
  svgContent += `<rect x="${pad}" y="${badgeY}" width="${badgeWidth}" height="${badgeH}" rx="8" fill="rgb(${tr},${tg},${tb})" opacity="0.4"/>`
  // Badge text
  svgContent += `<text x="${pad + 20}" y="${badgeY + 40}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${tr},${tg},${tb})">${escapeXml(badgeText)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest) {
  try {
    const { slides } = await req.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    const composited = await Promise.all(slides.map(async (slide: {
      num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string
    }) => {
      const colors = ACCENT_COLORS[slide.accent] || ACCENT_COLORS.red
      const [br, bg, bb] = hexToRgb(colors.bg)

      let base: sharp.Sharp

      if (slide.image && slide.image.startsWith('data:')) {
        // Decode base64 image
        const base64Data = slide.image.replace(/^data:image\/\w+;base64,/, '')
        const imgBuffer = Buffer.from(base64Data, 'base64')
        base = sharp(imgBuffer).resize(W, H, { fit: 'cover', position: 'centre' })
      } else {
        // Solid color background
        base = sharp({
          create: { width: W, height: H, channels: 3, background: { r: br, g: bg, b: bb } }
        })
      }

      // Build SVG overlay
      const svgOverlay = buildSvgOverlay(slide)

      // Composite image + overlay
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
