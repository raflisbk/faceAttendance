import type { Metadata, Viewport } from 'next'
import { Inter, Kalam } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })
const kalam = Kalam({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-chalk'
})

export const metadata: Metadata = {
  title: 'Face Attendance System',
  description: 'Advanced face recognition attendance system for educational institutions',
  keywords: 'face recognition, attendance, education, biometric, AI',
  authors: [{ name: 'Face Attendance Team' }],
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
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
      <body className={cn(inter.className, kalam.variable, "antialiased blackboard-bg chalk-text")}>
        <Providers>
          <Toaster>
            <div className="animate-fade-in">
              {children}
            </div>
          </Toaster>
        </Providers>
      </body>
    </html>
  )
}
