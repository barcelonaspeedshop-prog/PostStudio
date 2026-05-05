/**
 * sync-roadandtrax.ts
 *
 * Syncs a published Gentlemen of Fuel article to the Road & Trax website repo
 * via the GitHub Contents API. Only GoF posts are synced.
 *
 * Required env vars (set in docker-compose.yml on the VPS):
 *   ROADANDTRAX_GITHUB_TOKEN  — Personal Access Token with `contents:write` on
 *                               the roadandtrax repo
 *   ROADANDTRAX_GITHUB_REPO   — e.g. "barcelonaspeedshop-prog/roadandtrax"
 *                               (defaults to above)
 *   ROADANDTRAX_GITHUB_BRANCH — branch to commit to (defaults to "main")
 */

const REPO = process.env.ROADANDTRAX_GITHUB_REPO ?? 'barcelonaspeedshop-prog/roadandtrax'
const BRANCH = process.env.ROADANDTRAX_GITHUB_BRANCH ?? 'main'
const FILE_PATH = 'data/posts.json'

const GITHUB_API = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`

type PostEntry = {
  id: string
  section: string
  title: string
  date: string
  summary: string
  image: string | null
  status: 'published' | 'draft'
  body: string
}

type Article = {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  coverImage: string | null
  body: string
  channel: string
}

/**
 * Convert a PostStudio GoF article into a Road & Trax posts.json entry.
 */
function articleToPostEntry(article: Article): PostEntry {
  const date = article.publishedAt
    ? article.publishedAt.slice(0, 10)  // YYYY-MM-DD
    : new Date().toISOString().slice(0, 10)

  // Convert markdown body to simple HTML paragraphs.
  // The body from PostStudio is markdown; we do a minimal conversion
  // so it renders correctly in the Road & Trax post viewer.
  const body = markdownToHtml(article.body)

  return {
    id: `gof-${article.slug}`,
    section: 'gentlemen-of-fuel',
    title: article.title,
    date,
    summary: article.excerpt,
    image: article.coverImage ?? null,
    status: 'published',
    body,
  }
}

/**
 * Minimal markdown → HTML converter for post bodies.
 * Handles: headings, paragraphs, bold, italic, horizontal rules.
 */
function markdownToHtml(md: string): string {
  if (!md) return ''
  const lines = md.split('\n')
  const out: string[] = []
  let inP = false

  const closeP = () => {
    if (inP) { out.push('</p>'); inP = false }
  }

  const inlineFormat = (s: string) =>
    s
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')

  for (const raw of lines) {
    const line = raw.trimEnd()
    // Skip horizontal rules / separators
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) { closeP(); continue }
    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      closeP()
      const level = Math.min(hMatch[1].length + 2, 6) // h3–h6
      out.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`)
      continue
    }
    // Blank line ends paragraph
    if (line === '') {
      closeP()
      continue
    }
    // Regular text
    if (!inP) { out.push('<p>'); inP = true }
    else out.push(' ')
    out[out.length - 1] = (inP && out[out.length - 1] === ' ')
      ? (out[out.length - 2] ?? '') + ' ' + inlineFormat(line)
      : (out.pop() ?? '') + inlineFormat(line)
  }
  closeP()
  return out.join('')
}

/**
 * Fetch the current posts.json from GitHub, add/update the GoF entry, and push back.
 * Returns { success, error? }.
 */
// Sync is currently disabled pending content/imagery policy review.
// To re-enable: remove the early-return block below and deploy.
const ROADANDTRAX_SYNC_DISABLED = true

export async function syncGofPostToRoadAndTrax(
  article: Article
): Promise<{ success: boolean; error?: string }> {
  if (ROADANDTRAX_SYNC_DISABLED) {
    console.log('[sync-roadandtrax] Sync is disabled — skipping Road & Trax sync for:', article.slug)
    return { success: false, error: 'Road & Trax sync is currently disabled' }
  }

  const token = process.env.ROADANDTRAX_GITHUB_TOKEN
  if (!token) {
    return { success: false, error: 'ROADANDTRAX_GITHUB_TOKEN not set — skipping Road & Trax sync' }
  }

  if (article.channel !== 'fuel') {
    return { success: false, error: 'Only Gentlemen of Fuel articles are synced to Road & Trax' }
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    }

    // 1. Get current file (to get SHA for update)
    const getRes = await fetch(`${GITHUB_API}?ref=${BRANCH}`, { headers })
    if (!getRes.ok) {
      return { success: false, error: `GitHub GET failed: ${getRes.status} ${await getRes.text()}` }
    }
    const fileData = await getRes.json() as { content: string; sha: string }
    const sha = fileData.sha
    const currentJson: PostEntry[] = JSON.parse(
      Buffer.from(fileData.content, 'base64').toString('utf-8')
    )

    // 2. Build the new entry
    const newEntry = articleToPostEntry(article)
    const existingIdx = currentJson.findIndex(p => p.id === newEntry.id)

    let updatedJson: PostEntry[]
    if (existingIdx >= 0) {
      // Update in place
      updatedJson = [...currentJson]
      updatedJson[existingIdx] = newEntry
    } else {
      // Prepend (newest first)
      updatedJson = [newEntry, ...currentJson]
    }

    // 3. Commit back
    const content = Buffer.from(JSON.stringify(updatedJson, null, 2) + '\n').toString('base64')
    const verb = existingIdx >= 0 ? 'update' : 'add'
    const putRes = await fetch(GITHUB_API, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `feat(gof): ${verb} "${article.title}" via PostStudio sync`,
        content,
        sha,
        branch: BRANCH,
      }),
    })

    if (!putRes.ok) {
      return { success: false, error: `GitHub PUT failed: ${putRes.status} ${await putRes.text()}` }
    }

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
