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

type FoodInfoItem = { icon: string; label: string; value: string }

type SlideInput = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  image?: string
  tileType?: 'hook' | 'brand' | 'story' | 'story-text' | 'cta' | 'food-image' | 'food-must-order' | 'food-info' | 'food-pro-tips' | 'food-magazine' | 'thumbnail' | 'find-us-map'
  channel?: string
  chartData?: ChartData
  foodDishes?: { name: string; description: string; price?: string }[]
  foodMustOrder?: { name: string; description: string; priceRange?: string }  // keep for backward compat
  foodInfoItems?: FoodInfoItem[]
  foodRestaurantName?: string
  foodProTips?: string[]
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

// Reduce font size until the longest wrapped line fits within maxWidth.
// Estimates rendered width as chars * (fontSize * 0.55). Floor: 52px.
function dynamicFontSize(text: string, maxWidth: number, baseFontSize: number): number {
  let fontSize = baseFontSize
  const minSize = 52
  while (fontSize > minSize) {
    const lines = wrapText(text, Math.floor(maxWidth / (fontSize * 0.55)))
    const longest = Math.max(...lines.map(l => l.length))
    if (longest * fontSize * 0.55 <= maxWidth) break
    fontSize -= 4
  }
  return Math.max(fontSize, minSize)
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

  svg += `<text x="${padX}" y="${y}" font-family="${FONT_STACK}" font-size="30" font-weight="600" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(chart.title)}</text>`
  y += 56

  if (chart.type === 'bar') {
    const labelAreaW = 210
    const barMaxW = 540
    const barStartX = padX + labelAreaW + 20
    const rowH = 64

    const numVals = chart.items.map(item =>
      typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0
    )
    const maxVal = Math.max(...numVals, 1)

    for (let i = 0; i < chart.items.length; i++) {
      const item = chart.items[i]
      const barW = Math.max(Math.round((numVals[i] / maxVal) * barMaxW), 4)
      const displayVal = item.unit ? `${item.value} ${item.unit}` : String(item.value)

      svg += `<text x="${padX}" y="${y + 38}" font-family="${FONT_STACK}" font-size="28" fill="white" fill-opacity="0.75">${escapeXml(item.label)}</text>`
      svg += `<rect x="${barStartX}" y="${y + 16}" width="${barW}" height="26" rx="4" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.85"/>`
      svg += `<text x="${barStartX + barW + 14}" y="${y + 38}" font-family="${FONT_STACK}" font-size="28" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(displayVal)}</text>`
      y += rowH
    }
  } else {
    // Comparison: two columns side by side
    const items = chart.items.slice(0, 2)
    const colW = Math.floor((W - padX * 2) / Math.max(items.length, 1))
    items.forEach((item, i) => {
      const colX = padX + i * colW
      svg += `<text x="${colX}" y="${y + 28}" font-family="${FONT_STACK}" font-size="24" fill="white" fill-opacity="0.65" letter-spacing="1">${escapeXml(item.label.toUpperCase())}</text>`
      const valStr = item.unit ? `${item.value}${item.unit}` : String(item.value)
      svg += `<text x="${colX}" y="${y + 100}" font-family="${FONT_STACK}" font-size="64" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(valStr)}</text>`
    })
    y += 120
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
  const hedFontSize = dynamicFontSize(slide.headline, 936, 88)
  const hedLines = wrapText(slide.headline, Math.floor(936 / (hedFontSize * 0.55)))
  const bodyLines = wrapText(slide.body, 48)

  const bodyLineH = 44
  const hedLineH = Math.round(hedFontSize * 1.09)
  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = H - pad
  y -= bodyH
  const bodyY = y
  if (bodyLines.length > 0) y -= 32
  const dividerY = y
  y -= hedH + 24
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

  // Headline dynamic font size
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Divider 200px (skip when no body)
  if (bodyLines.length > 0) {
    svg += `<rect x="${pad}" y="${dividerY}" width="200" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`
    bodyLines.forEach((line, i) => {
      svg += `<text x="${pad}" y="${bodyY + 38 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.7">${escapeXml(line)}</text>`
    })
  }

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

  const hedFontSize = dynamicFontSize(slide.headline, 900, 80)
  const hedLines = wrapText(slide.headline, Math.floor(900 / (hedFontSize * 0.55)))
  const bodyLines = wrapText(slide.body, 44).slice(0, 8)
  const tagLines = wrapText(slide.tag, 38)

  const hedLineH = Math.round(hedFontSize * 1.1)
  const bodyLineH = 62
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

  // Headline dynamic font size centred
  hedLines.forEach((line, i) => {
    svg += `<text x="${W / 2}" y="${y + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="500" fill="white" fill-opacity="1" text-anchor="middle">${escapeXml(line)}</text>`
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
function buildStorySvg(slide: SlideInput, primary: string, h: number = H): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const hedFontSize = dynamicFontSize(slide.headline, 936, 96)
  const hedLines = wrapText(slide.headline, Math.floor(936 / (hedFontSize * 0.55)))
  const bodyLines = wrapText(slide.body, 48)

  const bodyLineH = 44
  const hedLineH = Math.round(hedFontSize * 1.08)
  const bodyH = bodyLines.length * bodyLineH
  const hedH = hedLines.length * hedLineH

  let y = h - pad
  y -= bodyH
  const bodyY = y
  y -= 30
  const dividerY = y
  y -= hedH + 24
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
  svg += `<rect width="${W}" height="${h}" fill="url(#grad)"/>`

  // Tag top-left accent 26px
  svg += `<text x="${pad}" y="92" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="1">${escapeXml(slide.tag)}</text>`

  // Slide number top-right white 25%
  svg += `<text x="${W - pad}" y="92" font-family="${FONT_STACK}" font-size="30" fill="white" fill-opacity="0.25" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Headline dynamic font size
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Divider 160px
  svg += `<rect x="${pad}" y="${dividerY}" width="160" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.9"/>`

  // Body 36px white 65%
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyY + 38 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.65">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile 4: STORY-TEXT ──────────────────────────────────────────────────────
// Solid channel bg — NO image ever.
// Full-width accent bar at top (12px). All text centred horizontally.
// Tag at y=180, headline at y=280, divider below headline, body from y=520.
// Optional chart below body.
function buildStoryTextSvg(slide: SlideInput, primary: string, bg: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)
  const cx = W / 2  // horizontal centre

  const hedFontSize = dynamicFontSize(slide.headline, 900, 72)
  const hedLines = wrapText(slide.headline, Math.floor(900 / (hedFontSize * 0.55)))
  const bodyLines = wrapText(slide.body, 46).slice(0, 5)

  const hedLineH = Math.round(hedFontSize * 1.11)
  const bodyLineH = 62

  let svg = ''

  // Solid background
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`

  // Full-width accent bar at top
  svg += `<rect x="0" y="0" width="${W}" height="12" fill="rgb(${pr},${pg},${pb})" fill-opacity="1"/>`

  // Slide number top-right white 25%
  svg += `<text x="${W - 72}" y="88" font-family="${FONT_STACK}" font-size="30" fill="white" fill-opacity="0.25" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Tag centred at y=180
  svg += `<text x="${cx}" y="180" font-family="${FONT_STACK}" font-size="26" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="2" text-anchor="middle">${escapeXml(slide.tag)}</text>`

  // Headline centred starting at y=280
  hedLines.forEach((line, i) => {
    svg += `<text x="${cx}" y="${280 + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="500" fill="white" fill-opacity="1" text-anchor="middle">${escapeXml(line)}</text>`
  })

  // Divider below headline (centred 160px)
  const dividerY = 280 + hedLines.length * hedLineH + 24
  svg += `<rect x="${cx - 80}" y="${dividerY}" width="160" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.8"/>`

  // Body centred from y=520
  bodyLines.forEach((line, i) => {
    svg += `<text x="${cx}" y="${520 + i * bodyLineH}" font-family="${FONT_STACK}" font-size="36" fill="white" fill-opacity="0.75" text-anchor="middle">${escapeXml(line)}</text>`
  })

  // Chart if present — left-aligned below body to preserve readability
  if (slide.chartData) {
    const chartY = 520 + bodyLines.length * bodyLineH + 60
    const { svg: chartSvg } = renderChart(slide.chartData, 72, chartY, pr, pg, pb)
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

  const hedFontSize = dynamicFontSize(slide.headline, 936, 80)
  const hedLines = wrapText(slide.headline, Math.floor(936 / (hedFontSize * 0.55)))
  const bodyLines = wrapText(slide.body, 48)

  const hedLineH = Math.round(hedFontSize * 1.1)
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
  y -= hedH + 24
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

  // Tag label (e.g. "OUR VERDICT" or "FOLLOW FOR MORE")
  svg += `<text x="${pad}" y="${verdictY}" font-family="${FONT_STACK}" font-size="24" font-weight="500" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="3">${escapeXml((slide.tag || 'OUR VERDICT').toUpperCase())}</text>`

  // Headline dynamic font size
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedY + hedLineH + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="500" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
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

// ── Tile: FOOD-IMAGE ────────────────────────────────────────────────────────
// Full-bleed image. Tag badge at top. Headline large at bottom.
function buildFoodImageSvg(slide: SlideInput, primary: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  const tagText = escapeXml((slide.tag || channelName).toUpperCase())

  const hedFontSize = dynamicFontSize(slide.headline, W - pad * 2, 100)
  const hedLines = wrapText(slide.headline, Math.floor((W - pad * 2) / (hedFontSize * 0.55)))
  const hedLineH = Math.round(hedFontSize * 1.1)
  const hedH = hedLines.length * hedLineH
  const accentLineY = H - pad - hedH - 32
  const hedStartY = H - pad - hedH

  const defs = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="38%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.93"/>
    </linearGradient>
    <linearGradient id="topgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  let svg = defs
  svg += `<rect width="${W}" height="250" fill="url(#topgrad)"/>`
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`

  // Tag badge top-left
  const tagW = Math.min(tagText.length * 13 + 44, 720)
  svg += `<rect x="${pad}" y="52" width="${tagW}" height="46" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.92"/>`
  svg += `<text x="${pad + 18}" y="84" font-family="${FONT_STACK}" font-size="20" font-weight="700" fill="white" fill-opacity="1" letter-spacing="2">${tagText}</text>`

  // Slide number top-right subtle
  svg += `<text x="${W - pad}" y="88" font-family="${FONT_STACK}" font-size="28" fill="white" fill-opacity="0.22" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Accent rule above headline
  svg += `<rect x="${pad}" y="${accentLineY}" width="200" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.95"/>`

  // Headline — large, bold, white
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedStartY + (i + 1) * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="600" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: FOOD-MUST-ORDER ───────────────────────────────────────────────────
// Solid channel bg. Multiple dishes as stacked cards with dividers.
function buildFoodMustOrderSvg(slide: SlideInput, primary: string, bg: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)
  const pad = 80

  // Support both new foodDishes (array) and legacy foodMustOrder (single)
  const dishes: { name: string; description: string; price?: string }[] =
    slide.foodDishes && slide.foodDishes.length > 0
      ? slide.foodDishes
      : slide.foodMustOrder
        ? [{ name: slide.foodMustOrder.name, description: slide.foodMustOrder.description, price: slide.foodMustOrder.priceRange }]
        : [{ name: slide.headline, description: slide.body }]

  const numDishes = dishes.length
  const nameFontSize = numDishes >= 3 ? 56 : 64
  const descFontSize = numDishes >= 3 ? 28 : 32
  const nameLineH = Math.round(nameFontSize * 1.14)
  const descLineH = Math.round(descFontSize * 1.42)
  const maxDescLines = numDishes >= 3 ? 2 : 3

  let svg = ''
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`
  svg += `<rect x="0" y="0" width="${W}" height="12" fill="rgb(${pr},${pg},${pb})" fill-opacity="1"/>`

  // Channel name top-centre
  svg += `<text x="${W / 2}" y="88" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" text-anchor="middle" letter-spacing="4">${escapeXml(channelName.toUpperCase())}</text>`

  // "★ MUST ORDER" header
  svg += `<text x="${pad}" y="160" font-family="${FONT_STACK}" font-size="30" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="2">&#x2605; MUST ORDER</text>`

  // Full-width rule
  svg += `<rect x="${pad}" y="178" width="${W - pad * 2}" height="1.5" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.28"/>`

  let y = 218

  for (let di = 0; di < dishes.length; di++) {
    const dish = dishes[di]

    // Dish name
    const nameLines = wrapText(dish.name || '', Math.floor((W - pad * 2) / (nameFontSize * 0.55))).slice(0, 2)
    nameLines.forEach((line, li) => {
      svg += `<text x="${pad}" y="${y + li * nameLineH}" font-family="${FONT_STACK}" font-size="${nameFontSize}" font-weight="700" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
    })
    y += nameLines.length * nameLineH + 10

    // Description
    const descLines = wrapText(dish.description || '', Math.floor((W - pad * 2) / (descFontSize * 0.58))).slice(0, maxDescLines)
    descLines.forEach((line, li) => {
      svg += `<text x="${pad}" y="${y + li * descLineH}" font-family="${FONT_STACK}" font-size="${descFontSize}" fill="white" fill-opacity="0.78">${escapeXml(line)}</text>`
    })
    y += Math.max(1, descLines.length) * descLineH + 10

    // Price badge
    if (dish.price) {
      const pillW = Math.min(dish.price.length * 19 + 40, 360)
      svg += `<rect x="${pad}" y="${y}" width="${pillW}" height="44" rx="8" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.2" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.5" stroke-width="1.5"/>`
      svg += `<text x="${pad + 18}" y="${y + 29}" font-family="${FONT_STACK}" font-size="24" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">${escapeXml(dish.price)}</text>`
      y += 56
    } else {
      y += 10
    }

    // Divider between dishes (not after last)
    if (di < dishes.length - 1) {
      y += 14
      svg += `<rect x="${pad}" y="${y}" width="${W - pad * 2}" height="1" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.2"/>`
      y += 24
    }
  }

  // Footer handle
  svg += `<text x="${W - pad}" y="${H - 60}" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.2" text-anchor="end" letter-spacing="1">${escapeXml(channelName)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: FOOD-INFO ─────────────────────────────────────────────────────────
// Solid channel bg. Restaurant name large at top. Structured info rows.
function buildFoodInfoSvg(slide: SlideInput, primary: string, bg: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)
  const pad = 80

  const restName = slide.foodRestaurantName || slide.tag || slide.headline
  const items: FoodInfoItem[] = slide.foodInfoItems || []

  const nameFontSize = dynamicFontSize(restName, W - pad * 2, 60)
  const nameLines = wrapText(restName, Math.floor((W - pad * 2) / (nameFontSize * 0.55)))
  const nameLineH = Math.round(nameFontSize * 1.12)

  let svg = ''
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`
  svg += `<rect x="0" y="0" width="${W}" height="12" fill="rgb(${pr},${pg},${pb})" fill-opacity="1"/>`

  // Restaurant name
  let y = 88
  nameLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${y + i * nameLineH}" font-family="${FONT_STACK}" font-size="${nameFontSize}" font-weight="700" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })
  y += nameLines.length * nameLineH + 8

  // Accent underline for restaurant name
  svg += `<rect x="${pad}" y="${y}" width="200" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="1"/>`
  y += 20

  // "THE ESSENTIALS" label
  svg += `<text x="${pad}" y="${y}" font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="3">THE ESSENTIALS</text>`
  y += 22

  // Thin rule
  svg += `<rect x="${pad}" y="${y}" width="${W - pad * 2}" height="1" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.28"/>`
  y += 28

  // Info rows: each has a ◆ LABEL line and a value line
  for (const item of items) {
    // Label with ◆ bullet
    svg += `<text x="${pad}" y="${y}" font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="2">&#x25C6; ${escapeXml(item.label)}</text>`
    y += 26

    // Value — up to 2 lines at 34px
    const valLines = wrapText(item.value || '', Math.floor((W - pad * 2) / (34 * 0.57))).slice(0, 2)
    valLines.forEach((vl, vi) => {
      svg += `<text x="${pad + 4}" y="${y + vi * 44}" font-family="${FONT_STACK}" font-size="34" fill="white" fill-opacity="0.92">${escapeXml(vl)}</text>`
    })
    y += valLines.length * 44 + 18
  }

  // Footer strip: "FEATURED BY OMNIRA FOOD"
  const footerTop = H - 84
  svg += `<rect x="0" y="${footerTop}" width="${W}" height="84" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.1"/>`
  svg += `<rect x="0" y="${footerTop}" width="${W}" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.4"/>`
  svg += `<text x="${W / 2}" y="${footerTop + 52}" font-family="${FONT_STACK}" font-size="20" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" text-anchor="middle" letter-spacing="3">FEATURED BY ${escapeXml(channelName.toUpperCase())}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: FOOD-PRO-TIPS ─────────────────────────────────────────────────────
// Solid channel bg. "PRO TIPS" header. Numbered tips with arrow markers.
function buildFoodProTipsSvg(slide: SlideInput, primary: string, bg: string, channelName: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const [bgr, bgg, bgb] = hexToRgb(bg)
  const pad = 80

  const tips = (slide.foodProTips && slide.foodProTips.length > 0)
    ? slide.foodProTips.slice(0, 4)
    : (slide.body || '').split('\n').filter(Boolean).slice(0, 4)

  const tipFontSize = 32
  const tipLineH = 46
  const charsPerLine = Math.floor((W - pad * 2 - 52) / (tipFontSize * 0.56))

  let svg = ''
  svg += `<rect width="${W}" height="${H}" fill="rgb(${bgr},${bgg},${bgb})" fill-opacity="1"/>`
  svg += `<rect x="0" y="0" width="${W}" height="12" fill="rgb(${pr},${pg},${pb})" fill-opacity="1"/>`

  // Channel name top-centre
  svg += `<text x="${W / 2}" y="88" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" text-anchor="middle" letter-spacing="4">${escapeXml(channelName.toUpperCase())}</text>`

  // "PRO TIPS" large header
  svg += `<text x="${pad}" y="168" font-family="${FONT_STACK}" font-size="62" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="1">PRO TIPS</text>`

  // Full-width rule
  svg += `<rect x="${pad}" y="192" width="${W - pad * 2}" height="1.5" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.28"/>`

  let y = 248

  for (const tip of tips) {
    // Arrow marker
    svg += `<text x="${pad}" y="${y}" font-family="${FONT_STACK}" font-size="30" font-weight="700" fill="rgb(${pr},${pg},${pb})" fill-opacity="1">&#x25B6;</text>`

    // Tip text wrapped
    const tipLines = wrapText(tip, charsPerLine)
    tipLines.forEach((line, i) => {
      svg += `<text x="${pad + 50}" y="${y + i * tipLineH}" font-family="${FONT_STACK}" font-size="${tipFontSize}" fill="white" fill-opacity="0.9">${escapeXml(line)}</text>`
    })
    y += tipLines.length * tipLineH + 28
  }

  // Footer handle
  svg += `<text x="${W / 2}" y="${H - 60}" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.2" text-anchor="middle" letter-spacing="1">${escapeXml(channelName)}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: FOOD-MAGAZINE ─────────────────────────────────────────────────────
// Full-bleed image. Dark gradient bottom 45%. Text stack at bottom (bottom-up):
// tag (accent 22px) → headline (56px bold) → 140px accent divider → body (32px white 78%).
function buildFoodMagazineSvg(slide: SlideInput, primary: string): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 64

  const hedFontSize = 56
  const hedLineH = Math.round(hedFontSize * 1.21) // 68
  const bodyFontSize = 32
  const bodyLineH = Math.round(bodyFontSize * 1.375) // 44
  const maxW = W - pad * 2

  const hedLines = wrapText(slide.headline, Math.floor(maxW / (hedFontSize * 0.55))).slice(0, 2)
  const bodyLines = wrapText(slide.body, Math.floor(maxW / (bodyFontSize * 0.58))).slice(0, 3)

  // Bottom-up anchoring
  const tagY = H - pad  // tag baseline
  const hedLastY = tagY - 62  // last headline baseline
  const hedFirstY = hedLastY - (hedLines.length - 1) * hedLineH
  const dividerY = hedFirstY - 32
  const bodyLastY = dividerY - 32
  const bodyFirstY = bodyLastY - (bodyLines.length - 1) * bodyLineH

  const defs = `<defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="55%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0.45"/>
      <stop offset="18%" stop-color="black" stop-opacity="0"/>
    </linearGradient>
  </defs>`

  let svg = defs
  svg += `<rect width="${W}" height="${H}" fill="url(#grad)"/>`
  svg += `<rect width="${W}" height="220" fill="url(#topfade)"/>`

  // Slide number top-right
  svg += `<text x="${W - pad}" y="88" font-family="${FONT_STACK}" font-size="28" fill="white" fill-opacity="0.22" text-anchor="end">${escapeXml(slide.num)}</text>`

  // Body (32px white 78%)
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${bodyFirstY + i * bodyLineH}" font-family="${FONT_STACK}" font-size="${bodyFontSize}" fill="white" fill-opacity="0.78">${escapeXml(line)}</text>`
  })

  // Divider 140px × 2px accent
  svg += `<rect x="${pad}" y="${dividerY - 1}" width="140" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.95"/>`

  // Headline 56px bold white
  hedLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${hedFirstY + i * hedLineH}" font-family="${FONT_STACK}" font-size="${hedFontSize}" font-weight="700" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })

  // Tag label accent 22px, letter-spacing 4, uppercase
  svg += `<text x="${pad}" y="${tagY}" font-family="${FONT_STACK}" font-size="22" font-weight="600" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="4">${escapeXml((slide.tag || '').toUpperCase())}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: THUMBNAIL ─────────────────────────────────────────────────────────
// Full-bleed cover image. Subtle vignette overlay. Channel badge top-left.
// When no image: dark bg with centred upload prompt.
function buildThumbnailSvg(slide: SlideInput, primary: string, channelName: string, hasImage: boolean): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72

  let svg = ''

  if (!hasImage) {
    // Centred upload prompt
    const cx = W / 2
    const cy = H / 2
    svg += `<rect x="${cx - 4}" y="${cy - 80}" width="8" height="160" rx="4" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.35"/>`
    svg += `<rect x="${cx - 80}" y="${cy - 4}" width="160" height="8" rx="4" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.35"/>`
    svg += `<text x="${cx}" y="${cy + 120}" font-family="${FONT_STACK}" font-size="22" fill="white" fill-opacity="0.3" text-anchor="middle" letter-spacing="3">UPLOAD COVER IMAGE</text>`
  }

  // Subtle corner vignette
  svg += `<defs><radialGradient id="vignette" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.5"/></radialGradient></defs>`
  svg += `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`

  // Channel badge top-left
  const badgeName = escapeXml(channelName.toUpperCase())
  const badgeW = Math.min(badgeName.length * 14 + 48, 650)
  svg += `<rect x="${pad}" y="52" width="${badgeW}" height="48" rx="6" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.92"/>`
  svg += `<text x="${pad + 20}" y="85" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="white" fill-opacity="1" letter-spacing="2">${badgeName}</text>`

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

// ── Tile: FIND-US-MAP ────────────────────────────────────────────────────────
// Top 580px: real map image (composited externally) or dark SVG placeholder.
// Bottom 770px: dark info panel — tag, restaurant name, divider, address/hours/price.
function buildFindUsMapSvg(slide: SlideInput, primary: string, hasMapImage: boolean): string {
  const [pr, pg, pb] = hexToRgb(primary)
  const pad = 72
  const mapH = 580

  let svg = ''

  if (!hasMapImage) {
    // Dark map placeholder
    svg += `<rect width="${W}" height="${mapH}" fill="#101520"/>`
    // Grid lines
    for (let gx = 0; gx <= W; gx += 108) {
      svg += `<line x1="${gx}" y1="0" x2="${gx}" y2="${mapH}" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.07" stroke-width="1"/>`
    }
    for (let gy = 0; gy <= mapH; gy += 96) {
      svg += `<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.07" stroke-width="1"/>`
    }
    // Road lines
    svg += `<line x1="0" y1="${mapH / 2}" x2="${W}" y2="${mapH / 2}" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.18" stroke-width="2"/>`
    svg += `<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${mapH}" stroke="rgb(${pr},${pg},${pb})" stroke-opacity="0.18" stroke-width="2"/>`
    // Location pin
    const pinX = W / 2
    const pinBodyY = mapH / 2 - 60
    svg += `<circle cx="${pinX}" cy="${pinBodyY}" r="30" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.85"/>`
    svg += `<polygon points="${pinX - 10},${pinBodyY + 24} ${pinX + 10},${pinBodyY + 24} ${pinX},${pinBodyY + 52}" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.85"/>`
    svg += `<text x="${pinX}" y="${pinBodyY + 88}" font-family="${FONT_STACK}" font-size="18" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.45" text-anchor="middle" letter-spacing="3">MAP UNAVAILABLE</text>`
  }

  // Dark info panel bottom
  svg += `<rect x="0" y="${mapH}" width="${W}" height="${H - mapH}" fill="#0d0d0d" fill-opacity="0.97"/>`
  svg += `<rect x="0" y="${mapH}" width="${W}" height="3" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.7"/>`

  let y = mapH + 56

  // Tag "FIND US"
  svg += `<text x="${pad}" y="${y}" font-family="${FONT_STACK}" font-size="22" font-weight="600" fill="rgb(${pr},${pg},${pb})" fill-opacity="1" letter-spacing="4">${escapeXml((slide.tag || 'FIND US').toUpperCase())}</text>`
  y += 56

  // Restaurant name (headline) 50px bold
  const nameFontSize = 50
  const nameLineH = Math.round(nameFontSize * 1.12)
  const nameLines = wrapText(slide.headline, Math.floor((W - pad * 2) / (nameFontSize * 0.55))).slice(0, 2)
  nameLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${y + i * nameLineH}" font-family="${FONT_STACK}" font-size="${nameFontSize}" font-weight="700" fill="white" fill-opacity="1">${escapeXml(line)}</text>`
  })
  y += nameLines.length * nameLineH + 22

  // Divider 140px
  svg += `<rect x="${pad}" y="${y}" width="140" height="2" fill="rgb(${pr},${pg},${pb})" fill-opacity="0.8"/>`
  y += 30

  // Body text (address · hours · price · payment) wrapped at 28px
  const bodyFontSize = 27
  const bodyLineH = Math.round(bodyFontSize * 1.48)
  const bodyLines = wrapText(slide.body, Math.floor((W - pad * 2) / (bodyFontSize * 0.57))).slice(0, 8)
  bodyLines.forEach((line, i) => {
    svg += `<text x="${pad}" y="${y + i * bodyLineH}" font-family="${FONT_STACK}" font-size="${bodyFontSize}" fill="white" fill-opacity="0.82">${escapeXml(line)}</text>`
  })

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`
}

function determineTileType(
  slide: SlideInput,
  index: number,
  total: number,
): SlideInput['tileType'] {
  if (slide.tileType) return slide.tileType
  if (index === 0) return 'hook'
  if (index === 1) return 'brand'
  if (index === total - 1) return 'cta'
  return (index - 2) % 2 === 0 ? 'story' : 'story-text'
}

export async function POST(req: NextRequest) {
  try {
    const { slides, channel, reelMode = false } = await req.json()

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json({ error: 'slides array is required' }, { status: 400 })
    }

    // For reels, use true 9:16 canvas height. SVG overlays are still designed at H (1350px)
    // and composited at top: 0 — the extra height below is filled by the base background/image.
    const frameH = reelMode ? 1920 : H

    const ch = getChannel(channel || '')

    const composited = await Promise.all(slides.map(async (slide: SlideInput, idx: number) => {
      const tileType = determineTileType(slide, idx, slides.length)
      const [bgr, bgg, bgb] = hexToRgb(ch.bg)

      let base: sharp.Sharp
      const additionalLayers: sharp.OverlayOptions[] = []
      let hasMapImage = false

      // Solid-bg tiles: never use image
      if (tileType === 'brand' || tileType === 'story-text' || tileType === 'food-must-order' || tileType === 'food-info' || tileType === 'food-pro-tips') {
        // food-magazine, thumbnail, find-us-map are intentionally excluded — they use images
        base = sharp({
          create: { width: W, height: frameH, channels: 3, background: { r: bgr, g: bgg, b: bgb } },
        })
      } else if (tileType === 'find-us-map') {
        // find-us-map: dark base; map image (if present) composited into top 580px only
        base = sharp({
          create: { width: W, height: frameH, channels: 3, background: { r: 13, g: 13, b: 13 } },
        })
        if (slide.image && slide.image.startsWith('data:')) {
          const base64Data = slide.image.replace(/^data:image\/\w+;base64,/, '')
          const mapBuf = Buffer.from(base64Data, 'base64')
          const resizedMap = await sharp(mapBuf).resize(W, 580, { fit: 'cover', position: 'centre' }).toBuffer()
          additionalLayers.push({ input: resizedMap, top: 0, left: 0 })
          hasMapImage = true
        }
      } else if (slide.image && slide.image.startsWith('data:')) {
        const base64Data = slide.image.replace(/^data:image\/\w+;base64,/, '')
        const imgBuffer = Buffer.from(base64Data, 'base64')
        // Detect orientation to choose crop anchor:
        // portrait images (taller than wide) → crop from top third where subjects typically appear
        // landscape images (wider than tall) → crop from centre
        const meta = await sharp(imgBuffer).metadata()
        const isPortrait = (meta.height ?? 0) >= (meta.width ?? 1)
        base = sharp(imgBuffer).resize(W, frameH, { fit: 'cover', position: isPortrait ? 'top' : 'centre' })
      } else {
        base = sharp({
          create: { width: W, height: frameH, channels: 3, background: { r: bgr, g: bgg, b: bgb } },
        })
      }

      const hasImage = !!(slide.image && slide.image.startsWith('data:'))

      const svgOverlay = (() => {
        switch (tileType) {
          case 'hook': return buildHookSvg(slide, ch.primary, ch.name)
          case 'brand': return buildBrandSvg(slide, ch.primary, ch.bg, ch.name, ch.handle)
          case 'story': return buildStorySvg(slide, ch.primary, H)
          case 'story-text': return buildStoryTextSvg(slide, ch.primary, ch.bg)
          case 'cta': return buildCtaSvg(slide, ch.primary, ch.name, ch.handle, ch.tagline)
          case 'food-image': return buildFoodImageSvg(slide, ch.primary, ch.name)
          case 'food-must-order': return buildFoodMustOrderSvg(slide, ch.primary, ch.bg, ch.name)
          case 'food-info': return buildFoodInfoSvg(slide, ch.primary, ch.bg, ch.name)
          case 'food-pro-tips': return buildFoodProTipsSvg(slide, ch.primary, ch.bg, ch.name)
          case 'food-magazine': return buildFoodMagazineSvg(slide, ch.primary)
          case 'thumbnail': return buildThumbnailSvg(slide, ch.primary, ch.name, hasImage)
          case 'find-us-map': return buildFindUsMapSvg(slide, ch.primary, hasMapImage)
          default: return buildStoryTextSvg(slide, ch.primary, ch.bg)
        }
      })()

      const result = await base
        .composite([...additionalLayers, { input: Buffer.from(svgOverlay), top: 0, left: 0 }])
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
