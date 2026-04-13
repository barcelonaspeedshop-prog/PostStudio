'use client'
import Sidebar from '@/components/Sidebar'
import { CHANNELS } from '@/lib/channels'

const CHANNEL_NAMES = Object.keys(CHANNELS)

type ChannelStats = { views: string; followers: string; engagement: string; posts: number; topFormat: string; topTopic: string }

const PLACEHOLDER_STATS: Record<string, ChannelStats> = {
  'Gentlemen of Fuel': { views: '12.4K', followers: '2.1K', engagement: '4.2%', posts: 24, topFormat: 'Carousel', topTopic: 'Pagani Huayra launch' },
  'Omnira F1': { views: '31.8K', followers: '5.6K', engagement: '6.1%', posts: 31, topFormat: 'Short video', topTopic: 'Verstappen title race' },
  'Road & Trax': { views: '8.2K', followers: '1.4K', engagement: '3.8%', posts: 18, topFormat: 'Carousel', topTopic: 'Le Mans preview' },
  'Omnira Football': { views: '22.1K', followers: '3.9K', engagement: '5.4%', posts: 28, topFormat: 'Reel', topTopic: 'Champions League final' },
  'Omnira Cricket': { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' },
  'Omnira Golf': { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' },
  'Omnira NFL': { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' },
  'Omnira Food': { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' },
  'Omnira Travel': { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' },
}

const DEFAULT_STATS: ChannelStats = { views: '0', followers: '0', engagement: '0%', posts: 0, topFormat: '-', topTopic: '-' }

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-stone-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-stone-900">Analytics</h1>
              <p className="text-[13px] text-stone-400 mt-1">Performance overview across all channels</p>
            </div>
            <span className="text-[11px] bg-amber-50 text-amber-700 font-medium px-3 py-1.5 rounded-lg border border-amber-100">
              Live data coming soon
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total views', value: '74.5K' },
              { label: 'Total followers', value: '13.0K' },
              { label: 'Avg engagement', value: '4.9%' },
              { label: 'Posts this month', value: '101' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-stone-100 rounded-xl p-4">
                <p className="text-[11px] text-stone-400 mb-1">{stat.label}</p>
                <p className="text-[22px] font-semibold text-stone-900">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {CHANNEL_NAMES.map(name => {
              const config = CHANNELS[name]
              const stats = PLACEHOLDER_STATS[name] || DEFAULT_STATS
              return (
                <div key={name} className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: config.primary }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-[14px] font-semibold text-stone-900">{name}</h2>
                        <p className="text-[11px] text-stone-400">{config.tagline}</p>
                      </div>
                      <span className="text-[11px] text-stone-400">{stats.posts} posts</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: 'Views', value: stats.views },
                        { label: 'Followers', value: stats.followers },
                        { label: 'Engagement', value: stats.engagement },
                        { label: 'Top format', value: stats.topFormat },
                        { label: 'Top topic', value: stats.topTopic },
                      ].map(s => (
                        <div key={s.label} className="bg-stone-50 rounded-lg p-3">
                          <p className="text-[10px] text-stone-400 mb-1">{s.label}</p>
                          <p className="text-[13px] font-medium text-stone-800 truncate">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 p-4 bg-stone-50 border border-stone-100 rounded-xl">
            <p className="text-[12px] font-medium text-stone-600 mb-1">Connecting live analytics</p>
            <p className="text-[12px] text-stone-400">YouTube Analytics API, Instagram Insights, and TikTok Analytics will be connected here to show real performance data.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
