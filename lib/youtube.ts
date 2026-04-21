import { google } from 'googleapis'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Use /data for Docker (mounted volume), fall back to ./data for local dev
const TOKENS_DIR = process.env.TOKEN_STORAGE_PATH || '/data'
const TOKENS_PATH = path.join(TOKENS_DIR, 'youtube-tokens.json')

export type YouTubeToken = {
  access_token: string
  refresh_token: string
  expiry_date: number
  youtube_channel_name: string
  youtube_channel_id: string
  youtube_handle?: string
  google_account_email?: string
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
  if (!token) throw new Error(`No YouTube token found for channel: ${channelName}. Please connect it on the Accounts page.`)

  if (!token.refresh_token) {
    throw new Error(`No refresh token for "${channelName}". Please disconnect and reconnect the channel on the Accounts page.`)
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry_date,
  })

  // Refresh if expired or expiring within 2 minutes
  const isExpired = !token.expiry_date || Date.now() >= token.expiry_date - 120000
  if (isExpired) {
    console.log(`[youtube] Token expired for "${channelName}" (expired ${token.expiry_date ? new Date(token.expiry_date).toISOString() : 'unknown'}), refreshing...`)
    try {
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
      console.log(`[youtube] Token refreshed for "${channelName}", new expiry: ${credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown'}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[youtube] Token refresh failed for "${channelName}":`, msg)
      // If refresh token is revoked/invalid, give a clear message
      if (msg.includes('invalid_grant') || msg.includes('Token has been expired or revoked')) {
        throw new Error(`YouTube access for "${channelName}" has expired. Please reconnect the channel on the Accounts page.`)
      }
      throw new Error(`Failed to refresh YouTube token for "${channelName}": ${msg}`)
    }
  }

  return oauth2
}
