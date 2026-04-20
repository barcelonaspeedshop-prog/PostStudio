'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

const ACCOUNT_DATA = [
  { channel: 'Gentlemen of Fuel', accounts: [
    { platform: 'YouTube', handle: '@gentlemenoffuel', status: 'connected', url: 'https://youtube.com/@gentlemenoffuel' },
    { platform: 'Instagram', handle: '@gentlemenoffuel', status: 'connected', url: 'https://instagram.com/gentlemenoffuel' },
    { platform: 'TikTok', handle: '@gentlemenoffuel', status: 'connected', url: 'https://tiktok.com/@gentlemenoffuel' },
    { platform: 'Facebook', handle: 'Gentlemen of Fuel', status: 'connected', url: 'https://facebook.com/gentlemenoffuel' },
  ]},
  { channel: 'Omnira F1', accounts: [
    { platform: 'YouTube', handle: '@omniraf1', status: 'connected', url: 'https://youtube.com/@omniraf1' },
    { platform: 'Instagram', handle: '@omniraf1', status: 'connected', url: 'https://instagram.com/omniraf1' },
    { platform: 'TikTok', handle: '@omniraf1', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira F1', status: 'connected', url: 'https://facebook.com' },
  ]},
  { channel: 'Road & Trax', accounts: [
    { platform: 'YouTube', handle: '@roadandtrax', status: 'connected', url: 'https://youtube.com/@roadandtrax' },
    { platform: 'Instagram', handle: '@roadandtrax', status: 'connected', url: 'https://instagram.com/roadandtrax' },
    { platform: 'TikTok', handle: '@roadandtrax', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Road & Trax', status: 'connected', url: 'https://facebook.com' },
  ]},
  { channel: 'Omnira Football', accounts: [
    { platform: 'YouTube', handle: '@omnirafc', status: 'connected', url: 'https://youtube.com/@omnirafc' },
    { platform: 'Instagram', handle: '@omnirafootball', status: 'connected', url: 'https://instagram.com/omnirafootball' },
    { platform: 'TikTok', handle: '@omnirafootball', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira Football', status: 'connected', url: 'https://facebook.com' },
  ]},
  { channel: 'Omnira Cricket', accounts: [
    { platform: 'YouTube', handle: '@OmniraCricket', status: 'connected', url: 'https://youtube.com/@OmniraCricket' },
    { platform: 'Instagram', handle: '@omniracricket', status: 'pending', url: '' },
    { platform: 'TikTok', handle: '@omniracricket', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira Cricket', status: 'pending', url: '' },
  ]},
  { channel: 'Omnira Golf', accounts: [
    { platform: 'YouTube', handle: '@OmniraGolf', status: 'connected', url: 'https://youtube.com/@OmniraGolf' },
    { platform: 'Instagram', handle: '@omniragolf', status: 'pending', url: '' },
    { platform: 'TikTok', handle: '@omniragolf', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira Golf', status: 'pending', url: '' },
  ]},
  { channel: 'Omnira NFL', accounts: [
    { platform: 'YouTube', handle: '@OmniraNFL', status: 'connected', url: 'https://youtube.com/@OmniraNFL' },
    { platform: 'Instagram', handle: '@omniranfl', status: 'pending', url: '' },
    { platform: 'TikTok', handle: '@omniranfl', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira NFL', status: 'pending', url: '' },
  ]},
  { channel: 'Omnira Food', accounts: [
    { platform: 'YouTube', handle: '@OmniraFood', status: 'connected', url: 'https://youtube.com/@OmniraFood' },
    { platform: 'Instagram', handle: '@omnirafood', status: 'connected', url: 'https://instagram.com/omnirafood' },
    { platform: 'TikTok', handle: '@omnirafood', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira Food', status: 'pending', url: '' },
  ]},
  { channel: 'Omnira Travel', accounts: [
    { platform: 'YouTube', handle: '@OmniraTravel', status: 'connected', url: 'https://youtube.com/@OmniraTravel' },
    { platform: 'Instagram', handle: '@omniratravel', status: 'pending', url: '' },
    { platform: 'TikTok', handle: '@omniratravel', status: 'pending', url: '' },
    { platform: 'Facebook', handle: 'Omnira Travel', status: 'pending', url: '' },
  ]},
]

// Expected YouTube channel IDs — used to detect when the wrong Brand Account
// was connected (all 8 Omnira channels sharing GoF's token is a known issue).
const EXPECTED_YT_CHANNEL_IDS: Record<string, string> = {
  'Gentlemen of Fuel': 'UCRul9-FAiGqwz7yKa7WRCwQ',
  'Omnira F1':         'UCpJHo_MnHVZ2cCydZVAND2Q',
  'Road & Trax':       'UCL2hKeQUBiEG36rfTs9bhbw',
  'Omnira Football':   'UClMPeEgy_Q21K0v5GrOh4kw',
  'Omnira Cricket':    'UCiXqVtRt-KYsRlS0LYl_iBw',
  'Omnira Golf':       'UCyUvDlet6Py9D30aCdv46SA',
  'Omnira NFL':        'UCR6DnL1k6Uq1lgHT27cKnHA',
  'Omnira Food':       'UC970CeC0HKQIlLuiqbvgkkA',
  'Omnira Travel':     'UCkehLjuwibcMWVeP5xzWlJA',
}

const PLATFORM_TIPS: Record<string, string> = {
  TikTok: 'Set up TikTok to reach a younger, high-engagement audience',
  Instagram: 'Instagram Reels drive significant organic reach',
  Facebook: 'Facebook Pages unlock Meta Business Suite for cross-posting',
}

type MetaStatus = Record<string, {
  connected: boolean
  instagramAccountId?: string
  facebookPageId?: string
  tokenType?: 'permanent' | 'short'
  tokenSavedAt?: number
  hasUserToken?: boolean
}>

type ConnectForm = {
  channel: string
  pageAccessToken: string
  instagramAccountId: string
  facebookPageId: string
  saving: boolean
  error: string
}

type YouTubeStatus = Record<string, {
  connected: boolean
  youtube_channel_name?: string
  youtube_channel_id?: string
  youtube_handle?: string
}>

function AccountsPageInner() {
  const [metaStatus, setMetaStatus] = useState<MetaStatus>({})
  const [ytStatus, setYtStatus]     = useState<YouTubeStatus>({})
  const [ytDisconnecting, setYtDisconnecting] = useState<string | null>(null)
  const [connectForm, setConnectForm] = useState<ConnectForm | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | 'all' | null>(null)
  const [setupPanel, setSetupPanel] = useState(false)
  const [setupToken, setSetupToken] = useState('')
  const [setupRunning, setSetupRunning] = useState(false)
  const [includeMusic, setIncludeMusic] = useState(true)
  const searchParams = useSearchParams()

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchMetaStatus = async () => {
    try {
      const res = await fetch('/api/meta-auth')
      if (res.ok) {
        const data = await res.json()
        setMetaStatus(data.status || {})
      }
    } catch { /* ignore */ }
  }

  const fetchYtStatus = async () => {
    try {
      const res = await fetch('/api/auth/youtube?action=status')
      if (res.ok) {
        const data = await res.json()
        setYtStatus(data)
      }
    } catch { /* ignore */ }
  }

  const disconnectYt = async (channel: string) => {
    setYtDisconnecting(channel)
    try {
      const res = await fetch(`/api/auth/youtube?action=disconnect&channel=${encodeURIComponent(channel)}`)
      if (res.ok) {
        await fetchYtStatus()
        showToast(`YouTube disconnected for ${channel}`)
      } else {
        showToast(`Failed to disconnect YouTube for ${channel}`, 'error')
      }
    } catch { showToast('Disconnect failed', 'error') }
    finally { setYtDisconnecting(null) }
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (typeof s.includeMusic === 'boolean') setIncludeMusic(s.includeMusic)
    }).catch(() => {})
    fetchMetaStatus()
    fetchYtStatus()
    // Show result of OAuth callback redirects
    const ytConnected = searchParams.get('connected')
    const connected   = searchParams.get('meta_connected')
    const igCount     = searchParams.get('meta_ig')
    const metaErr     = searchParams.get('meta_error')
    const authErr     = searchParams.get('error')
    if (ytConnected) showToast(`YouTube connected for ${ytConnected}`)
    if (connected) showToast(`Meta connected — ${connected} channel${connected === '1' ? '' : 's'} updated, ${igCount ?? 0} Instagram IDs saved`)
    if (metaErr)   showToast(`Meta connection failed: ${metaErr}`, 'error')
    if (authErr)   showToast(`YouTube auth failed: ${authErr}`, 'error')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openConnectForm = (channel: string) => {
    setConnectForm({
      channel,
      pageAccessToken: '',
      instagramAccountId: '',
      facebookPageId: '',
      saving: false,
      error: '',
    })
  }

  const saveConnectForm = async () => {
    if (!connectForm) return
    if (!connectForm.pageAccessToken.trim()) {
      setConnectForm(f => f ? { ...f, error: 'Page Access Token is required' } : null)
      return
    }
    if (!connectForm.facebookPageId.trim()) {
      setConnectForm(f => f ? { ...f, error: 'Facebook Page ID is required' } : null)
      return
    }

    setConnectForm(f => f ? { ...f, saving: true, error: '' } : null)

    try {
      const res = await fetch('/api/meta-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: connectForm.channel,
          pageAccessToken: connectForm.pageAccessToken.trim(),
          instagramAccountId: connectForm.instagramAccountId.trim(),
          facebookPageId: connectForm.facebookPageId.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials')

      await fetchMetaStatus()
      setConnectForm(null)
      showToast(`Meta connected for ${connectForm.channel}`)
    } catch (e: unknown) {
      setConnectForm(f => f ? { ...f, saving: false, error: e instanceof Error ? e.message : 'Save failed' } : null)
    }
  }

  const disconnect = async (channel: string) => {
    setDisconnecting(channel)
    try {
      const res = await fetch('/api/meta-auth', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      if (!res.ok) throw new Error('Failed to disconnect')
      await fetchMetaStatus()
      showToast(`Meta disconnected for ${channel}`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Disconnect failed', 'error')
    } finally {
      setDisconnecting(null)
    }
  }

  const refreshChannel = async (channel: string) => {
    setRefreshing(channel)
    try {
      const res = await fetch('/api/meta-auth/refresh-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refresh failed')
      const result = data.results?.[0]
      if (result?.success) {
        await fetchMetaStatus()
        showToast(`Token refreshed for ${channel} (${result.tokenType})`)
      } else {
        throw new Error(result?.error || result?.skipped || 'Refresh failed')
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Refresh failed', 'error')
    } finally {
      setRefreshing(null)
    }
  }

  const runBulkSetup = async () => {
    if (!setupToken.trim()) return
    setSetupRunning(true)
    try {
      const res = await fetch('/api/meta-auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken: setupToken.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')
      await fetchMetaStatus()
      setSetupPanel(false)
      setSetupToken('')
      showToast(`Bulk setup complete — ${data.summary?.matched ?? 0} channels updated`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Setup failed', 'error')
    } finally {
      setSetupRunning(false)
    }
  }

  const tokenAge = (savedAt?: number): string => {
    if (!savedAt) return 'unknown age'
    const days = Math.floor((Date.now() - savedAt) / 86_400_000)
    if (days === 0) return 'saved today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-stone-900">Accounts</h1>
              <p className="text-[13px] text-stone-400 mt-1">All connected social accounts across your channels</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/api/auth/meta"
                className="px-3 py-2 text-[12px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Meta Accounts
              </a>
              <Link
                href="/meta-setup"
                className="px-3 py-2 text-[12px] font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Manual setup
              </Link>
            </div>
          </div>

          {/* One-time Meta redirect URI setup note */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-[13px] font-semibold text-amber-800 mb-1">⚠ One-time setup required before connecting Meta accounts</p>
            <p className="text-[12px] text-amber-700 leading-relaxed">
              Before the <strong>Connect Meta Accounts</strong> button will work, add this redirect URI in the{' '}
              <a
                href="https://developers.facebook.com/apps/915633637891649/fb-login/settings/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Meta Developer Console
              </a>
              {' '}(App ID <code className="bg-amber-100 px-1 rounded text-[11px]">915633637891649</code> → Facebook Login → Valid OAuth Redirect URIs):
            </p>
            <code className="mt-2 block text-[12px] bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg font-mono break-all">
              https://app.premirafirst.com/api/auth/meta/callback
            </code>
            <p className="text-[11px] text-amber-600 mt-2">
              This only needs to be done once. Once the URI is saved in Meta, the OAuth flow will work automatically.
            </p>
          </div>

          {/* Global Settings */}
          <div className="mb-6 bg-white border border-stone-100 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-stone-900 mb-4">Global Settings</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-stone-700">Background music on posts</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {includeMusic
                    ? 'Music bed added to generated videos. Can be overridden per post.'
                    : 'No background music by default. Toggle per post on the Long Form or Approvals pages.'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const next = !includeMusic
                  setIncludeMusic(next)
                  try {
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ includeMusic: next }),
                    })
                    showToast(`Music ${next ? 'enabled' : 'disabled'} globally`)
                  } catch { showToast('Failed to save setting', 'error') }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${includeMusic ? 'bg-stone-800' : 'bg-stone-200'}`}
                aria-label={includeMusic ? 'Disable music' : 'Enable music'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${includeMusic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ACCOUNT_DATA.map((ch) => {
              const config = CHANNELS[ch.channel]
              const pending = ch.accounts.filter(a => a.status === 'pending')
              const tip = pending.length > 0 ? PLATFORM_TIPS[pending[0].platform] : null
              const metaConnected = metaStatus[ch.channel]?.connected

              return (
                <div key={ch.channel} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: config?.primary ?? '#888' }} />
                  <div className="p-5">
                    <div className="mb-4">
                      <h2 className="text-[15px] font-semibold text-stone-900">{ch.channel}</h2>
                      <p className="text-[12px] text-stone-400 mt-0.5">{config?.tagline}</p>
                    </div>
                    <div className="space-y-2.5">
                      {ch.accounts.map((acc) => {
                        // Instagram and Facebook statuses are driven by live Meta token data
                        const isMetaPlatform = acc.platform === 'Instagram' || acc.platform === 'Facebook'
                        const metaChannelStatus = metaStatus[ch.channel]
                        const effectiveStatus = isMetaPlatform
                          ? (acc.status === 'connected' ||
                              (acc.platform === 'Instagram' && Boolean(metaChannelStatus?.instagramAccountId)) ||
                              (acc.platform === 'Facebook' && Boolean(metaChannelStatus?.facebookPageId))
                            ) ? 'connected' : 'pending'
                          : acc.status

                        return (
                        <div key={acc.platform} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-medium text-stone-600 w-20">{acc.platform}</span>
                            <span className="text-[12px] text-stone-400">{acc.handle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {effectiveStatus === 'connected' ? (
                              <>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">CONNECTED</span>
                                {acc.url && <a href={acc.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors">Visit &#8594;</a>}
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">PENDING</span>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>

                    {/* YouTube API connection */}
                    {(() => {
                      const yt = ytStatus[ch.channel]
                      const expectedId = EXPECTED_YT_CHANNEL_IDS[ch.channel]
                      const connectedId = yt?.youtube_channel_id
                      const wrongChannel = yt?.connected && expectedId && connectedId && connectedId !== expectedId
                      return (
                        <div className="mt-4 pt-4 border-t border-stone-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-stone-700">YouTube API</p>
                              {yt?.connected ? (
                                <div className="mt-0.5 space-y-1">
                                  <p className="text-[11px] text-stone-400 truncate">
                                    {yt?.youtube_handle || yt?.youtube_channel_name || 'Connected'}
                                  </p>
                                  {wrongChannel ? (
                                    <div>
                                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                                        ⚠ WRONG CHANNEL
                                      </span>
                                      <p className="text-[10px] text-red-600 mt-1 leading-tight">
                                        Connected to <code className="font-mono">{connectedId?.slice(0,12)}…</code> — expected <code className="font-mono">{expectedId?.slice(0,12)}…</code>. Reconnect and select the correct Brand Account.
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                      CONNECTED
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                  Connect to publish videos to YouTube
                                </p>
                              )}
                            </div>
                            {yt?.connected ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`/api/auth/youtube?channel=${encodeURIComponent(ch.channel)}`}
                                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${wrongChannel ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                >
                                  ↻ Reconnect
                                </a>
                                <button
                                  onClick={() => disconnectYt(ch.channel)}
                                  disabled={ytDisconnecting === ch.channel}
                                  className="text-[11px] text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                  {ytDisconnecting === ch.channel ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            ) : (
                              <a
                                href={`/api/auth/youtube?channel=${encodeURIComponent(ch.channel)}`}
                                className="shrink-0 px-3 py-1.5 text-[12px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Connect
                              </a>
                            )}
                          </div>
                          {wrongChannel && (
                            <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              <p className="text-[10px] text-red-700 leading-relaxed">
                                <strong>Action required:</strong> Click <strong>↻ Reconnect</strong>. On Google&apos;s screen, click <strong>&quot;Switch account&quot;</strong> or <strong>&quot;Use another account&quot;</strong> and sign in as the <strong>{ch.channel}</strong> Brand Account.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Meta (Instagram + Facebook) direct API connection */}
                    <div className="mt-4 pt-4 border-t border-stone-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-stone-700">Meta Graph API</p>
                          {metaConnected ? (
                            <div className="mt-0.5 space-y-0.5">
                              {metaStatus[ch.channel]?.instagramAccountId && (
                                <p className="text-[11px] text-stone-400 truncate">
                                  IG: {metaStatus[ch.channel]?.instagramAccountId}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                  metaStatus[ch.channel]?.tokenType === 'permanent'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {metaStatus[ch.channel]?.tokenType === 'permanent' ? 'PERMANENT' : 'SHORT-LIVED'}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {tokenAge(metaStatus[ch.channel]?.tokenSavedAt)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Connect to publish directly via the Meta API
                            </p>
                          )}
                        </div>
                        {metaConnected ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => refreshChannel(ch.channel)}
                              disabled={refreshing === ch.channel}
                              title="Refresh token using the stored user access token"
                              className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
                            >
                              {refreshing === ch.channel ? '…' : '↻ Refresh'}
                            </button>
                            <button
                              onClick={() => disconnect(ch.channel)}
                              disabled={disconnecting === ch.channel}
                              className="text-[11px] text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              {disconnecting === ch.channel ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openConnectForm(ch.channel)}
                            className="shrink-0 px-3 py-1.5 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    {tip && (
                      <div className="mt-3 pt-3 border-t border-stone-50">
                        <p className="text-[11px] text-stone-400"><span className="font-medium text-stone-500">Tip:</span> {tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Connect form modal */}
      {connectForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <h3 className="text-[16px] font-semibold text-stone-900 mb-1">Connect Meta API</h3>
              <p className="text-[12px] text-stone-400 mb-5">
                {connectForm.channel} — paste your credentials from{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Meta for Developers
                </a>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Page Access Token <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={connectForm.pageAccessToken}
                    onChange={e => setConnectForm(f => f ? { ...f, pageAccessToken: e.target.value } : null)}
                    placeholder="EAABwzLixnjYBO..."
                    className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono resize-none"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Generate a Page Access Token in Meta for Developers → Tools → Graph API Explorer. Select your Page and grant <code className="bg-stone-100 px-1 rounded">pages_manage_posts</code>, <code className="bg-stone-100 px-1 rounded">instagram_basic</code>, <code className="bg-stone-100 px-1 rounded">instagram_content_publish</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Facebook Page ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={connectForm.facebookPageId}
                    onChange={e => setConnectForm(f => f ? { ...f, facebookPageId: e.target.value } : null)}
                    placeholder="100000000000000"
                    className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Find via Graph API Explorer: <code className="bg-stone-100 px-1 rounded">GET /me/accounts</code> → copy the <code className="bg-stone-100 px-1 rounded">id</code> for your page.
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-stone-700 mb-1">
                    Instagram Business Account ID <span className="text-stone-400 font-normal">(optional — add later when Instagram is linked)</span>
                  </label>
                  <input
                    type="text"
                    value={connectForm.instagramAccountId}
                    onChange={e => setConnectForm(f => f ? { ...f, instagramAccountId: e.target.value } : null)}
                    placeholder="17841400000000000"
                    className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Find via: <code className="bg-stone-100 px-1 rounded">GET /&#123;page-id&#125;?fields=instagram_business_account</code>
                  </p>
                </div>

                {connectForm.error && (
                  <p className="text-[12px] text-red-600">{connectForm.error}</p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConnectForm(null)}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveConnectForm}
                disabled={connectForm.saving}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {connectForm.saving ? 'Saving...' : 'Save credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsPageInner />
    </Suspense>
  )
}
