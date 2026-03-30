import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'PostStudio — Social Media Composer',
  description: 'AI-powered social media post composer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.variable}>{children}</body>
    </html>
  )
}
