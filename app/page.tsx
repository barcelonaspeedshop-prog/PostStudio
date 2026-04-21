'use client'
import { useState, useCallback, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import PostPreview from '@/components/PostPreview'
import { generatePostContent, regenerateField, PostContent } from '@/lib/claude'
import { PLATFORMS, TONES, FORMATS } from '@/lib/platforms'
import { CHANNELS as CHANNEL_CONFIGS } from '@/lib/channels'

const CHANNEL_NAMES = Object.keys(CHANNEL_CONFIGS)

type Toast = { msg: string; type?: 'success' | 'error' }

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = (msg: string, type: Toast['type'] = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }
  return { toast, show }
}

export default function ComposerPage() {
  const { toast, show } = useToast()

  // Channel
  const [selectedChannel, setSelectedChannel] = useState(CHANNEL_NAMES[0])
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [statusLoading, setStatusLoading] = useState(false)

  // AI prompt
  const [aiPrompt, setAiPrompt] = useState('')
  const [tone, setTone] = useState('casual')
  const [generating, setGenerating] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Post fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [caption, setCaption] = useState('')
  const [cta, setCta] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Platform / format
  const [selPlatforms, setSelPlatforms] = useState<string[]>([])
  const [selFormat, setSelFormat] = useState('30s reel')
  const [timing, setTiming] = useState('now')
  const [scheduleDt, setScheduleDt] = useState('')

  // Media
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaSrc, setMediaSrc] = useState<string | null>(null)

  // Load connected platform status whenever the channel changes
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setStatusLoading(true)
      try {
        const [ytRes, metaRes] = await Promise.all([
          fetch('/api/auth/youtube?action=status'),
          fetch('/api/auth/meta?action=status'),
        ])
        const ytStatus = ytRes.ok ? await ytRes.json() : {}
        const metaStatus = metaRes.ok ? await metaRes.json() : {}
        if (cancelled) return
        const connected: string[] = []
        if (ytStatus[selectedChannel]?.connected) connected.push('youtube')
        if (metaStatus[selectedChannel]?.instagram) connected.push('instagram')
        if (metaStatus[selectedChannel]?.facebook) connected.push('facebook')
        setConnectedPlatforms(connected)
        setSelPlatforms(prev => prev.filter(p => connected.includes(p)))
      } catch {
        // non-fatal — show all platforms if status check fails
        setConnectedPlatforms([])
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedChannel])

  // Readiness
  const readiness = Math.min(
    100,
    (mediaFiles.length > 0 ? 20 : 0) +
    (title.length > 2 ? 20 : 0) +
    (caption.length > 5 ? 20 : 0) +
    (selPlatforms.length > 0 ? 20 : 0) +
    (tags.length > 0 ? 10 : 0) +
    (description.length > 5 ? 10 : 0)
  )

  const togglePlatform = (id: string) => {
    setSelPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setMediaFiles((prev) => [...prev, ...arr])
    // Read the first media file (image, video, or audio) as a data URL for preview and publish
    const media = arr.find((f) => f.type.startsWith('image') || f.type.startsWith('video') || f.type.startsWith('audio'))
    if (media) {
      const reader = new FileReader()
      reader.onload = (e) => setMediaSrc(e.target?.result as string)
      reader.readAsDataURL(media)
    }
  }

  const addTag = () => {
    const v = tagInput.trim().replace(/^#/, '')
    if (!v || tags.includes(v)) return
    setTags((prev) => [...prev, v])
    setTagInput('')
  }

  const removeTag = (i: number) => setTags((prev) => prev.filter((_, idx) => idx !== i))

  const applyContent = (content: Partial<PostContent>) => {
    if (content.title !== undefined) setTitle(content.title)
    if (content.description !== undefined) setDescription(content.description)
    if (content.caption !== undefined) setCaption(content.caption)
    if (content.cta !== undefined) setCta(content.cta)
    if (content.tags !== undefined) setTags((prev) => [...new Set([...prev, ...content.tags!])])
  }

  const handleGenerateAll = async () => {
    if (!aiPrompt.trim()) { show('Enter a description first', 'error'); return }
    setGenerating(true)
    setAiStatus('Generating your full post content...')
    try {
      const content = await generatePostContent(aiPrompt, selPlatforms, tone)
      applyContent(content)
      show('Content generated!')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setGenerating(false)
      setAiStatus('')
    }
  }

  const handleRegenField = async (field: 'title' | 'description' | 'caption' | 'tags' | 'cta') => {
    if (!aiPrompt.trim() && !title) { show('Add a description first', 'error'); return }
    setAiStatus(`Regenerating ${field}...`)
    try {
      const result = await regenerateField(field, {
        promptText: aiPrompt || title,
        platforms: selPlatforms,
        tone,
        currentValue: field === 'description' ? description : undefined,
      })
      if (field === 'tags' && Array.isArray(result)) {
        setTags((prev) => [...new Set([...prev, ...(result as string[])])])
      } else if (field === 'title') setTitle(result as string)
      else if (field === 'description') setDescription(result as string)
      else if (field === 'caption') setCaption(result as string)
      else if (field === 'cta') setCta(result as string)
      show('Done!')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setAiStatus('')
    }
  }

  const doPublish = async (platforms: string[]) => {
    const connected = platforms.filter(p => connectedPlatforms.includes(p))
    if (!connected.length) {
      show('No connected platforms selected — connect them on the Accounts page first', 'error')
      return
    }
    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption || description || title,
          imageUrls: mediaSrc ? [mediaSrc] : undefined,
          platforms: connected,
          channel: selectedChannel,
        }),
      })
      const data = await res.json()
      const succeeded = (data.results as Array<{ success: boolean }> | undefined)
        ?.filter(r => r.success).length ?? 0
      const errors = (data.results as Array<{ success: boolean; skipped?: boolean; error?: string }> | undefined)
        ?.filter(r => !r.success && !r.skipped).map(r => r.error).filter(Boolean) ?? []
      if (succeeded > 0) {
        show(`Published to ${succeeded} platform${succeeded !== 1 ? 's' : ''}!`)
      } else if (errors.length) {
        show(errors[0] || 'Publish failed', 'error')
      } else {
        show('No platforms published — check connection status', 'error')
      }
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'Publish failed', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const publishAll = () => {
    if (!selPlatforms.length) { show('Select at least one platform', 'error'); return }
    doPublish(selPlatforms)
  }

  const publishTo = (p: string) => doPublish([p])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 pl-14 md:pl-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">New post</span>
          <div className="flex gap-2">
            <button
              onClick={() => show('Draft saved')}
              className="px-3 py-2 min-h-[44px] text-[13px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Save draft
            </button>
            <button
              onClick={publishAll}
              disabled={publishing}
              className="px-3 py-2 min-h-[44px] text-[13px] font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Composer scroll area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">

            {/* Channel selector */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Channel</p>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shrink-0 pointer-events-none"
                  style={{ background: CHANNEL_CONFIGS[selectedChannel]?.primary ?? '#888' }}
                />
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-[13px] border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:border-stone-400 appearance-none cursor-pointer"
                >
                  {CHANNEL_NAMES.map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {!statusLoading && connectedPlatforms.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-2">
                  No platforms connected for this channel —{' '}
                  <a href="/accounts" className="underline hover:text-amber-800">connect on Accounts page</a>
                </p>
              )}
              {!statusLoading && connectedPlatforms.length > 0 && (
                <p className="text-[11px] text-stone-400 mt-2">
                  Connected: {connectedPlatforms.join(', ')}
                </p>
              )}
            </div>

            {/* AI Prompt Card */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">AI content generator</p>
              <p className="text-[12px] text-stone-500 mb-3">Describe your post — AI fills in the title, description, caption, tags, and CTA.</p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. A product launch video for our new wireless headphones. Target: music lovers 18–35. Key message: studio-quality sound at an affordable price."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg p-3 md:p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors capitalize ${
                        tone === t
                          ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateAll}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-stone-900 text-white text-[14px] md:text-[12px] font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {generating ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <><span className="text-[10px]">✦</span> Generate all</>
                  )}
                </button>
              </div>
              {aiStatus && (
                <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1.5">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  {aiStatus}
                </p>
              )}
            </div>

            {/* Media */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Media</p>
              <label
                className="block border-2 border-dashed border-stone-300 rounded-xl p-6 md:p-5 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-stone-50') }}
                onDragLeave={(e) => e.currentTarget.classList.remove('bg-stone-50')}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
              >
                <input type="file" multiple accept="video/mp4,.mp4,video/quicktime,.mov,video/webm,.webm,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp,audio/mpeg,.mp3,audio/wav,.wav,audio/aac,.aac" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <svg className="w-7 h-7 mx-auto mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-[13px] text-stone-500">Drop video, images or music</p>
                <p className="text-[11px] text-stone-400 mt-0.5">MP4, MOV, JPG, PNG, MP3, WAV</p>
              </label>
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-stone-100 border border-stone-200 relative flex items-center justify-center overflow-hidden">
                      {f.type.startsWith('image') ? (
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      ) : f.type.startsWith('video') ? (
                        <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <span className="text-[9px] font-medium text-stone-500">AUD</span>
                      )}
                      <button
                        onClick={() => setMediaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-4 h-4 bg-stone-900 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platforms */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Platforms</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isConnected = connectedPlatforms.includes(p.id)
                  const isSelected = selPlatforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => isConnected && togglePlatform(p.id)}
                      title={isConnected ? undefined : `${p.label} not connected for ${selectedChannel}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-all ${
                        !isConnected
                          ? 'border-stone-100 text-stone-300 cursor-not-allowed'
                          : isSelected
                          ? 'border-stone-400 bg-stone-100 text-stone-900 font-medium'
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isConnected ? p.color : '#d4d4d4' }} />
                      {p.label}
                      {!isConnected && <span className="text-[9px] text-stone-300">✕</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <Field label="Post title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your post title..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <AIStrip onRegen={() => handleRegenField('title')} label="Regenerate title" loading={aiStatus.includes('title')} />
            </Field>

            {/* Description */}
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Full post description..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between mt-1.5">
                <AIStrip
                  onRegen={() => handleRegenField('description')}
                  label="Regenerate"
                  loading={aiStatus.includes('description')}
                  extra={[{ label: 'Improve', onClick: () => handleRegenField('description') }]}
                />
                <span className="text-[10px] text-stone-400">{description.length} chars</span>
              </div>
            </Field>

            {/* Caption */}
            <Field label="Caption">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Short punchy caption..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between mt-1.5">
                <AIStrip onRegen={() => handleRegenField('caption')} label="Regenerate" loading={aiStatus.includes('caption')} />
                <span className="text-[10px] text-stone-400">{caption.length} / 2200</span>
              </div>
            </Field>

            {/* Tags */}
            <Field label="Tags & hashtags">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-full text-stone-600">
                    #{t}
                    <button onClick={() => removeTag(i)} className="text-stone-400 hover:text-stone-700 text-[10px] leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tag"
                  className="flex-1 text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
                />
                <button onClick={addTag} className="px-3 py-2 text-[12px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">Add</button>
                <AIStrip onRegen={() => handleRegenField('tags')} label="✦ AI suggest" loading={aiStatus.includes('tags')} />
              </div>
            </Field>

            {/* CTA */}
            <Field label="Call to action">
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. Link in bio! Shop now at..."
                className="w-full text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
              <AIStrip onRegen={() => handleRegenField('cta')} label="Generate CTA" loading={aiStatus.includes('cta')} />
            </Field>

            {/* Format */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">Format & duration</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setSelFormat(f)}
                    className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
                      selFormat === f
                        ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-3">When to publish</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {['now', 'schedule', 'ai'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTiming(t)}
                    className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all ${
                      timing === t
                        ? 'bg-stone-100 border-stone-300 text-stone-900 font-medium'
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {t === 'now' ? 'Publish now' : t === 'schedule' ? 'Schedule' : '✦ Best time (AI)'}
                  </button>
                ))}
              </div>
              {timing === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduleDt}
                  onChange={(e) => setScheduleDt(e.target.value)}
                  className="text-[16px] md:text-[13px] border border-stone-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white focus:outline-none focus:border-stone-400 text-stone-900"
                />
              )}
              {timing === 'ai' && (
                <p className="text-[11px] text-stone-400">AI will pick the optimal time per platform based on your audience engagement patterns.</p>
              )}
            </div>

          </div>

          {/* Preview Panel */}
          <PostPreview
            title={title}
            caption={caption}
            mediaSrc={mediaSrc}
            selectedPlatforms={selPlatforms}
            tags={tags}
            readiness={readiness}
            onPublishAll={publishAll}
            onPublishTo={publishTo}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 transition-all ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-100 rounded-xl p-4">
      <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2.5">{label}</p>
      {children}
    </div>
  )
}

function AIStrip({
  onRegen, label, loading, extra,
}: {
  onRegen: () => void
  label: string
  loading?: boolean
  extra?: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap">
      <button
        onClick={onRegen}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-stone-200 rounded-full text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors disabled:opacity-40"
      >
        <span className="text-[9px]">✦</span> {label}
      </button>
      {extra?.map((e) => (
        <button
          key={e.label}
          onClick={e.onClick}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] border border-stone-200 rounded-full text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors"
        >
          <span className="text-[9px]">✦</span> {e.label}
        </button>
      ))}
    </div>
  )
}
