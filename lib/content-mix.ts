import Anthropic from '@anthropic-ai/sdk'

export type ContentType = 'news' | 'stats' | 'quiz' | 'history' | 'tips'

// Day-of-week schedule (0=Sun, 1=Mon, ..., 6=Sat)
const DOW_CONTENT: Record<number, ContentType> = {
  1: 'news',     // Monday
  2: 'stats',    // Tuesday
  3: 'news',     // Wednesday
  4: 'quiz',     // Thursday
  5: 'news',     // Friday
  6: 'history',  // Saturday
  0: 'tips',     // Sunday
}

export function getContentTypeForDay(date?: Date): ContentType {
  const d = date || new Date()
  return DOW_CONTENT[d.getDay()] ?? 'news'
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news:    '📰 News',
  stats:   '📊 Stats',
  quiz:    '❓ Quiz',
  history: '📅 History',
  tips:    '💡 Tips',
}

export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  news:    'bg-blue-50 text-blue-600 border-blue-200',
  stats:   'bg-purple-50 text-purple-600 border-purple-200',
  quiz:    'bg-amber-50 text-amber-600 border-amber-200',
  history: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  tips:    'bg-rose-50 text-rose-600 border-rose-200',
}

export type ContentMixConfig = {
  quizTopics: string[]
  tipsTopics: string[]
  historyTopics: string[]
  statsSubjects: string[]
}

