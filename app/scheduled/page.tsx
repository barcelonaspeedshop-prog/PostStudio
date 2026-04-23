'use client'
import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

type ScheduledItem = {
  id: string
  channel: string
  headline: string
  format: 'carousel' | 'short' | 'tiktok' | 'story'
  platform: 'instagram' | 'youtube' | 'tiktok'
  scheduledTime: string
  status: 'pending' | 'published' | 'failed'
  error?: string
  approvalId?: string
  clipFile?: string
  createdAt: string
}

const Spinner = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const FORMAT_LABELS: Record<string, { label: string; color: string }> = {
  carousel: { label: 'Carousel', color: 'bg-blue-100 text-blue-700' },
  short: { label: 'Short', color: 'bg-red-100 text-red-700' },
  tiktok: { label: 'TikTok', color: 'bg-stone-900 text-white' },
  story: { label: 'Story', color: 'bg-amber-100 text-amber-700' },
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-stone-100 text-stone-600',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function groupItems(items: ScheduledItem[]): { today: ScheduledItem[]; tomorrow: ScheduledItem[]; upcoming: ScheduledItem[] } {
  const now = new Date()
  const todayStr = now.toDateString()
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toDateString()

  const today: ScheduledItem[] = []
  const tomorrow: ScheduledItem[] = []
  const upcoming: ScheduledItem[] = []

  for (const item of items) {
    const d = new Date(item.scheduledTime).toDateString()
    if (d === todayStr) today.push(item)
    else if (d === tomorrowStr) tomorrow.push(item)
    else upcoming.push(item)
  }

  return { today, tomorrow, upcoming }
}

export default function ScheduledPage() {
  const [items, setItems] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled')
      if (res.ok) setItems(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    const interval = setInterval(fetchItems, 60000)
    return () => clearInterval(interval)
  }, [fetchItems])

  const updateTime = async (id: string) => {
    if (!editTime) return
    setSaving(id)
    try {
      const res = await fetch('/api/scheduled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scheduledTime: new Date(editTime).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.map(i => i.id === id ? { ...i, scheduledTime: new Date(editTime).toISOString() } : i))
      setEditingId(null)
      showToast('Time updated')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Update failed', 'error')
    } finally {
      setSaving(null)
    }
  }

  const cancelItem = async (id: string) => {
    setSaving(id)
    try {
      const res = await fetch('/api/scheduled', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.filter(i => i.id !== id))
      showToast('Post cancelled')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error')
    } finally {
      setSaving(null)
    }
  }

  const { today, tomorrow, upcoming } = groupItems(items)

  const renderCard = (item: ScheduledItem) => {
    const ch = CHANNELS[item.channel]
    const fmt = FORMAT_LABELS[item.format] || FORMAT_LABELS.carousel
    const isEditing = editingId === item.id
    const isSaving = saving === item.id

    return (
      <div key={item.id} className="bg-white border border-stone-100 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: ch?.primary || '#888' }}
            />
            <span className="text-[13px] font-medium text-stone-800">{item.channel}</span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[item.status]}`}>
            {item.status.toUpperCase()}
          </span>
        </div>

        <p className="text-[13px] text-stone-700 leading-snug">{item.headline}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${fmt.color}`}>{fmt.label}</span>
          <span className="text-[10px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded">{PLATFORM_LABELS[item.platform] || item.platform}</span>
          <span className="text-[11px] text-stone-400 ml-auto">{formatTime(item.scheduledTime)}</span>
        </div>

        {item.error && (
          <p className="text-[11px] text-red-500 bg-red-50 rounded px-2 py-1">{item.error}</p>
        )}

        {item.clipFile && (
          <a
            href={`/api/clips/${item.clipFile}`}
            download={item.clipFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors w-fit"
          >
            &#8595; Download clip
          </a>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="flex-1 text-[12px] border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-400"
            />
            <button
              onClick={() => updateTime(item.id)}
              disabled={isSaving}
              className="px-3 py-1.5 text-[11px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
            >
              {isSaving ? <Spinner className="w-3 h-3" /> : 'Save'}
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="px-2 py-1.5 text-[11px] text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {item.status === 'pending' && (
              <>
                <button
                  onClick={() => { setEditingId(item.id); setEditTime(toDatetimeLocal(item.scheduledTime)) }}
                  className="px-3 py-1.5 text-[11px] font-medium border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Edit time
                </button>
                <button
                  onClick={() => cancelItem(item.id)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-[11px] font-medium border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Spinner className="w-3 h-3" /> : 'Cancel'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderSection = (title: string, sectionItems: ScheduledItem[]) => {
    if (sectionItems.length === 0) return null
    return (
      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest">{title}</h2>
        <div className="space-y-3">
          {sectionItems.map(renderCard)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-12 bg-white border-b border-stone-100 flex items-center px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Scheduled posts</span>
          <span className="ml-3 text-[11px] text-stone-400">{items.length} total</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner className="w-5 h-5 text-stone-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[13px] font-medium">No scheduled posts</p>
              <p className="text-[12px] mt-1">Posts will appear here when you approve content in the Approvals queue</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              {renderSection('Today', today)}
              {renderSection('Tomorrow', tomorrow)}
              {renderSection('Upcoming', upcoming)}
              {upcoming.length > 0 && upcoming.some(i => {
                const d = new Date(i.scheduledTime)
                const now = new Date()
                const tomorrowDate = new Date(now)
                tomorrowDate.setDate(tomorrowDate.getDate() + 2)
                return d >= tomorrowDate
              }) && (
                <div className="space-y-2">
                  {upcoming.filter(i => {
                    const d = new Date(i.scheduledTime)
                    const now = new Date()
                    const tomorrowDate = new Date(now)
                    tomorrowDate.setDate(tomorrowDate.getDate() + 2)
                    return d >= tomorrowDate
                  }).length > 0 && (
                    <p className="text-[10px] text-stone-400 text-center pt-2">
                      Showing {upcoming.length} upcoming post{upcoming.length !== 1 ? 's' : ''} &middot; {formatDate(upcoming[upcoming.length - 1].scheduledTime)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
