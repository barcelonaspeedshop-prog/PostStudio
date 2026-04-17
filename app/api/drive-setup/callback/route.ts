/**
 * GET /api/drive-setup/callback?code=...
 *
 * Receives the OAuth code, exchanges it for a token, then creates the
 * "Premira First — Master Credentials" Google Doc in the root Drive folder.
 */

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

const REDIRECT_URI  = 'https://app.premirafirst.com/api/drive-setup/callback'
const ROOT_FOLDER   = process.env.GOOGLE_DRIVE_FOLDER_ID || '1wtB_6-2kTfPs7fnvo905MCw7Qr5Gk--Z'
const DOC_TITLE     = 'Premira First — Master Credentials'

const CHANNELS = [
  { channel: 'Gentlemen of Fuel', emailSuffix: 'gof',          passwordSuffix: 'gof',      youtube: '@gentlemenoffuel', instagram: '@gentlemenoffuel',  facebook: 'Gentlemen of Fuel' },
  { channel: 'Omnira F1',         emailSuffix: 'omniraf1',      passwordSuffix: 'f1',       youtube: '@omniraf1',        instagram: '@omniraf1',          facebook: 'Omnira F1' },
  { channel: 'Road & Trax',       emailSuffix: 'roadandtrax',   passwordSuffix: 'trax',     youtube: '@roadandtrax',     instagram: '@roadandtrax',       facebook: 'Road & Trax' },
  { channel: 'Omnira Football',   emailSuffix: 'omnirafoot',    passwordSuffix: 'football', youtube: '@omnirafc',        instagram: '@omnirafootball',    facebook: 'Omnira Football' },
  { channel: 'Omnira Cricket',    emailSuffix: 'omniracricket', passwordSuffix: 'cricket',  youtube: '@OmniraCricket',   instagram: '@omniracricket',     facebook: 'Omnira Cricket' },
  { channel: 'Omnira Golf',       emailSuffix: 'omniragolf',    passwordSuffix: 'golf',     youtube: '@OmniraGolf',      instagram: '@omniragolf',        facebook: 'Omnira Golf' },
  { channel: 'Omnira NFL',        emailSuffix: 'omniranfl',     passwordSuffix: 'nfl',      youtube: '@OmniraNFL',       instagram: '@omniranfl',         facebook: 'Omnira NFL' },
  { channel: 'Omnira Food',       emailSuffix: 'omnirafood',    passwordSuffix: 'food',     youtube: '@OmniraFood',      instagram: '@omnirafood',        facebook: 'Omnira Food' },
  { channel: 'Omnira Travel',     emailSuffix: 'omniratravel',  passwordSuffix: 'travel',   youtube: '@OmniraTravel',    instagram: '@omniratravel',      facebook: 'Omnira Travel' },
]

function buildHtml(): string {
  const th = (t: string) =>
    `<th style="background:#1a1a2e;color:#fff;font-weight:bold;padding:8px 12px;border:1px solid #ccc;font-size:11pt;text-align:left;">${t}</th>`
  const td = (t: string, muted = false) =>
    `<td style="padding:7px 12px;border:1px solid #ccc;font-size:10pt;vertical-align:top;${muted ? 'color:#888;font-style:italic;' : ''}">${t || '—'}</td>`

  const headers = ['Channel','Email','Password','YouTube','Instagram','Facebook','TikTok (future)','X (future)','Notes']
  const headerRow = `<tr>${headers.map(th).join('')}</tr>`

  const dataRows = CHANNELS.map((ch, i) => {
    const email = `barcelonaspeedshop+${ch.emailSuffix}@gmail.com`
    const pwd   = `Omn1ra.${ch.passwordSuffix}`
    const bg    = i % 2 === 0 ? '#ffffff' : '#f9f9f9'
    return `<tr style="background:${bg};">
      ${td(`<strong>${ch.channel}</strong>`)}
      ${td(email)}
      ${td(pwd)}
      ${td(ch.youtube)}
      ${td(ch.instagram)}
      ${td(ch.facebook)}
      ${td('', true)}
      ${td('', true)}
      ${td('', true)}
    </tr>`
  }).join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${DOC_TITLE}</title></head>
<body style="font-family:Arial,sans-serif;margin:40px;color:#222;">
  <h1 style="font-size:20pt;color:#1a1a2e;margin-bottom:4px;">${DOC_TITLE}</h1>
  <p style="font-size:10pt;color:#666;margin-bottom:24px;">Generated ${new Date().toUTCString()} · CONFIDENTIAL — store securely</p>
  <table style="border-collapse:collapse;width:100%;"><tbody>
    ${headerRow}
    ${dataRows}
  </tbody></table>
  <div style="background:#fff8e1;border-left:4px solid #f0ad00;padding:10px 14px;margin-top:24px;font-size:10pt;color:#5a4000;">
    ⚠ <strong>CONFIDENTIAL</strong> — Restrict sharing to authorised team members only.
    TikTok and X columns are reserved for future use.
  </div>
</body></html>`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(`<html><body><h2>OAuth error: ${error}</h2></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }
  if (!code) {
    return new NextResponse('<html><body><h2>Missing code parameter</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const clientId     = process.env.YOUTUBE_CLIENT_ID!
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

  // Exchange code → token
  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)

  const drive = google.drive({ version: 'v3', auth: oauth2 })

  // Check if already exists
  const existing = await drive.files.list({
    q: `name='${DOC_TITLE}' and '${ROOT_FOLDER}' in parents and trashed=false`,
    fields: 'files(id,name,webViewLink)',
    pageSize: 1,
  })

  let fileId: string
  let docUrl: string
  let action: string

  if (existing.data.files && existing.data.files.length > 0) {
    const f = existing.data.files[0]
    // Update existing
    await drive.files.update({
      fileId: f.id!,
      media: { mimeType: 'text/html', body: Readable.from(Buffer.from(buildHtml(), 'utf-8')) },
    })
    fileId = f.id!
    docUrl = f.webViewLink!
    action = 'updated'
  } else {
    // Create new
    const created = await drive.files.create({
      requestBody: {
        name: DOC_TITLE,
        mimeType: 'application/vnd.google-apps.document',
        parents: [ROOT_FOLDER],
      },
      media: { mimeType: 'text/html', body: Readable.from(Buffer.from(buildHtml(), 'utf-8')) },
      fields: 'id,webViewLink',
    })
    fileId = created.data.id!
    docUrl = created.data.webViewLink!
    action = 'created'
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Credentials Doc ${action}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 80px auto; color: #222; text-align: center; }
    .badge { display: inline-block; background: #10b981; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #666; font-size: 14px; }
    a.btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #1a1a2e; color: #fff; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold; }
    a.btn:hover { background: #2d2d4e; }
    code { display: block; margin-top: 16px; font-size: 12px; color: #888; word-break: break-all; }
  </style>
</head>
<body>
  <div class="badge">✅ Document ${action}</div>
  <h1>Premira First — Master Credentials</h1>
  <p>The Google Doc has been ${action} successfully in your Drive folder.</p>
  <a class="btn" href="${docUrl}" target="_blank">Open Document →</a>
  <code>${docUrl}</code>
  <p style="margin-top:40px;font-size:12px;color:#aaa;">File ID: ${fileId}</p>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