export type Slide = {
  num: string
  tag: string
  headline: string
  body: string
  badge: string
  accent: string
  tileType?: string
  pollOptions?: string[]
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Quiz generator ────────────────────────────────────────────────────────────

export async function generateQuizSlides(
  channel: string,
  topics: string[],
  primary: string,
): Promise<{ slides: Slide[]; topic: string }> {
  const subject = pickRandom(topics)

  const prompt = `You are a social media content creator for "${channel}".
Create a 5-slide QUIZ carousel about: "${subject}"

Return a JSON object with:
{
  "topic": "short topic label (max 8 words)",
  "slides": [
    {
      "num": "1",
      "tag": "QUIZ",
      "headline": "engaging quiz hook question or teaser (max 10 words)",
      "body": "one sentence setting up the quiz theme",
      "badge": "QUIZ",
      "accent": "${primary}"
    },
    {
      "num": "2",
      "tag": "DID YOU KNOW",
      "headline": "interesting fact that leads into the quiz",
      "body": "2-3 sentences of context about this topic",
      "badge": "CONTEXT",
      "accent": "${primary}"
    },
    {
      "num": "3",
      "tag": "QUESTION 1",
      "headline": "A specific trivia question about ${subject}?",
      "body": "Answer: [the correct answer with a brief explanation in 1-2 sentences]",
      "badge": "Q1",
      "accent": "${primary}"
    },
    {
      "num": "4",
      "tag": "QUESTION 2",
      "headline": "Another specific trivia question about ${subject}?",
      "body": "Answer: [the correct answer with a brief explanation in 1-2 sentences]",
      "badge": "Q2",
      "accent": "${primary}"
    },
    {
      "num": "5",
      "tag": "CHALLENGE",
      "headline": "How many did you get right?",
      "body": "Drop your score in the comments! Share this quiz with a friend who thinks they know everything about ${subject}.",
      "badge": "ENGAGE",
      "accent": "${primary}"
    }
  ]
}

Rules:
- Questions must be specific, verifiable facts — not guesswork
- Answers should be surprising or educational
- Keep the channel's topic domain: ${channel}
- Return ONLY valid JSON, no markdown`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON from quiz generator')
  const data = JSON.parse(match[0]) as { topic: string; slides: Slide[] }

  // Append poll slide
  const poll = await generatePollQuestion(data.topic, channel)
  const pollSlide: Slide = {
    num: String(data.slides.length + 1),
    tag: 'POLL',
    headline: poll.question,
    body: poll.options.join(' | '),
    badge: 'VOTE',
    accent: primary,
    tileType: 'poll',
    pollOptions: poll.options,
  }

  return { slides: [...data.slides, pollSlide], topic: data.topic }
}

// ── Stats generator ───────────────────────────────────────────────────────────

export async function generateStatsSlides(
  channel: string,
  subjects: string[],
  primary: string,
): Promise<{ slides: Slide[]; topic: string }> {
  const subject = pickRandom(subjects)

  const prompt = `You are a social media content creator for "${channel}".
Create a 5-slide STATS COMPARISON carousel about: "${subject}"

Return a JSON object with:
{
  "topic": "short topic label (max 8 words)",
  "slides": [
    {
      "num": "1",
      "tag": "BY THE NUMBERS",
      "headline": "attention-grabbing stat hook (max 10 words, include a specific number)",
      "body": "one sentence of context for this stat",
      "badge": "STATS",
      "accent": "${primary}"
    },
    {
      "num": "2",
      "tag": "DEEP DIVE",
      "headline": "what these numbers reveal",
      "body": "2-3 sentences of analysis about what this data means",
      "badge": "ANALYSIS",
      "accent": "${primary}"
    },
    {
      "num": "3",
      "tag": "COMPARISON",
      "headline": "headline comparing two specific items or eras",
      "body": "Include SPECIFIC numbers like: [Item A] had X points/goals/wins vs [Item B] had Y points/goals/wins. Use real comparative data.",
      "badge": "VS",
      "accent": "${primary}"
    },
    {
      "num": "4",
      "tag": "THE VERDICT",
      "headline": "what the data tells us",
      "body": "Include 2-3 more specific statistics with actual numbers (%, values, totals). Use format: [Name] X [unit] vs [Name] Y [unit].",
      "badge": "DATA",
      "accent": "${primary}"
    },
    {
      "num": "5",
      "tag": "YOUR TAKE",
      "headline": "provocative question based on the stats",
      "body": "Ask followers for their interpretation of this data. 1-2 sentences.",
      "badge": "DISCUSS",
      "accent": "${primary}"
    }
  ]
}

IMPORTANT: Slides 3 and 4 must contain real, specific numbers and direct comparisons (e.g. "Hamilton: 103 wins vs Schumacher: 91 wins").
Return ONLY valid JSON, no markdown`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON from stats generator')
  const data = JSON.parse(match[0]) as { topic: string; slides: Slide[] }

  // Append poll slide
  const poll = await generatePollQuestion(data.topic, channel)
  const pollSlide: Slide = {
    num: String(data.slides.length + 1),
    tag: 'POLL',
    headline: poll.question,
    body: poll.options.join(' | '),
    badge: 'VOTE',
    accent: primary,
    tileType: 'poll',
    pollOptions: poll.options,
  }

  return { slides: [...data.slides, pollSlide], topic: data.topic }
}

// ── History generator ─────────────────────────────────────────────────────────

export async function generateHistorySlides(
  channel: string,
  topics: string[],
  primary: string,
): Promise<{ slides: Slide[]; topic: string }> {
  const subject = pickRandom(topics)
  const now = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })

  const prompt = `You are a social media content creator for "${channel}".
Create a 5-slide THIS WEEK IN HISTORY carousel.
Channel domain: ${subject}
Time context: We are in ${month}.

Find a historically significant event related to "${subject}" that happened in ${month} (any year).

Return a JSON object with:
{
  "topic": "short topic label with year (max 8 words)",
  "slides": [
    {
      "num": "1",
      "tag": "THIS WEEK IN HISTORY",
      "headline": "the key historical moment — include the year (max 12 words)",
      "body": "one dramatic sentence about what happened",
      "badge": "HISTORY",
      "accent": "${primary}"
    },
    {
      "num": "2",
      "tag": "THE STORY",
      "headline": "what led to this moment",
      "body": "2-3 sentences of historical context leading up to the event",
      "badge": "CONTEXT",
      "accent": "${primary}"
    },
    {
      "num": "3",
      "tag": "THE MOMENT",
      "headline": "what actually happened — the key detail",
      "body": "2-3 sentences describing the event itself with specific details",
      "badge": "EVENT",
      "accent": "${primary}"
    },
    {
      "num": "4",
      "tag": "THE LEGACY",
      "headline": "how it changed everything",
      "body": "2-3 sentences on the lasting impact or significance",
      "badge": "LEGACY",
      "accent": "${primary}"
    },
    {
      "num": "5",
      "tag": "REMEMBER",
      "headline": "a question connecting past to present",
      "body": "Ask followers if they knew this story or what it means to them today.",
      "badge": "ENGAGE",
      "accent": "${primary}"
    }
  ]
}

Return ONLY valid JSON, no markdown`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON from history generator')
  const data = JSON.parse(match[0]) as { topic: string; slides: Slide[] }
  return { slides: data.slides, topic: data.topic }
}

