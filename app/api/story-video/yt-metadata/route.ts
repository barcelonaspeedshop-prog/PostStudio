import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { title, summary, chapters, channel } = await req.json() as {
      title: string
      summary: string
      chapters: { title: string; narration: string }[]
      channel: string
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const chapterSummary = chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n')
    const narrationSnippet = chapters.slice(0, 3).map(c => c.narration).join(' ').slice(0, 600)

    const prompt = `You are a YouTube SEO and engagement expert. Given this video:

Channel: ${channel}
Title: ${title}
Summary: ${summary}
Chapters:
${chapterSummary}
Script excerpt: ${narrationSnippet}

Return a JSON object with exactly this structure:
{
  "poll": {
    "question": "A controversial or thought-provoking poll question that will drive viewer engagement and debate",
    "options": ["Option A", "Option B", "Option C", "Option D"]
  },
  "tags": ["multi word phrase 1", "multi word phrase 2", ...]
}

For the poll:
- Question should be debatable and interesting — viewers should have strong opinions
- 2-4 answer options (strongly prefer 4)
- Keep options short (3-6 words each)
- No "None of the above" or similar cop-outs

For tags (CRITICAL):
- Generate exactly 18 tags
- ALL tags must be multi-word phrases (2-4 words), NEVER single words
- NEVER use # prefix — YouTube tags are plain keywords, not hashtags
- No punctuation, no commas within a tag
- Use specific search phrases people actually type on YouTube
- Mix: main topic phrases, channel niche phrases, broader category phrases
- Examples of good tags: "formula 1 2024", "best racing cars", "motorsport history"
- Bad tags: "racing", "cars", "#f1", "formula,1" (too generic, single word, or wrong format)

Return ONLY valid JSON, no markdown, no explanation.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(jsonStr) as {
      poll: { question: string; options: string[] }
      tags: string[]
    }

    return NextResponse.json({
      poll: parsed.poll,
      tags: parsed.tags,
      ytTags: parsed.tags.join(', '),
      igTags: parsed.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' '),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[yt-metadata] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
