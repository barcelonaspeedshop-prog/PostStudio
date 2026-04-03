'use client'
import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = {
  id: number
  title: string
  type: 'intro' | 'chapter' | 'outro'
  narration: string
  visual: string
  audio?: string // base64 data URL
}

type Script = {
  title: string
  summary: string
  totalWordCount: number
  estimatedDuration: string
  chapters: Chapter[]
}

const CHANNELS = [
  'Gentlemen of Fuel',
  'Omnira F1',
  'Road & Trax',
  'Omnira Football',
]

export default function LongFormPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState(CHANNELS[0])
  const [script, setScript] = useState<Script | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState<Record<number, boolean>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const generateScript = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return }
    setGenerating(true)
    setScript(null)
    try {
      const res = await fetch('/api/story-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScript(data.script)
      showToast(`Script ready — ${data.script.estimatedDuration} min`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating script', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const generateVoiceover = async (chapterIndex: number) => {
    if (!script) return
    const chapter = script.chapters[chapterIndex]
    if (!chapter) return

    setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: true }))
    try {
      const res = await fetch('/api/story-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chapter.narration, voiceId: 'P9S3WZL3JE8uQqgYH5B7' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setScript(prev => {
        if (!prev) return prev
        const updated = { ...prev, chapters: [...prev.chapters] }
        updated.chapters[chapterIndex] = { ...updated.chapters[chapterIndex], audio: data.audio }
        return updated
      })
      showToast(`Chapter ${chapter.id} voiceover ready`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating voiceover', 'error')
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [chapterIndex]: false }))
    }
  }

  const generateAllVoiceovers = async () => {
    if (!script) return
    setGeneratingAll(true)
    showToast('Generating all voiceovers...')
    for (let i = 0; i < script.chapters.length; i++) {
      if (!script.chapters[i].audio) {
        await generateVoiceover(i)
      }
    }
    setGeneratingAll(false)
    showToast('All voiceovers complete!')
  }

  const downloadFullAudio = () => {
    if (!script) return
    const allAudio = script.chapters
      .filter(c => c.audio)
      .map(c => c.audio!)

    if (allAudio.length === 0) {
      showToast('Generate voiceovers first', 'error')
      return
    }

    // If only one chapter has audio or we want individual downloads
    // For simplicity, download all chapters as individual files
    // A proper merge would require server-side ffmpeg
    if (allAudio.length === 1) {
      const a = document.createElement('a')
      a.href = allAudio[0]
      a.download = `${channel.replace(/\s+/g, '_')}_story_full.mp3`
      a.click()
      showToast('Audio downloaded!')
      return
    }

    // Concatenate audio: decode all base64 to ArrayBuffers and combine
    const combineParts = async () => {
      const parts: ArrayBuffer[] = []
      for (const dataUrl of allAudio) {
        const b64 = dataUrl.split(',')[1]
        const binary = atob(b64)
        const buf = new ArrayBuffer(binary.length)
        const view = new Uint8Array(buf)
        for (let j = 0; j < binary.length; j++) view[j] = binary.charCodeAt(j)
        parts.push(buf)
      }
      const totalLen = parts.reduce((s, p) => s + p.byteLength, 0)
      const combined = new Uint8Array(totalLen)
      let offset = 0
      for (const p of parts) {
        combined.set(new Uint8Array(p), offset)
        offset += p.byteLength
      }
      const blob = new Blob([combined], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${channel.replace(/\s+/g, '_')}_story_full.mp3`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Full audio downloaded!')
    }
    combineParts()
  }

  const chapterTypeLabel = (type: string) => {
    switch (type) {
      case 'intro': return 'INTRO'
      case 'outro': return 'OUTRO'
      default: return 'CHAPTER'
    }
  }

  const chapterTypeColor = (type: string) => {
    switch (type) {
      case 'intro': return 'bg-blue-100 text-blue-700'
      case 'outro': return 'bg-amber-100 text-amber-700'
      default: return 'bg-stone-100 text-stone-600'
    }
  }

  const allChaptersHaveAudio = script?.chapters.every(c => c.audio) ?? false
  const someChaptersHaveAudio = script?.chapters.some(c => c.audio) ?? false

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 shrink-0">
          <span className="text-[14px] font-medium text-stone-900">Long form story</span>
          {script && someChaptersHaveAudio && (
            <button
              onClick={downloadFullAudio}
              className="px-3 py-1.5 text-[12px] font-medium border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Download audio
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — controls */}
          <div className="w-72 border-r border-stone-100 overflow-y-auto p-5 flex flex-col gap-4 shrink-0">
            {/* Topic */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Story topic</p>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g. The untold story of the 1966 Le Mans rivalry"
                className="w-full text-[13px] border border-stone-200 rounded-lg p-2.5 resize-none bg-white focus:outline-none focus:border-stone-400 text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {/* Channel */}
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full text-[13px] border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400 text-stone-900"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Generate script */}
            <button
              onClick={generateScript}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Writing script...
                </>
              ) : (
                <><span className="text-[11px]">&#x270E;</span> Generate story</>
              )}
            </button>

            {/* Voiceover controls */}
            {script && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-purple-700 uppercase tracking-widest">Voiceover</p>
                <button
                  onClick={generateAllVoiceovers}
                  disabled={generatingAll || allChaptersHaveAudio}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white text-[13px] font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingAll ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Generating all...
                    </>
                  ) : allChaptersHaveAudio ? (
                    'All voiceovers ready'
                  ) : (
                    'Generate full voiceover'
                  )}
                </button>
                <p className="text-[10px] text-purple-500">
                  {script.chapters.filter(c => c.audio).length} / {script.chapters.length} chapters recorded
                </p>
              </div>
            )}

            {/* Script info */}
            {script && (
              <div className="bg-white border border-stone-100 rounded-xl p-4">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Script info</p>
                <div className="flex flex-col gap-1.5 text-[12px] text-stone-600">
                  <p>{script.totalWordCount} words</p>
                  <p>~{script.estimatedDuration} min read</p>
                  <p>{script.chapters.length} chapters</p>
                </div>
              </div>
            )}
          </div>

          {/* Main content — script chapters */}
          <div className="flex-1 overflow-y-auto p-6">
            {!script ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-stone-600">No script yet</p>
                  <p className="text-[12px] text-stone-400 mt-1">Enter a topic and click Generate story</p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto flex flex-col gap-5">
                {/* Title header */}
                <div className="mb-2">
                  <h1 className="text-[22px] font-semibold text-stone-900 leading-tight">{script.title}</h1>
                  <p className="text-[13px] text-stone-500 mt-1.5">{script.summary}</p>
                </div>

                {/* Chapters */}
                {script.chapters.map((chapter, i) => (
                  <div
                    key={chapter.id}
                    className="bg-white border border-stone-100 rounded-xl p-5 flex flex-col gap-3"
                  >
                    {/* Chapter header */}
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-medium tracking-widest uppercase px-2 py-0.5 rounded ${chapterTypeColor(chapter.type)}`}>
                        {chapterTypeLabel(chapter.type)}
                      </span>
                      <h2 className="text-[15px] font-medium text-stone-900">{chapter.title}</h2>
                    </div>

                    {/* Narration text */}
                    <p className="text-[13px] text-stone-700 leading-relaxed whitespace-pre-wrap">{chapter.narration}</p>

                    {/* Visual suggestion */}
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-0.5">Visual</p>
                      <p className="text-[12px] text-stone-500">{chapter.visual}</p>
                    </div>

                    {/* Audio controls */}
                    <div className="flex items-center gap-2 pt-1">
                      {chapter.audio ? (
                        <div className="flex items-center gap-2 flex-1">
                          <audio
                            ref={el => { audioRefs.current[i] = el }}
                            src={chapter.audio}
                            controls
                            className="flex-1 h-8"
                            style={{ maxWidth: '100%' }}
                          />
                          <button
                            onClick={() => generateVoiceover(i)}
                            disabled={generatingAudio[i]}
                            className="px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-500 shrink-0"
                          >
                            Redo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateVoiceover(i)}
                          disabled={generatingAudio[i] || generatingAll}
                          className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingAudio[i] ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                              </svg>
                              Generating...
                            </>
                          ) : (
                            <>&#9654; Generate voiceover</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-stone-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