// ── Tips generator ────────────────────────────────────────────────────────────

export async function generateTipsSlides(
  channel: string,
  topics: string[],
  primary: string,
): Promise<{ slides: Slide[]; topic: string }> {
  const subject = pickRandom(topics)

  const prompt = `You are a social media content creator for "${channel}".
Create a 5-slide PRO TIPS carousel about: "${subject}"

Return a JSON object with:
{
  "topic": "short topic label (max 8 words)",
  "slides": [
    {
      "num": "1",
      "tag": "PRO TIPS",
      "headline": "hook: 'X things every [audience] should know about [subject]'",
      "body": "one sentence teasing the value inside",
      "badge": "TIPS",
      "accent": "${primary}"
    },
    {
      "num": "2",
      "tag": "TIP 1 & 2",
      "headline": "Tip 1: [concise title]",
      "body": "Tip 1 in 1-2 sentences. | Tip 2: [concise title] — explanation in 1-2 sentences.",
      "badge": "TIPS 1-2",
      "accent": "${primary}"
    },
    {
      "num": "3",
      "tag": "TIP 3 & 4",
      "headline": "Tip 3: [concise title]",
      "body": "Tip 3 in 1-2 sentences. | Tip 4: [concise title] — explanation in 1-2 sentences.",
      "badge": "TIPS 3-4",
      "accent": "${primary}"
    },
    {
      "num": "4",
      "tag": "TIP 5",
      "headline": "Tip 5: [the best/most surprising tip]",
      "body": "2-3 sentences expanding on this most valuable tip with specific actionable advice.",
      "badge": "TIP 5",
      "accent": "${primary}"
    },
    {
      "num": "5",
      "tag": "YOUR TURN",
      "headline": "What's your go-to tip for ${subject}?",
      "body": "Share your own tips in the comments — we'll feature the best ones!",
      "badge": "ENGAGE",
      "accent": "${primary}"
    }
  ]
}

Rules:
- Tips must be specific and actionable, not generic advice
- Tailor to the channel's audience domain: ${channel}
- Return ONLY valid JSON, no markdown`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON from tips generator')
  const data = JSON.parse(match[0]) as { topic: string; slides: Slide[] }
  return { slides: data.slides, topic: data.topic }
}

// ── Poll question generator ───────────────────────────────────────────────────

async function generatePollQuestion(
  topic: string,
  channel: string,
): Promise<{ question: string; options: string[] }> {
  const prompt = `You are a social media engagement expert for "${channel}".
Based on this topic: "${topic}"

Generate a short, controversial poll question with exactly 3 answer options.
The question should spark debate and drive comments.

Return ONLY valid JSON:
{"question": "Which is better?", "options": ["Option A", "Option B", "Option C"]}

Rules:
- Question max 12 words
- Each option max 5 words
- Make options clearly distinct
- No "None of the above" options`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('')
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const data = JSON.parse(match[0]) as { question: string; options: string[] }
    if (!data.question || !Array.isArray(data.options) || data.options.length < 2) throw new Error('Bad poll data')
    return { question: data.question, options: data.options.slice(0, 3) }
  } catch {
    return { question: `What's your take on ${topic.split(' ').slice(0, 4).join(' ')}?`, options: ['Agree', 'Disagree', 'Not sure'] }
  }
}

// ── Poll extractor (used by callers to get poll data from slides) ─────────────

export function extractPollFromSlides(slides: Slide[]): { pollQuestion?: string; pollOptions?: string[] } {
  const pollSlide = slides.find(s => s.tileType === 'poll')
  if (!pollSlide) return {}
  return {
    pollQuestion: pollSlide.headline,
    pollOptions: pollSlide.pollOptions || pollSlide.body.split(' | ').filter(Boolean),
  }
}

// ── Unified dispatcher ────────────────────────────────────────────────────────

export async function generateContentSlides(
  contentType: ContentType,
  channel: string,
  config: ContentMixConfig,
  primary: string,
): Promise<{ slides: Slide[]; topic: string }> {
  switch (contentType) {
    case 'quiz':    return generateQuizSlides(channel, config.quizTopics, primary)
    case 'stats':   return generateStatsSlides(channel, config.statsSubjects, primary)
    case 'history': return generateHistorySlides(channel, config.historyTopics, primary)
    case 'tips':    return generateTipsSlides(channel, config.tipsTopics, primary)
    default:        throw new Error(`No generator for contentType: ${contentType}`)
  }
}
