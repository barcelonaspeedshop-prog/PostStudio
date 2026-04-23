// Run: node scripts/test-scoring.mjs
// Requires ANTHROPIC_API_KEY in environment.

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHANNEL_SCORING = {
  'Omnira F1': {
    context: 'A Formula 1 channel covering races, drivers, teams, and championship battles.',
    high: 'Race results, qualifying/pole, championship standings shifts, confirmed driver signings or departures, major technical regulation changes, FIA rulings that affect the grid, engine/power unit news',
    medium: 'Practice session updates, mid-season car development, sponsorship announcements, driver press conference quotes, team strategy breakdowns',
    low: 'Unconfirmed rumours, minor team social content, historical throwbacks with no news hook, non-F1 motorsport unless directly related',
  },
}

const stories = [
  {
    index: 0,
    topic: 'Max Verstappen takes pole position at Monaco Grand Prix with record-breaking lap time, cementing his championship lead over rivals',
    headline: 'Verstappen smashes Monaco qualifying record',
    articleUrl: 'https://example.com/f1-monaco-pole',
  },
  {
    index: 1,
    topic: 'Red Bull Racing unveils a striking new special edition livery for the upcoming Monaco Grand Prix weekend sponsor activation',
    headline: 'Red Bull reveals glitzy Monaco livery',
    articleUrl: 'https://example.com/f1-livery',
  },
]

const channel = 'Omnira F1'
const criteria = CHANNEL_SCORING[channel]

console.log(`\nScoring ${stories.length} stories for "${channel}"...\n`)

const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 500,
  messages: [{
    role: 'user',
    content: `You are scoring news stories for the "${channel}" channel. ${criteria.context}

Score each story High, Medium, or Low based on these criteria:
- High: ${criteria.high}
- Medium: ${criteria.medium}
- Low: ${criteria.low}

Stories:
${JSON.stringify(stories, null, 2)}

Return ONLY a JSON array (no markdown, no backticks):
[{"index":0,"score":"High|Medium|Low","reason":"one sentence explanation"}]`,
  }],
})

const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
const match = text.replace(/```json|```/g, '').trim().match(/\[[\s\S]*\]/)?.[0]
const scored = JSON.parse(match)

const order = { High: 0, Medium: 1, Low: 2 }
const results = stories.map((s, i) => ({
  story: s,
  result: scored.find(r => r.index === i) ?? { score: 'Medium', reason: 'parse fallback' },
}))

for (const { story, result } of results) {
  const icon = result.score === 'High' ? '🟢' : result.score === 'Medium' ? '🟡' : '🔴'
  console.log(`${icon} [${result.score}] ${story.headline}`)
  console.log(`   ${result.reason}\n`)
}

const highCount = results.filter(r => r.result.score === 'High').length
const pass = results[0].result.score === 'High' && results[1].result.score !== 'High'
console.log(`Result: Monaco pole → ${results[0].result.score}, Livery reveal → ${results[1].result.score}`)
console.log(pass ? '✅ PASS — Monaco story scored higher than livery filler.' : '❌ FAIL — Unexpected scoring.')
