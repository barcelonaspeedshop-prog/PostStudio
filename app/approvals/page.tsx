'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

type Slide = {
  num: string; tag: string; headline: string; body: string; badge: string; accent: string; image?: string
}

type ApprovalItem = {
  id: string
  channel: string
  headline: string
  topic: string
  slides: Slide[]
  videoBase64?: string
  platforms: string[]
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: string
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/approvals')
      const data = await res.json()
      setItems(data)
    } catch {
      showToast('Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActing(id)
    try {
      const res = await fetch('/api/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setItems(prev => prev.map(i => i.id === id ? { ...i, status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date().toISOString() } : i))

      if (data.publishError) {
        showToast(`Approved but publish failed: ${data.publishError}`)
      } else if (action === 'approve') {
        showToast(`Approved & published: ${data.published ? 'sent to platforms' : 'no video to publish'}`)
      } else {
        showToast('Rejected')
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActing(null)
    }
  }

  const pending = items.filter(i => i.status === 'pending')
  const reviewed = items.filter(i => i.status !== 'pending')

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-12 bg-white border-b border-stone-100 flex items-center px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Approvals</span>
          {pending.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-medium rounded-full">{pending.length} pending</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">

            {/* Pending */}
            {loading ? (
              <p className="text-[13px] text-stone-400 text-center py-12">Loading...</p>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-stone-600">No pending approvals</p>
                <p className="text-[12px] text-stone-400 mt-1">Content sent for approval will appear here</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Pending review</p>
                {pending.map(item => (
                  <div key={item.id} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                    <div className="p-4 flex gap-3">
                      {/* Thumbnail */}
                      {item.slides[0]?.image && (
                        <div
                          className="w-16 h-20 rounded-lg bg-stone-100 shrink-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${item.slides[0].image})` }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-stone-900 truncate">{item.headline}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{item.channel}</p>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.platforms.map(p => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded capitalize">{p}</span>
                          ))}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1.5">{item.slides.length} slides · {formatDate(item.createdAt)}</p>
                      </div>
                    </div>

                    {/* Expandable detail */}
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="w-full px-4 py-1.5 text-[11px] text-stone-400 hover:text-stone-600 border-t border-stone-50 transition-colors"
                    >
                      {expandedId === item.id ? 'Hide slides' : `Preview ${item.slides.length} slides`}
                    </button>

                    {expandedId === item.id && (
                      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                        {item.slides.map((s, i) => (
                          <div key={i} className="w-[100px] h-[125px] rounded-lg bg-stone-800 shrink-0 relative overflow-hidden" style={{ background: s.image ? `url(${s.image}) center/cover` : '#1a1a1a' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-white text-[8px] font-medium leading-tight line-clamp-2">{s.headline}</p>
                            </div>
                            <span className="absolute top-1 right-1 text-white/50 text-[7px]">{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 px-4 pb-4 pt-2">
                      <button
                        onClick={() => handleAction(item.id, 'approve')}
                        disabled={acting === item.id}
                        className="flex-1 px-4 py-2.5 min-h-[44px] bg-green-600 text-white text-[13px] font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {acting === item.id ? 'Processing...' : 'Approve & Post'}
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'reject')}
                        disabled={acting === item.id}
                        className="flex-1 px-4 py-2.5 min-h-[44px] border border-red-200 text-red-600 text-[13px] font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">Recently reviewed</p>
                {reviewed.slice(0, 20).map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl">
                    {item.slides[0]?.image && (
                      <div
                        className="w-10 h-12 rounded-md bg-stone-100 shrink-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.slides[0].image})` }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-stone-800 truncate">{item.headline}</p>
                      <p className="text-[10px] text-stone-400">{item.channel} · {formatDate(item.reviewedAt || item.createdAt)}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 bg-stone-900 text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
