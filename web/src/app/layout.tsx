import type { Metadata } from 'next'
import { IBM_Plex_Mono, Archivo, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
})

export const metadata: Metadata = {
  title: 'Heavy Sweater Resource',
  description: 'Band internal song tool',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Heavy Sweater',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${archivo.variable} ${ibmPlexSans.variable}`}>
      <body className="antialiased"><AppShell>{children}</AppShell></body>
    </html>
  )
}
