import type { Metadata } from 'next'
import { IBM_Plex_Mono, Archivo, Work_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-ui',
})

export const metadata: Metadata = {
  title: 'Heavy Sweater Resource',
  description: 'Band internal song tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexMono.variable} ${archivo.variable} ${workSans.variable}`}>
      <body className="antialiased"><AppShell>{children}</AppShell></body>
    </html>
  )
}
