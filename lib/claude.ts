export async function callClaude(prompt: string, system?: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system, max_tokens: 1000 }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return data.text
}

export type PostContent = {
  title: string
  description: string
  caption: string
  tags: string[]
  cta: string
}

export async function generatePostContent(
  promptText: string,
  platforms: string[],
  tone: string
): Promise<PostContent> {
  const system =
    'You are a social media content expert. Always respond with valid JSON only — no markdown, no backticks, no preamble.'

  const prompt = `Create social media post content for platforms: ${platforms.join(', ') || 'Instagram'}.
Tone: ${tone}.
Description: ${promptText}

Return this exact JSON:
{
  "title": "catchy post title (max 60 chars)",
  "description": "full engaging description (2-4 sentences)",
  "caption": "short punchy caption (max 150 chars)",
  "tags": ["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8"],
  "cta": "one-line call to action"
}`

  const raw = await callClaude(prompt, system)
  return JSON.parse(raw.replace(/```json|```/g, '').trim()) as PostContent
}

export async function regenerateField(
  field: 'title' | 'description' | 'caption' | 'tags' | 'cta',
  context: { promptText: string; platforms: string[]; tone: string; currentValue?: string }
): Promise<string | string[]> {
  const { promptText, platforms, tone, currentValue } = context
  const pStr = platforms.join(', ') || 'Instagram'

  const configs: Record<string, { system: string; prompt: string }> = {
    title: {
      system: 'You are a social media expert. Respond with plain text only — no quotes, no markdown.',
      prompt: `Write a catchy post title (max 60 chars) for: "${promptText}". Tone: ${tone}. Platforms: ${pStr}.`,
    },
    description: {
      system: 'You are a social media expert. Respond with plain text only — no markdown.',
      prompt: `Write an engaging post description (2-4 sentences) for: "${promptText}". Tone: ${tone}. Platforms: ${pStr}.`,
    },
    caption: {
      system: 'You are a social media expert. Respond with plain text only — no markdown.',
      prompt: `Write a short punchy caption (max 150 chars) for: "${promptText}". Tone: ${tone}. Platforms: ${pStr}.`,
    },
    tags: {
      system: 'You are a social media expert. Respond with a JSON array of strings only — no markdown, no backticks.',
      prompt: `Suggest 8 relevant hashtags for a ${tone} post about: "${promptText}" on ${pStr}. Return JSON array without # symbols.`,
    },
    cta: {
      system: 'You are a social media expert. Respond with plain text only — no quotes, no markdown.',
      prompt: `Write a compelling one-line call to action for a ${tone} post about: "${promptText}".`,
    },
    improve_description: {
      system: 'You are a social media expert. Improve the following text. Respond with improved text only.',
      prompt: `Improve this social media description for ${pStr} (tone: ${tone}):\n"${currentValue || ''}"`,
    },
  }

  const cfg = configs[field]
  const raw = await callClaude(cfg.prompt, cfg.system)

  if (field === 'tags') {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return Array.isArray(parsed) ? parsed.map((t: string) => t.replace(/^#/, '')) : []
  }

  return raw.trim().replace(/^["']|["']$/g, '')
}
