import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'     // ← This is correct

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GarbGo PH - On-Demand Garbage Pickup',
  description: 'Fast & reliable segregated garbage pickup',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}