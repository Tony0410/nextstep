import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Next Step - Health Management',
  description: 'A calm, reliable app to help manage appointments, medications, and notes for health care.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Next Step',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#528252',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="paper-texture">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
