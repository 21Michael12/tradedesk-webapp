import type { Metadata } from 'next'
import { Public_Sans, Inter } from 'next/font/google'
import './globals.css'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TradeDesk | יומן המסחר המקצועי',
  description: 'יומן מסחר מקצועי לסוחרי פיוצ׳רס בישראל',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`dark ${publicSans.variable} ${inter.variable}`}
    >
      <head>
        {/* Material Symbols icon font — loaded globally */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-screen w-full bg-background text-on-surface font-body-md antialiased">
        {children}
      </body>
    </html>
  )
}
