import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://app.premirafirst.com'),
}

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/food/assets/style.css" />
      {children}
    </>
  )
}
