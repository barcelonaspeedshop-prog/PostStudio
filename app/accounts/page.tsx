'use client'
import { useState, useEffect, Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import { useSearchParams } from 'next/navigation'

const CHANNELS = [
  { name: 'Gentlemen of Fuel', short: 'GoF' },
  { name: 'Omnira F1', short: 'F1' },
  { name: 'Road & Trax', short: 'R&T' },
  { name: 'Omnira Football', short: 'FB' },
]

type ChannelStatus = {
  connected: boolean
  youtube_channel_name?: string
  youtube_channel_id?: string
  youtube_handle?: string
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  )
}

function AccountsContent() {
  const searchParams = useSearchParams()
  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({})
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/auth/youtube?action=status')
      const data = await res.json()
      setStatuses(data)
    } catch (e) {
      console.error('Failed to fetch statuses:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatuses()
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) showToast(`Connected: ${connected}`)
    if (error) showToast(`Error: ${error}`)
  }, [searchParams])

  const disconnect = async (channelName: string) => {
    setDisconnecting(channelName)
    try {
      await fetch(`/api/auth/youtube?action=disconnect&channel=${encodeURIComponent(channelName)}`)
      setStatuses(prev => {
        const updated = { ...prev }
        delete updated[channelName]
        return updated
      })
      showToast(`Disconnected: ${channelName}`)
    } catch {
      showToast('Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Accounts</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-xl mx-auto flex flex-col gap-6">
            {/* YouTube section */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-stone-900">YouTube</p>
                  <p className="text-[12px] text-stone-400">Direct publishing via YouTube Data API</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-stone-400">Loading accounts...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {CHANNELS.map(({ name, short }) => {
                    const status = statuses[name]
                    const isConnected = status?.connected
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-3 p-4 bg-white border border-stone-100 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                            isConnected ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                          }`}>
                            {short}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-stone-900">{name}</p>
                            {isConnected ? (
                              <p className="text-[11px] text-green-600 truncate">
                                Connected — {status.youtube_channel_name}{status.youtube_handle ? ` (${status.youtube_handle})` : ''}
                              </p>
                            ) : (
                              <p className="text-[11px] text-stone-400">Not connected</p>
                            )}
                          </div>
                        </div>

                        {isConnected ? (
                          <button
                            onClick={() => disconnect(name)}
                            disabled={disconnecting === name}
                            className="px-3 py-2 min-h-[40px] text-[12px] font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                          >
                            {disconnecting === name ? 'Removing...' : 'Disconnect'}
                          </button>
                        ) : (
                          <a
                            href={`/api/auth/youtube?channel=${encodeURIComponent(name)}`}
                            className="px-3 py-2 min-h-[40px] text-[12px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shrink-0 flex items-center"
                          >
                            Connect
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Postproxy section */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
                  <span className="text-white text-[11px] font-medium">PP</span>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-stone-900">Postproxy</p>
                  <p className="text-[12px] text-stone-400">Multi-platform distribution (IG, TikTok, X, FB)</p>
                </div>
              </div>
              <div className="p-4 bg-white border border-stone-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-[13px] text-stone-600">Connected via API key</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 bg-stone-900 text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
