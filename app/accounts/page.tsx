'use client'
import { useState, useEffect } from 'react'
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

const PLATFORM_TIPS: Record<string, string> = {
  TikTok: 'Set up TikTok to reach a younger, high-engagement audience',
  Instagram: 'Instagram Reels drive significant organic reach',
  Facebook: 'Facebook Pages unlock Meta Business Suite for cross-posting',
}

type MetaStatus = Record<string, { connected: boolean; instagramAccountId?: string; facebookPageId?: string }>

type ConnectForm = {
  channel: string
  pageAccessToken: string
  instagramAccountId: string
  facebookPageId: string
  saving: boolean
  error: string
}

export default function AccountsPage() {
  const [metaStatus, setMetaStatus] = useState<MetaStatus>({})
  const [connectForm, setConnectForm] = useState<ConnectForm | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

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

  useEffect(() => { fetchMetaStatus() }, [])

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

  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-stone-900">Accounts</h1>
            <p className="text-[13px] text-stone-400 mt-1">All connected social accounts across your channels</p>
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
                      {ch.accounts.map((acc) => (
                        <div key={acc.platform} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-medium text-stone-600 w-20">{acc.platform}</span>
                            <span className="text-[12px] text-stone-400">{acc.handle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {acc.status === 'connected' ? (
                              <>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">CONNECTED</span>
                                {acc.url && <a href={acc.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors">Visit &#8594;</a>}
                              </>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">PENDING</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meta (Instagram + Facebook) direct API connection */}
                    <div className="mt-4 pt-4 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-medium text-stone-700">Meta Graph API</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {metaConnected
                              ? `Instagram ID: ${metaStatus[ch.channel]?.instagramAccountId}`
                              : 'Connect to publish directly via the Meta API'}
                          </p>
                        </div>
                        {metaConnected ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">CONNECTED</span>
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
                            className="px-3 py-1.5 text-[12px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition-colors"
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
