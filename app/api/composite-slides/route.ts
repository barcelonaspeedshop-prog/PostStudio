import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getChannel } from '@/lib/channels'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const W = 1080
const H = 1350
const FONT_STACK = 'DejaVu Sans, Noto Sans, Liberation Sans, Arial, Helvetica, sans-serif'

type ChartData = {
  type: string
  title: string
  items: { label: string; value: number | string; unit?: string }[]
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
  chartData?: ChartData
}

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

// ── Chart renderer (used by story-text) ────────────────────────────────────
function renderChart(
  chart: ChartData,
  padX: number,
  startY: number,
  pr: number, pg: number, pb: number,
): { svg: string; height: number } {
  let svg = ''
  let y = startY

  svg += `<text x="${padX}" y="${y}" font-family="${FONT_STACK}" font-size="26" font-weight="600" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(chart.title)}</text>`
  y += 48

  if (chart.type === 'bar') {
    const labelAreaW = 210
    const barMaxW = 560
    const barStartX = padX + labelAreaW + 20
    const rowH = 52

    const numVals = chart.items.map(item =>
      typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0
    )
    const maxVal = Math.max(...numVals, 1)

    for (let i = 0; i < chart.items.length; i++) {
      const item = chart.items[i]
      const barW = Math.max(Math.round((numVals[i] / maxVal) * barMaxW), 4)
      const displayVal = item.unit ? `${item.value} ${item.unit}` : String(item.value)

      svg += `<text x="${padX}" y="${y + 34}" font-family="${FONT_STACK}" font-size="24" fill="white" fill-opacity="0.75">${escapeXml(item.label)}</text>`
      svg += `<rect x="${barStartX}" y="${y + 14}" width="${barW}" height="24" rx="4" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.85"/>`
      svg += `<text x="${barStartX + barW + 12}" y="${y + 34}" font-family="${FONT_STACK}" font-size="22" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(displayVal)}</text>`
      y += rowH
    }
  } else {
    // Comparison: two columns side by side
    const items = chart.items.slice(0, 2)
    const colW = Math.floor((W - padX * 2) / Math.max(items.length, 1))
    items.forEach((item, i) => {
      const colX = padX + i * colW
      svg += `<text x="${colX}" y="${y + 28}" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.65" letter-spacing="1">${escapeXml(item.label.toUpperCase())}</text>`
      const valStr = item.unit ? `${item.value}${item.unit}` : String(item.value)
      svg += `<text x="${colX}" y="${y + 112}" font-family="${FONT_STACK}" font-size="80" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(valStr)}</text>`
    })
    y += 130
  }

  return { svg, height: y - startY }
}

