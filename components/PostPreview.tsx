'use client'
import { useState } from 'react'
import { PLATFORMS, Platform } from '@/lib/platforms'

type Props = {
  title: string
  caption: string
  mediaSrc: string | null
  selectedPlatforms: string[]
  tags: string[]
  readiness: number
  onPublishAll: () => void
  onPublishTo: (platform: string) => void
}

export default function PostPreview({
  title, caption, mediaSrc, selectedPlatforms, tags, readiness, onPublishAll, onPublishTo,
}: Props) {
  const [activePrev, setActivePrev] = useState('instagram')
  const info = PLATFORMS.find((p) => p.id === activePrev) ?? PLATFORMS[0]

  return (
    <div className="w-full md:w-72 shrink-0 bg-white border-t md:border-t-0 md:border-l border-stone-100 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">
      <p className="text-[12px] font-medium text-stone-800">Preview</p>

      {/* Platform tabs */}
      <div className="flex gap-0 border-b border-stone-100">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePrev(p.id)}
            className={`px-2.5 py-1.5 text-[10px] border-b-[1.5px] -mb-px transition-colors cursor-pointer ${
              activePrev === p.id
                ? 'text-stone-900 font-medium border-stone-900'
                : 'text-stone-400 border-transparent hover:text-stone-600'
            }`}
          >
            {p.id === 'instagram' ? 'IG'
              : p.id === 'tiktok' ? 'TT'
              : p.id === 'twitter' ? 'X'
              : p.id === 'facebook' ? 'FB'
              : p.id === 'linkedin' ? 'LI'
              : 'YT'}
          </button>
        ))}
      </div>

      {/* Mock post */}
      <div className="border border-stone-100 rounded-xl overflow-hidden">
        <div className="p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-medium text-blue-600 shrink-0">
            YO
          </div>
          <div>
            <p className="text-[11px] font-medium text-stone-900">Your Account</p>
            <p className="text-[10px] text-stone-400">{info.handle}</p>
          </div>
        </div>
        <div className="bg-stone-50 h-28 flex items-center justify-center overflow-hidden">
          {mediaSrc ? (
            <img src={mediaSrc} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-7 h-7 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
        {title && (
          <p className="px-3 pt-2 text-[12px] font-medium text-stone-900 leading-tight">{title}</p>
        )}
        <p className="px-3 py-2 text-[11px] text-stone-700 leading-relaxed line-clamp-3">
          {caption || 'Your caption will appear here.'}
        </p>
        {tags.length > 0 && (
          <p className="px-3 pb-2 text-[10px] text-blue-500 leading-relaxed line-clamp-2">
            {tags.slice(0, 5).map((t) => `#${t}`).join(' ')}
          </p>
        )}
        <div className="px-3 py-2 border-t border-stone-100 flex gap-4">
          {['♡ Like', '◻ Comment', '↗ Share'].map((a) => (
            <span key={a} className="text-[10px] text-stone-400">{a}</span>
          ))}
        </div>
      </div>

      {/* Readiness */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-stone-500">Readiness</span>
          <span className="text-[10px] text-stone-500">{readiness}%</span>
        </div>
        <div className="h-0.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-800 rounded-full transition-all duration-300"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>

      {/* Publish */}
      <div>
        <p className="text-[10px] text-stone-500 mb-2">Publish to</p>
        <button
          onClick={onPublishAll}
          className="w-full bg-stone-900 text-white text-[14px] md:text-[12px] font-medium py-3 min-h-[44px] rounded-lg hover:bg-stone-800 transition-colors mb-2"
        >
          Publish to all platforms
        </button>
        <div className="flex flex-wrap gap-1.5">
          {selectedPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => onPublishTo(p)}
              className="text-[12px] md:text-[10px] px-3 py-2 min-h-[36px] border border-stone-200 rounded-md hover:bg-stone-50 transition-colors capitalize"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="pt-3 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 mb-1 font-medium">Platform tip</p>
        <p className="text-[10px] text-stone-400 leading-relaxed">{info.tip}</p>
      </div>
    </div>
  )
}
