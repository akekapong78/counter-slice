import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Counter-Slice',
  description: 'PDF OCG Layer Counter',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface text-on-surface min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