// ── Tile 1: HOOK ────────────────────────────────────────────────────────────
// Full-bleed image. Bottom gradient 0%→90% covering bottom 55%.
// Top-left: channel badge (accent colour, small uppercase). Top-right: slide num white 30%.
// Bottom: accent tag → headline 88px/500 max 2 lines → 2px accent divider 200px → body 36px/70%.
function buildHookSvg(slide: SlideInput, primary: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const tagLines = wrapText(slide.tag, 38)
  const hedLines = wrapText(slide.headline, 13).slice(0, 2)
  const bodyLines = wrapText(slide.body, 48)

  const bodyLineH = 44
  const hedLineH = 96
  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad
  y -= bodyH
  const bodyY = y
  y -= 32
  const dividerY = y
  y -= hedH
  const hedY = y
  const tagY = hedY - 50

  const defs = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="45%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  let svg = defs
  svg += `<rect width="${W}" height="220" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Channel badge top-left
  const badgeName = escapeXml(channelName.toUpperCase())
  const badgeW = Math.min(badgeName.length * 14 + 48, 650)
  svg += `<rect x="${pad}" y="52" width="${badgeW}" height="48" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.92"/>`
  svg += `<text x="${pad + 20}" y="85" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="white" fill-opacity="1" letter-spacing="2">${badgeName}</text>`

  // Slide number top-right
  svg += `<text x="${W - pad}" y="88" font-family="${FONT_STACK}" font-size="30" fill="white" fill-opacity="0.3" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Tag above headline
  tagLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${tagY + i * 34}" font-family="${FONT_STACK}" font-size="24" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="1">${escapeXml(line)}</text>`
  })

  // Headline 88px weight 500
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="88" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Divider 200px
  svg += `<rect x="${pad}" y="${dividerY}" width="200" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`

  // Body 36px white 70%
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 38 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.7">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile 2: BRAND ───────────────────────────────────────────────────────────
// Solid channel bg — NO image ever.
// Top-centre: channel name accent 28px uppercase tracking.
// Centre: accent tag 26px + 2px accent line 180px + headline 80px/500 max 2 lines + body 36px/75% up to 8 lines.
// Bottom-centre: handle white 30%.
function buildBrandSvg(slide: SlideInput, primary: string, bg: string, channelName: string, handle: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)

  const hedLines = wrapText(slide.headline, 15).slice(0, 2)
  const bodyLines = wrapText(slide.body, 44).slice(0, 8)
  const tagLines = wrapText(slide.tag, 38)

  const hedLineH = 88
  const bodyLineH = 48
  const tagLineH = 34
  const hedH = hedLines.length * hedLineH
  const bodyH = bodyLines.length * bodyLineH
  const tagH = tagLines.length * tagLineH
  const totalH = tagH + 12 + 40 + hedH + 28 + bodyH

  const startY = Math.max((H - totalH) / 2, 180)

  let svg = ''

  // Solid background
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`

  // Channel name top-centre
  svg += `<text x="${W / 2}" y="110" font-family="${FONT_STACK}" font-size="28" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" text-anchor="middle" letter-spacing="4">${escapeXml(channelName.toUpperCase())}</text>`

  let y = startY

  // Tag label
  tagLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * tagLineH}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9" text-anchor="middle" letter-spacing="2">${escapeXml(line)}</text>`
  })
  y += tagH + 12

  // Accent line 180px
  svg += `<rect x="${W / 2 - 90}" y="${y}" width="180" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.7"/>`
  y += 40

  // Headline 80px weight 500 centred
  hedLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * hedLineH}" font-family="${FONT_STACK}" font-size="80" font-weight="500" fill="white" fill-opacity="1" text-anchor="middle">${escapeXml(line)}</text>`
  })
  y += hedH + 28

  // Body 36px white 75% centred
  bodyLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.75" text-anchor="middle">${escapeXml(line)}</text>`
  })

  // Handle bottom-centre white 30%
  svg += `<text x="${W / 2}" y="${H - 72}" font-family="${FONT_STACK}" font-size="26" fill="white" fill-opacity="0.3" text-anchor="middle" letter-spacing="1">${escapeXml(handle)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile 3: STORY ───────────────────────────────────────────────────────────
// Full-bleed image. Bottom gradient same as hook.
// Top-left: accent tag 26px. Top-right: slide num white 25%.
// Bottom: headline 96px/500 max 3 lines → 2px accent divider 160px → body 36px/65%.
function buildStorySvg(slide: SlideInput, primary: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const hedLines = wrapText(slide.headline, 11).slice(0, 3)
  const bodyLines = wrapText(slide.body, 48)

  const bodyLineH = 44
  const hedLineH = 104
  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad
  y -= bodyH
  const bodyY = y
  y -= 30
  const dividerY = y
  y -= hedH
  const hedY = y

  const defs = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="45%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  let svg = defs
  svg += `<rect width="${W}" height="200" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Tag top-left accent 26px
  svg += `<text x="${pad}" y="92" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="1">${escapeXml(slide.tag)}</text>`

  // Slide number top-right white 25%
  svg += `<text x="${W - pad}" y="92" font-family="${FONT_STACK}" font-size="30" fill="white" fill-opacity="0.25" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Headline 96px weight 500
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="96" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Divider 160px
  svg += `<rect x="${pad}" y="${dividerY}" width="160" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`

  // Body 36px white 65%
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 38 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.65">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile 4: STORY-TEXT ──────────────────────────────────────────────────────
// Solid channel bg — NO image ever.
// Top-left: accent tag 26px. Headline 72px/500 max 2 lines. 2px accent divider.
// Body 36px/75% up to 5 lines. Optional chart below body.
function buildStoryTextSvg(slide: SlideInput, primary: string, bg: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)
  const pad = 72

  const hedLines = wrapText(slide.headline, 17).slice(0, 2)
  const bodyLines = wrapText(slide.body, 46).slice(0, 5)

  const hedLineH = 80
  const bodyLineH = 44

  let svg = ''

  // Solid background
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`

  // Slide number top-right white 25%
  svg += `<text x="${W - pad}" y="88" font-family="${FONT_STACK}" font-size="30" fill="white" fill-opacity="0.25" text-anchor="end">${escapeXml(slide.num)}</text>`

  let y = 90

  // Tag top-left accent 26px
  svg += `<text x="${pad}" y="${y}" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="1">${escapeXml(slide.tag)}</text>`
  y += 64

  // Headline 72px weight 500
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${y + i * hedLineH}" font-family="${FONT_STACK}" font-size="72" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })
  y += hedLines.length * hedLineH + 24

  // Divider 160px
  svg += `<rect x="${pad}" y="${y}" width="160" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.8"/>`
  y += 48

  // Body 36px white 75%
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${y + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.75">${escapeXml(line)}</text>`
  })
  y += bodyLines.length * bodyLineH

  // Chart if present
  if (slide.chartData) {
    y += 60
    const { svg: chartSvg } = renderChart(slide.chartData, pad, y, pr, pg, pb)
    svg += chartSvg
  }

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile 5: CTA ─────────────────────────────────────────────────────────────
// Full-bleed image. Gradient same as hook. Top-left: channel badge.
// Bottom: "OUR VERDICT" accent 24px → headline 80px/500 max 2 lines → 2px divider →
// body 36px/70% → follow button (rounded rect 15% opacity fill, accent text "FOLLOW @handle") →
// tagline white 25% at bottom edge.
function buildCtaSvg(
  slide: SlideInput,
  primary: string,
  channelName: string,
  handle: string,
  tagline: string,
): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const hedLines = wrapText(slide.headline, 13).slice(0, 2)
  const bodyLines = wrapText(slide.body, 48)

  const hedLineH = 88
  const bodyLineH = 44
  const hedH = hedLines.length * hedLineH
  const bodyH = bodyLines.length * bodyLineH
  const btnH = 64
  const btnW = 440

  // Bottom-up layout
  let y = H - pad
  const taglineY = y
  y -= 40
  const btnY = y - btnH
  y = btnY - 32
  y -= bodyH
  const bodyY = y
  y -= 32
  const dividerY = y
  y -= hedH
  const hedY = y
  y -= 50
  const verdictY = y

  const defs = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="45%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  let svg = defs
  svg += `<rect width="${W}" height="220" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Channel badge top-left
  const badgeName = escapeXml(channelName.toUpperCase())
  const badgeW = Math.min(badgeName.length * 14 + 48, 650)
  svg += `<rect x="${pad}" y="52" width="${badgeW}" height="48" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.92"/>`
  svg += `<text x="${pad + 20}" y="85" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="white" fill-opacity="1" letter-spacing="2">${badgeName}</text>`

  // "OUR VERDICT" label
  svg += `<text x="${pad}" y="${verdictY}" font-family="${FONT_STACK}" font-size="24" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="3">OUR VERDICT</text>`

  // Headline 80px weight 500
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="80" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Divider 200px
  svg += `<rect x="${pad}" y="${dividerY}" width="200" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`

  // Body 36px white 70%
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 38 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.7">${escapeXml(line)}</text>`
  })

  // Follow button — rounded rect 15% opacity + accent text
  const btnX = (W - btnW) / 2
  svg += `<rect x="${btnX}" y="${btnY}" width="${btnW}" height="${btnH}" rx="32" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.15" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.6" stroke-width="2"/>`
  svg += `<text x="${W / 2}" y="${btnY + 43}" font-family="${FONT_STACK}" font-size="26" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" text-anchor="middle" letter-spacing="2">FOLLOW ${escapeXml(handle.toUpperCase())}</text>`

  // Tagline at bottom edge white 25%
  svg += `<text x="${W / 2}" y="${taglineY}" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.25" text-anchor="middle" letter-spacing="1">${escapeXml(tagline)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

function determineTileType(
  slide: SlideInput,
  index: number,
  total: number,
): 'hook' | 'brand' | 'story' | 'story-text' | 'cta' {
  if (slide.tileType) return slide.tileType
  if (index === 0) return 'hook'
  if (index === 1) return 'brand'
  if (index === total - 1) return 'cta'
  return (index - 2) % 2 === 0 ? 'story' : 'story-text'
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

      // Solid-bg tiles: never use image
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

      const svgOverlay = (() => {
        switch (tileType) {
          case 'hook': return buildHookSvg(slide, ch.primary, ch.name)
          case 'brand': return buildBrandSvg(slide, ch.primary, ch.bg, ch.name, ch.handle)
          case 'story': return buildStorySvg(slide, ch.primary)
          case 'story-text': return buildStoryTextSvg(slide, ch.primary, ch.bg)
          case 'cta': return buildCtaSvg(slide, ch.primary, ch.name, ch.handle, ch.tagline)
        }
      })()

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
