import Anthropic from '@anthropic-ai/sdk'
import { CHANNELS } from '@/lib/channels'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type HookPlatform = 'instagram' | 'tiktok' | 'facebook' | 'youtube'

export type GeneratedHooks = Record<HookPlatform, string[]>

const PLATFORM_INSTRUCTIONS: Record<HookPlatform, string> = {
  instagram: 'One line only. Curiosity gap — hint at the payoff without giving it away. Emoji-light (max 1). End with intrigue, not a full stop answer. Make the reader feel they must tap to see more.',
  tiktok: 'Bold claim or punchy question in the first 3 words — the hook lives or dies before the thumb swipes. Pattern-interrupt: subvert an expectation. Conversational, first-person or direct-address tone.',
  facebook: 'Slightly longer (1–2 sentences). Open with a storytelling lead-in — a personal detail, a surprising fact, a nostalgic cue. Community or nostalgia tone. Invite the reader in, do not demand attention.',
  youtube: 'Title-style: capitalised like a headline, punchy, 8–12 words max. Must promise a clear payoff the viewer will get by watching. Should also work as thumbnail text — visual and scannable at a glance.',
}

const PLATFORM_EXAMPLES: Record<HookPlatform, string> = {
  instagram: 'The car that sold for more than a private jet — and the story behind it 🔍',
  tiktok: 'Nobody talks about why this driver really left the team…',
  facebook: 'I never thought a classic car auction could make me emotional. Then I read about this one.',
  youtube: 'The Car That Broke Every Auction Record (And Why It Matters)',
}

export async function generateHooks(
  topic: string,
  channel: string,
  platforms: HookPlatform[],
): Promise<GeneratedHooks> {
  if (platforms.length === 0) {
    return { instagram: [], tiktok: [], facebook: [], youtube: [] }
  }

  const channelConfig = CHANNELS[channel]
  const channelVoice = channelConfig?.hookStyle ?? `a ${channel} social media channel`

  const platformSections = platforms.map(p => `
### ${p.toUpperCase()}
Style guide: ${PLATFORM_INSTRUCTIONS[p]}
Example of the right tone: "${PLATFORM_EXAMPLES[p]}"
`).join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are writing social media hooks for the "${channel}" channel.

Channel voice: ${channelVoice}

Topic: "${topic}"

Write exactly 5 hooks for each platform listed below. Each hook must feel native to that platform and embody the channel voice above.

${platformSections}

Return ONLY a JSON object (no markdown, no backticks):
{
${platforms.map(p => `  "${p}": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"]`).join(',\n')}
}`,
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)?.[0]
    if (!match) throw new Error('No JSON object found')
    const parsed: Partial<GeneratedHooks> = JSON.parse(match)

    const result: GeneratedHooks = { instagram: [], tiktok: [], facebook: [], youtube: [] }
    for (const p of platforms) {
      const hooks = parsed[p]
      if (Array.isArray(hooks)) {
        result[p] = hooks.filter((h): h is string => typeof h === 'string' && h.trim().length > 0).slice(0, 5)
      }
    }
    return result
  } catch (e) {
    console.error('[hooks] Failed to parse response:', e instanceof Error ? e.message : e)
    console.error('[hooks] Raw response:', text.substring(0, 500))
    return { instagram: [], tiktok: [], facebook: [], youtube: [] }
  }
}
