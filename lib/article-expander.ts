import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function expandScriptToArticle(params: {
  title: string
  description: string
  tags: string[]
  channelName: string
}): Promise<string> {
  const { title, description, tags, channelName } = params
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `You are an editorial writer for ${channelName}. Write standalone web articles — not video scripts, not social posts. Never reference video, watching, clicking, narration, or social media.`,
      messages: [{
        role: 'user',
        content: `Write an 800–1500 word editorial web article based on:

Title: ${title}
Summary: ${description}
Topics: ${tags.slice(0, 10).join(', ')}

Requirements:
- Strong editorial opening paragraph (hook the reader; no "In this video..." or "Today we explore...")
- 3–5 H2 subheadings (## format) to break up the body
- Structure: intro → context → main detail → analysis → conclusion
- Write as a standalone article — no references to video, watching, clicking, narration
- Return markdown only — no frontmatter, no JSON wrapping, no backticks
- Target length: 800–1500 words`,
      }],
    })
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
    return text.trim()
  } catch (e) {
    console.warn('[article-expander] Haiku call failed, using description as fallback:', e instanceof Error ? e.message : e)
    return description
  }
}
