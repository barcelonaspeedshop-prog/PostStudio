'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'

type Chapter = { id: number; title: string; type: string; narration: string; visual: string }
type Script = { title: string; summary: string; chapters: Chapter[] }

const CHANNELS = ['Gentlemen of Fuel', 'Omnira F1', 'Road & Trax', 'Omnira Football']

const Spinner = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
)

export default function LongFormPage() {
  const [topic, setTopic] = useState('')
  const [channel, setChannel] = useState(CHANNELS[0])
  const [script, setScript] = useState<Script | null>(null)
  const [generating, setGenerating] = useState(false)
  const [chapterMedia, setChapterMedia] = useState<Record<number, File[]>>({})
  const [assembling, setAssembling] = useState(false)
  const [assemblyProgress, setAssemblyProgress] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type?: 'error' | 'success' } | null>(null)
  const [chapterAudio, setChapterAudio] = useState<Record<number, string>>({}) // chapterId -> base64 data URL
  const [voiceoverStatus, setVoiceoverStatus] = useState<Record<number, 'generating' | 'ready'>>({})
  const [generatingAllVoiceovers, setGeneratingAllVoiceovers] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testDuration, setTestDuration] = useState<10 | 30>(10)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const generateTestAudio = (durationSeconds: number): string => {
    const sampleRate = 44100
    const numSamples = sampleRate * durationSeconds
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = numSamples * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return 'data:audio/wav;base64,' + btoa(binary)
  }

  const generateTestVoiceover = (chapterId: number) => {
    const audioDataUrl = generateTestAudio(testDuration)
    setChapterAudio(prev => ({ ...prev, [chapterId]: audioDataUrl }))
    setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'ready' }))
    showToast(`Chapter ${chapterId} test audio ready (${testDuration}s)`)
  }

  // ─── Script generation ───
  const generateScript = async () => {
    if (!topic.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/story-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScript(data.script)
      setChapterMedia({})
      setChapterAudio({})
      setVoiceoverStatus({})
      setVideoUrl(null)
      showToast('Script generated!')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error generating script', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // ─── Media handling ───
  const addMedia = (chapterId: number, files: FileList | null) => {
    if (!files || files.length === 0) return
    setChapterMedia(prev => ({
      ...prev,
      [chapterId]: [...(prev[chapterId] || []), ...Array.from(files)],
    }))
    showToast(`${files.length} file${files.length > 1 ? 's' : ''} added`)
  }

  const removeMedia = (chapterId: number, index: number) => {
    setChapterMedia(prev => ({
      ...prev,
      [chapterId]: (prev[chapterId] || []).filter((_, i) => i !== index),
    }))
  }

  // ─── Video assembly ───
  const assembleVideo = async () => {
    if (!script) return
    setAssembling(true)
    setAssemblyProgress('Uploading media...')
    setVideoUrl(null)
    try {
      const formData = new FormData()
      formData.append('chapters', JSON.stringify(script.chapters.map(ch => ({ id: ch.id, narration: ch.narration }))))

      for (const [chIdStr, files] of Object.entries(chapterMedia)) {
        for (const file of files) {
          formData.append('media', file, `ch${chIdStr}_${file.name}`)
          formData.append('mediaChapterIds', chIdStr)
        }
      }

      // Send chapter audio files so the backend can sync image timing to voiceover duration
      for (const [chIdStr, dataUrl] of Object.entries(chapterAudio)) {
        const base64 = dataUrl.split(',')[1]
        const mime = dataUrl.split(';')[0].split(':')[1] || 'audio/mpeg'
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const ext = mime.includes('wav') ? 'wav' : 'mp3'
        const blob = new Blob([bytes], { type: mime })
        formData.append('audio', blob, `ch${chIdStr}_voiceover.${ext}`)
        formData.append('audioChapterIds', chIdStr)
      }

      const startRes = await fetch('/api/story-video/start', { method: 'POST', body: formData })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error)

      setAssemblyProgress('Rendering video...')

      // Poll for completion
      const result = await new Promise<{ downloadUrl: string; duration: number }>((resolve, reject) => {
        const poll = async () => {
          try {
            const res = await fetch(`/api/story-video/status/${startData.jobId}`)
            const data = await res.json()
            if (data.status === 'complete') { resolve(data); return }
            if (data.status === 'error') { reject(new Error(data.error || 'Assembly failed')); return }
            if (data.progress) setAssemblyProgress(data.progress)
            setTimeout(poll, 3000)
          } catch (e) { reject(e) }
        }
        poll()
      })

      setVideoUrl(result.downloadUrl)
      showToast(`Video ready — ${Math.round(result.duration)}s`)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error assembling video', 'error')
    } finally {
      setAssembling(false)
      setAssemblyProgress('')
    }
  }

  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${channel.replace(/\s+/g, '_')}_story.mp4`
    a.click()
  }

  // ─── Voiceover generation ───
  const generateVoiceover = async (chapterId: number, text: string) => {
    setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'generating' }))
    try {
      const res = await fetch('/api/story-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChapterAudio(prev => ({ ...prev, [chapterId]: data.audio }))
      setVoiceoverStatus(prev => ({ ...prev, [chapterId]: 'ready' }))
      return true
    } catch (e: unknown) {
      setVoiceoverStatus(prev => { const n = { ...prev }; delete n[chapterId]; return n })
      showToast(e instanceof Error ? e.message : 'Voiceover failed', 'error')
      return false
    }
  }

  const generateAllVoiceovers = async () => {
    if (!script) return
    if (testMode) {
      for (const chapter of script.chapters) {
        if (!chapterAudio[chapter.id]) generateTestVoiceover(chapter.id)
      }
      showToast('All test audio ready!')
      return
    }
    setGeneratingAllVoiceovers(true)
    let success = 0
    for (const chapter of script.chapters) {
      if (chapterAudio[chapter.id]) { success++; continue }
      const ok = await generateVoiceover(chapter.id, chapter.narration)
      if (ok) success++
    }
    setGeneratingAllVoiceovers(false)
    showToast(`${success}/${script.chapters.length} voiceovers generated`)
  }

  const downloadCombinedAudio = async () => {
    if (!script) return
    // Collect audio blobs in chapter order
    const chunks: ArrayBuffer[] = []
    for (const chapter of script.chapters) {
      const dataUrl = chapterAudio[chapter.id]
      if (!dataUrl) continue
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      chunks.push(bytes.buffer)
    }
    if (chunks.length === 0) { showToast('No voiceovers to download', 'error'); return }
    const blob = new Blob(chunks, { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${channel.replace(/\s+/g, '_')}_voiceover.mp3`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Audio downloaded!')
  }

  const voiceoverCount = Object.keys(chapterAudio).length
  const allVoiceoversReady = script ? voiceoverCount === script.chapters.length : false

  // ─── Computed ───
  const hasAnyMedia = Object.values(chapterMedia).some(f => f.length > 0)
  const totalMedia = Object.values(chapterMedia).reduce((s, f) => s + f.length, 0)
  const chapterLabel = (type: string) => type === 'intro' ? 'INTRO' : type === 'outro' ? 'OUTRO' : 'CHAPTER'
  const chapterColor = (type: string) => type === 'intro' ? 'bg-blue-100 text-blue-700' : type === 'outro' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <div className="h-12 bg-white border-b border-stone-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-stone-900">Long form story</span>
            <button
              onClick={() => setTestMode(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
                testMode
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${testMode ? 'bg-amber-500' : 'bg-stone-300'}`} />
              Test mode
            </button>
            {testMode && (
              <>
                <select
                  value={testDuration}
                  onChange={(e) => setTestDuration(Number(e.target.value) as 10 | 30)}
                  className="text-[11px] border border-amber-300 rounded-lg px-2 py-1 bg-amber-50 text-amber-800 focus:outline-none"
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                </select>
                <span className="text-[11px] text-amber-600 font-medium">Test mode — no ElevenLabs charges</span>
              </>
            )}
          </div>
          {videoUrl && (
            <button onClick={downloadVideo} className="px-3 py-1.5 text-[12px] font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
              Download Video
            </button>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-72 border-r border-stone-100 overflow-y-auto p-5 flex flex-col gap-4 shrink-0">
            <div>
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Story topic</p>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The untold story of the 1966 Le Mans rivalry" className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-stone-400" rows={3} />
            </div>

            <div>
              <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-2">Channel</p>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-stone-400">
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button onClick={generateScript} disabled={generating} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white text-[13px] font-medium rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50">
              {generating ? <><Spinner /> Writing script...</> : <><span className="text-[11px]">&#x270E;</span> Generate story</>}
            </button>

            {/* Voiceover */}
            {script && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-violet-700 uppercase tracking-widest">Voiceover</p>
                <button
                  onClick={generateAllVoiceovers}
                  disabled={generatingAllVoiceovers || allVoiceoversReady}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50 ${testMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'}`}
                >
                  {generatingAllVoiceovers ? <><Spinner /> Generating...</> : allVoiceoversReady ? 'All voiceovers ready' : testMode ? 'Use test audio (all)' : <><span className="text-[11px]">&#9835;</span> Generate all voiceovers</>}
                </button>
                <p className="text-[10px] text-violet-500">{voiceoverCount}/{script.chapters.length} chapters voiced</p>
                {allVoiceoversReady && (
                  <button
                    onClick={downloadCombinedAudio}
                    className="w-full px-3 py-2 text-[12px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    &#8595; Download combined audio
                  </button>
                )}
              </div>
            )}

            {/* Assembly */}
            {script && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest">Video assembly</p>
                <button onClick={assembleVideo} disabled={assembling || !hasAnyMedia} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-[13px] font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {assembling ? <><Spinner /> Assembling...</> : !hasAnyMedia ? 'Upload images first' : <><span className="text-[11px]">&#9654;</span> Assemble video</>}
                </button>
                {assembling && assemblyProgress && <p className="text-[10px] text-emerald-600">{assemblyProgress}</p>}
                {!hasAnyMedia && <p className="text-[10px] text-emerald-500">Add images to chapters to enable</p>}
                {videoUrl && (
                  <button onClick={downloadVideo} className="w-full px-3 py-2 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    &#8595; Download 16:9 Video
                  </button>
                )}
              </div>
            )}

            {/* Info */}
            {script && (
              <div className="text-[11px] text-stone-400 space-y-0.5">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mb-1">Info</p>
                <p>{script.chapters.length} chapters</p>
                <p>{totalMedia} media files uploaded</p>
                <p>{voiceoverCount} voiceovers generated</p>
              </div>
            )}
          </div>

          {/* Right panel — chapters */}
          <div className="flex-1 overflow-y-auto p-6">
            {!script ? (
              <div className="flex flex-col items-center justify-center h-full text-stone-400">
                <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="text-[13px] font-medium">No script yet</p>
                <p className="text-[12px]">Enter a topic and click Generate story</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-stone-900 mb-2">{script.title}</h1>
                  <p className="text-[13px] text-stone-500">{script.summary}</p>
                </div>

                {script.chapters.map((chapter) => (
                  <div key={chapter.id} className="bg-white border border-stone-100 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${chapterColor(chapter.type)}`}>{chapterLabel(chapter.type)}</span>
                      <h2 className="text-[15px] font-semibold text-stone-900">{chapter.title}</h2>
                    </div>

                    <p className="text-[13px] text-stone-700 leading-relaxed">{chapter.narration}</p>

                    {/* Voiceover */}
                    <div className="flex items-center gap-2">
                      {voiceoverStatus[chapter.id] === 'generating' ? (
                        <div className="flex items-center gap-2 text-[12px] text-violet-600">
                          <Spinner className="w-3 h-3" />
                          <span>Generating voiceover...</span>
                        </div>
                      ) : chapterAudio[chapter.id] ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <audio src={chapterAudio[chapter.id]} controls className="h-8 flex-1 min-w-0" />
                          <button
                            onClick={() => generateVoiceover(chapter.id, chapter.narration)}
                            className="shrink-0 px-2 py-1 text-[10px] border border-stone-200 rounded-md hover:bg-stone-50 text-stone-500 transition-colors"
                          >
                            Redo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => testMode ? generateTestVoiceover(chapter.id) : generateVoiceover(chapter.id, chapter.narration)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${testMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
                        >
                          <span className="text-[10px]">&#9835;</span> {testMode ? 'Use test audio' : 'Generate voiceover'}
                        </button>
                      )}
                    </div>

                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-0.5">Visual</p>
                      <p className="text-[12px] text-stone-500">{chapter.visual}</p>
                    </div>

                    {/* Media upload */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); addMedia(chapter.id, e.dataTransfer.files) }}
                    >
                      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Media</p>

                      {(chapterMedia[chapter.id] || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(chapterMedia[chapter.id] || []).map((file, j) => (
                            <div key={j} className="relative group">
                              {file.type.startsWith('video/') ? (
                                <video src={URL.createObjectURL(file)} className="w-16 h-16 rounded-lg object-cover" muted playsInline />
                              ) : (
                                <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                              )}
                              <button onClick={() => removeMedia(chapter.id, j)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label
                        className="flex flex-col items-center justify-center min-h-[100px] border-2 border-dashed border-stone-300 rounded-lg py-6 px-4 text-center cursor-pointer hover:bg-stone-50 transition-colors"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('bg-emerald-50', 'border-emerald-400') }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400')}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('bg-emerald-50', 'border-emerald-400'); addMedia(chapter.id, e.dataTransfer.files) }}
                      >
                        <input type="file" accept="video/mp4,.mp4,video/quicktime,.mov,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp" multiple className="hidden" onChange={(e) => addMedia(chapter.id, e.target.files)} />
                        <svg className="w-7 h-7 mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-[12px] text-stone-500">Drop images or video here</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">MP4, MOV, JPG, PNG, WEBP</p>
                      </label>
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
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-[12px] font-medium shadow-sm z-50 ${toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
