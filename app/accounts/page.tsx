'use client'
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

export default function AccountsPage() {
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
                    {tip && (
                      <div className="mt-4 pt-3 border-t border-stone-50">
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
    </div>
  )
}
