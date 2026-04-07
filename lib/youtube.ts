import { google } from 'googleapis'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const TOKENS_PATH = path.join(process.cwd(), 'data', 'youtube-tokens.json')

export type YouTubeToken = {
  access_token: string
  refresh_token: string
  expiry_date: number
  youtube_channel_name: string
  youtube_channel_id: string
}

export type TokenStore = Record<string, YouTubeToken>

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
}

export async function loadTokens(): Promise<TokenStore> {
  try {
    if (!existsSync(TOKENS_PATH)) return {}
    const raw = await readFile(TOKENS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function saveTokens(tokens: TokenStore): Promise<void> {
  const dir = path.dirname(TOKENS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2))
}

export async function getTokenForChannel(channelName: string): Promise<YouTubeToken | null> {
  const tokens = await loadTokens()
  return tokens[channelName] || null
}

export async function deleteTokenForChannel(channelName: string): Promise<void> {
  const tokens = await loadTokens()
  delete tokens[channelName]
  await saveTokens(tokens)
}

export async function getAuthenticatedClient(channelName: string) {
  const token = await getTokenForChannel(channelName)
  if (!token) throw new Error(`No YouTube token found for channel: ${channelName}`)

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  })

  // Refresh if expired
  if (token.expiry_date && Date.now() >= token.expiry_date - 60000) {
    const { credentials } = await oauth2.refreshAccessToken()
    oauth2.setCredentials(credentials)

    // Persist refreshed tokens
    const tokens = await loadTokens()
    tokens[channelName] = {
      ...token,
      access_token: credentials.access_token || token.access_token,
      expiry_date: credentials.expiry_date || token.expiry_date,
    }
    await saveTokens(tokens)
  }

  return oauth2
}
