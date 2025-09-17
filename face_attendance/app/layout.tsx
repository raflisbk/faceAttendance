import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Face Attendance System',
  description: 'Advanced face recognition attendance system for educational institutions',
  keywords: 'face recognition, attendance, education, biometric, AI',
  authors: [{ name: 'Face Attendance Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#0f172a',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Face Attendance System',
    description: 'Advanced face recognition attendance system',
    type: 'website',
    siteName: 'Face Attendance System',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Face Attendance" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={cn(inter.className, "antialiased bg-slate-950 text-white")}>
        <Providers>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
